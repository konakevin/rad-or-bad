/**
 * Dream API — thin client that delegates all AI generation to the
 * generate-dream Edge Function. No API keys on the client.
 */

import { supabase } from '@/lib/supabase';
import type { Recipe } from '@/types/recipe';

interface GenerateDreamOpts {
  /** Which Flux model to use */
  mode: 'flux-dev' | 'flux-kontext';
  /** User's taste recipe — server builds prompt from this */
  recipe?: Recipe;
  /** Pre-built prompt (for twin re-rolls) */
  prompt?: string;
  /** Optional user hint to weave into the dream */
  hint?: string;
  /** Base64 data URL for flux-kontext (photo-to-image) */
  input_image?: string;
  /** Custom Haiku brief (for photo reimagining) */
  haiku_brief?: string;
  /** Fallback prompt if Haiku fails */
  haiku_fallback?: string;
  /** Epigenetic context for fusion */
  epigenetic_context?: string;
  /** Whether to persist to Storage (default: false — persist on post, not generate) */
  persist?: boolean;
  /** Skip Haiku enhancement — use raw prompt (faster) */
  skip_enhance?: boolean;
}

interface GenerateDreamResult {
  image_url: string;
  prompt_used: string;
}

/**
 * Generate a dream image via the server-side Edge Function.
 * Handles prompt building, Haiku enhancement, Replicate generation,
 * and Storage persistence — all server-side.
 */
export async function generateDream(opts: GenerateDreamOpts): Promise<GenerateDreamResult> {
  const t0 = Date.now();
  if (__DEV__) {
    console.log(
      `[dreamApi] Invoking generate-dream (mode=${opts.mode}, persist=${opts.persist ?? false}, skip_enhance=${opts.skip_enhance ?? false})...`
    );
  }
  const { data, error } = await supabase.functions.invoke('generate-dream', {
    body: opts,
  });

  if (error) {
    if (__DEV__) console.error('[dreamApi] Edge Function error:', JSON.stringify(error));
    // Try to extract the error message from various formats
    let msg: string;
    if (typeof error === 'object' && error !== null) {
      // FunctionsHttpError has a context property with the response
      const ctx = (error as Record<string, unknown>).context;
      if (ctx && typeof ctx === 'object' && 'json' in (ctx as Record<string, unknown>)) {
        try {
          const body = await (ctx as Response).json();
          msg = body?.error ?? body?.message ?? String(error);
        } catch {
          msg = (error as { message?: string }).message ?? String(error);
        }
      } else {
        msg = (error as { message?: string }).message ?? String(error);
      }
    } else {
      msg = String(error);
    }
    throw new Error(msg);
  }

  if (__DEV__) {
    console.log(`[dreamApi] Response in ${Date.now() - t0}ms:`, JSON.stringify(data).slice(0, 200));
  }

  if (!data || !data.image_url) {
    throw new Error(data?.error ?? 'No image returned from server');
  }

  return {
    image_url: data.image_url,
    prompt_used: data.prompt_used,
  };
}

/**
 * Convenience: generate a text-to-image dream from a recipe.
 * Used by justDream() and the onboarding RevealStep.
 */
export async function generateFromRecipe(
  recipe: Recipe,
  opts?: { hint?: string; skipEnhance?: boolean }
): Promise<GenerateDreamResult> {
  return generateDream({
    mode: 'flux-dev',
    recipe,
    hint: opts?.hint,
    skip_enhance: opts?.skipEnhance,
  });
}

/**
 * Convenience: generate a photo-to-image dream (Flux Kontext).
 * Used by the Dream screen when user picks a photo.
 */
export async function generateFromPhoto(
  recipe: Recipe,
  inputImageBase64: string,
  opts?: { hint?: string; haiku_brief?: string; haiku_fallback?: string }
): Promise<GenerateDreamResult> {
  return generateDream({
    mode: 'flux-kontext',
    recipe,
    input_image: inputImageBase64,
    hint: opts?.hint,
    haiku_brief: opts?.haiku_brief,
    haiku_fallback: opts?.haiku_fallback,
  });
}

/**
 * Persist a temp Replicate URL to Supabase Storage.
 * Called when user taps "Post This Dream" — keeps generation fast, bookkeeping on post.
 */
export async function persistImage(tempUrl: string, userId: string): Promise<string> {
  const resp = await fetch(tempUrl);
  if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`);
  const buf = await resp.arrayBuffer();

  const fileName = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('uploads')
    .upload(fileName, buf, { contentType: 'image/jpeg' });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * Convenience: re-roll a twin dream from an existing prompt.
 */
/**
 * Convenience: re-roll a twin dream from an existing prompt.
 * Twins cost sparkles — persist immediately.
 */
export async function generateTwin(prompt: string): Promise<GenerateDreamResult> {
  return generateDream({ mode: 'flux-dev', prompt, persist: true });
}

/**
 * Convenience: generate a fusion dream from a merged recipe.
 */
/**
 * Convenience: generate a fusion dream from a merged recipe.
 * Fusions cost sparkles — persist immediately.
 */
export async function generateFusion(
  mergedRecipe: Recipe,
  epigeneticContext: string
): Promise<GenerateDreamResult> {
  return generateDream({
    mode: 'flux-dev',
    recipe: mergedRecipe,
    epigenetic_context: epigeneticContext,
    persist: true,
  });
}
