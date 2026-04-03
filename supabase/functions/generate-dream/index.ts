/**
 * Edge Function: generate-dream
 *
 * Server-side dream generation. Receives a recipe (or raw prompt),
 * builds the prompt via the recipe engine, optionally enhances via Haiku,
 * generates an image via Replicate Flux, persists to Storage, and returns
 * the permanent URL.
 *
 * POST /functions/v1/generate-dream
 * Authorization: Bearer <user JWT>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildPromptInput, buildRawPrompt, buildHaikuPrompt } from '../_shared/recipeEngine.ts';
import type { Recipe } from '../_shared/recipe.ts';

const MAX_DAILY_GENERATIONS = 50;

interface RequestBody {
  /** Which Flux model to use */
  mode: 'flux-dev' | 'flux-kontext';
  /** User's taste recipe — server builds the prompt from this */
  recipe?: Recipe;
  /** Pre-built prompt — used for twins (re-rolling existing prompt) */
  prompt?: string;
  /** Optional user hint to weave into the dream */
  hint?: string;
  /** Base64 data URL for flux-kontext (photo-to-image) */
  input_image?: string;
  /** Custom Haiku brief — used for photo reimagining (upload.tsx dream()) */
  haiku_brief?: string;
  /** Fallback prompt if Haiku fails — paired with haiku_brief */
  haiku_fallback?: string;
  /** Epigenetic context for fusion dreams */
  epigenetic_context?: string;
  /** Whether to persist the image to Storage (default: true) */
  persist?: boolean;
  /** Skip Haiku enhancement — use raw prompt from recipe engine (faster) */
  skip_enhance?: boolean;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');
  const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');

  if (!REPLICATE_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured: missing REPLICATE_API_TOKEN' }),
      { status: 500 }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Create a user-scoped client from the request's Authorization header.
  // The Supabase gateway already validates the JWT before invoking the function,
  // so we can trust the token and use it to identify the user.
  const authHeader = req.headers.get('authorization') ?? '';
  const supabaseUser = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY') ?? serviceRoleKey,
    {
      global: { headers: { Authorization: authHeader } },
    }
  );
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    console.error(
      '[generate-dream] Auth failed:',
      authError?.message,
      'header:',
      authHeader.slice(0, 30)
    );
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }
  const userId = user.id;

  // Service role client for database operations (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Parse request body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const {
    mode,
    recipe,
    prompt: rawPrompt,
    hint,
    input_image,
    haiku_brief,
    haiku_fallback,
    epigenetic_context,
    persist = false,
    skip_enhance = false,
  } = body;

  if (!mode || !['flux-dev', 'flux-kontext'].includes(mode)) {
    return new Response(
      JSON.stringify({ error: 'Invalid mode. Must be "flux-dev" or "flux-kontext"' }),
      { status: 400 }
    );
  }

  if (mode === 'flux-kontext' && !input_image) {
    return new Response(JSON.stringify({ error: 'flux-kontext mode requires input_image' }), {
      status: 400,
    });
  }

  if (!recipe && !rawPrompt && !haiku_brief) {
    return new Response(JSON.stringify({ error: 'Must provide recipe, prompt, or haiku_brief' }), {
      status: 400,
    });
  }

  // ── Timing ─────────────────────────────────────────────────────────────────
  const t0 = Date.now();
  const lap = (label: string) => {
    const elapsed = Date.now() - t0;
    console.log(`[generate-dream] ⏱ ${label}: ${elapsed}ms`);
  };

  // ── Rate limit check ──────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const { data: budgetRow } = await supabase
    .from('ai_generation_budget')
    .select('images_generated')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
  lap('rate-limit-check');

  const todayCount = budgetRow?.images_generated ?? 0;
  // Rate limit disabled for now
  // if (todayCount >= MAX_DAILY_GENERATIONS) {
  //   return new Response(
  //     JSON.stringify({
  //       error: 'Daily generation limit reached. Try again tomorrow!',
  //       retry_after: secondsUntilMidnightUTC(),
  //     }),
  //     { status: 429 }
  //   );
  // }

  // ── Build prompt ──────────────────────────────────────────────────────────
  let finalPrompt: string;

  let logAxes: Record<string, unknown> = {};

  if (rawPrompt) {
    finalPrompt = rawPrompt;
    lap('prompt-raw');
  } else if (haiku_brief) {
    finalPrompt = await enhanceViaHaiku(haiku_brief, haiku_fallback ?? haiku_brief, ANTHROPIC_KEY);
    lap('prompt-haiku-brief');
  } else if (recipe) {
    // THREE-PART SONG: roll which dream type this is
    // 50% archetype (focused narrative), 30% chord (pure blend), 20% beauty (pure visual)
    const dreamRoll = Math.random();
    const dreamMode = dreamRoll < 0.5 ? 'archetype' : dreamRoll < 0.8 ? 'chord' : 'beauty';

    let archetype: { key: string; name: string; prompt_context: string; flavor_keywords: string[]; trigger_interests?: string[]; trigger_moods?: string[] } | undefined;
    if (dreamMode === 'archetype') {
      try {
        const { data: userArchs } = await supabase
          .from('user_archetypes')
          .select('archetype_id')
          .eq('user_id', userId);
        if (userArchs && userArchs.length > 0) {
          const randomArch = userArchs[Math.floor(Math.random() * userArchs.length)];
          const { data: arch } = await supabase
            .from('dream_archetypes')
            .select('key, name, prompt_context, flavor_keywords, trigger_interests, trigger_moods')
            .eq('id', randomArch.archetype_id)
            .single();
          if (arch) archetype = arch;
        }
      } catch { /* non-critical — falls back to chord path */ }
    }

    // Build ingredients — archetype focuses the interest + mood, Chord does the rest
    const input = buildPromptInput(recipe, archetype);
    logAxes = {
      medium: input.medium,
      mood: input.mood,
      lighting: input.lighting,
      interests: input.interests,
      dreamSubject: input.dreamSubject,
      sceneType: input.sceneType,
      action: input.action,
      settingKeywords: input.settingKeywords,
      eraKeywords: input.eraKeywords,
      sceneAtmosphere: input.sceneAtmosphere,
      colorKeywords: input.colorKeywords,
      weirdnessModifier: input.weirdnessModifier,
      scaleModifier: input.scaleModifier,
      personalityTags: input.personalityTags,
      spiritAppears: input.spiritAppears,
      spiritCompanion: input.spiritCompanion,
      archetype: archetype?.key ?? 'none',
      dreamMode,
    };
    const fallback = buildRawPrompt(input);

    if (skip_enhance) {
      finalPrompt = fallback;
      lap('prompt-raw-skip');
    } else {
      let haikuBrief: string;

      if (dreamMode === 'beauty') {
        // BEAUTY MODE: pure visual focus, no narrative, just breathtaking imagery
        haikuBrief = `Dream up something breathtaking using these ingredients.

Style: ${input.medium}
Mood: ${input.mood}
Light: ${input.lighting}
Place: ${input.settingKeywords}
${input.colorKeywords ? `Colors: ${input.colorKeywords}` : ''}
${input.sceneAtmosphere ? `Weather: ${input.sceneAtmosphere}` : ''}

Write a vivid image prompt (max 50 words). Start with the art style. Make it beautiful. No text in the image. Output ONLY the prompt.`;
      } else {
        // CHORD or ARCHETYPE mode — use the standard Chord template
        haikuBrief = buildHaikuPrompt(input);

        // If archetype is active, inject its creative brief so Haiku knows the identity
        if (archetype) {
          haikuBrief += `\n\nInspiration: ${archetype.name}\n${archetype.prompt_context}`;
        }
      }

      logAxes.promptPath = dreamMode + (archetype ? '+' + archetype.key : '');

      if (hint) {
        haikuBrief += `\n\nIMPORTANT: The user requested "${hint}". Make this the heart of the dream — use their taste profile to style it, but this wish is the subject.`;
      }

      if (epigenetic_context) {
        haikuBrief += `\n\n${epigenetic_context}`;
      }

      // Store what we sent to Haiku so we can compare input vs output
      logAxes.haikuBrief = haikuBrief.slice(0, 2000);

      finalPrompt = await enhanceViaHaiku(haikuBrief, fallback, ANTHROPIC_KEY);
      logAxes.usedFallback = finalPrompt === fallback;
      lap('prompt-haiku-recipe');
    }
  } else {
    return new Response(JSON.stringify({ error: 'No prompt source provided' }), { status: 400 });
  }

  const { model: pickedModel } = pickModel(mode, finalPrompt);
  logAxes.model = pickedModel;
  console.log(
    `[generate-dream] User ${userId}, mode=${mode}, model=${pickedModel}, prompt=${finalPrompt.slice(0, 80)}...`
  );

  // ── Generate image via Replicate ──────────────────────────────────────────
  try {
    const tempUrl = await generateImage(mode, finalPrompt, input_image, REPLICATE_TOKEN);
    lap('replicate-done');

    let imageUrl = tempUrl;

    // Always log the prompt for debugging/analysis
    try {
      await supabase.from('ai_generation_log').insert({
        user_id: userId,
        recipe_snapshot: recipe ?? {},
        rolled_axes: logAxes,
        enhanced_prompt: finalPrompt,
        model_used: mode === 'flux-kontext' ? 'flux-kontext-pro' : 'flux-dev',
        cost_cents: 3,
        status: 'completed',
      });
    } catch {
      /* non-critical */
    }

    // Only persist to Storage and budget when explicitly requested (i.e., user taps Post)
    if (persist) {
      imageUrl = await persistToStorage(tempUrl, userId, supabase);
      lap('persist-done');

      try {
        await supabase.from('ai_generation_budget').upsert(
          {
            user_id: userId,
            date: today,
            images_generated: todayCount + 1,
            total_cost_cents: (todayCount + 1) * 3,
          },
          { onConflict: 'user_id,date' }
        );
      } catch {
        /* non-critical */
      }
    }

    lap('total');
    console.log(`[generate-dream] ✅ Done in ${Date.now() - t0}ms for user ${userId}`);

    return new Response(
      JSON.stringify({
        image_url: imageUrl,
        prompt_used: finalPrompt,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error(`[generate-dream] Error for user ${userId}:`, (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function enhanceViaHaiku(
  brief: string,
  fallback: string,
  anthropicKey: string | undefined
): Promise<string> {
  if (!anthropicKey) return fallback;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: brief }],
      }),
    });
    if (!res.ok) throw new Error(`Haiku ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() ?? '';
    return text.length >= 10 ? text : fallback;
  } catch (err) {
    console.warn('[generate-dream] Haiku fallback:', (err as Error).message);
    return fallback;
  }
}

// Route to the best model based on the medium/prompt content
function pickModel(mode: string, prompt: string): { model: string; inputOverrides: Record<string, unknown> } {
  if (mode === 'flux-kontext') {
    return { model: 'black-forest-labs/flux-kontext-pro', inputOverrides: {} };
  }

  const p = prompt.toLowerCase();

  // SDXL only for styles where it's clearly better than Flux:
  // Traditional painting, hand-drawn illustration, anime, comic book art
  if (p.includes('watercolor') || p.includes('oil painting') || p.includes('gouache') ||
      p.includes('ink linework') || p.includes('pencil sketch') || p.includes('charcoal') ||
      p.includes('impasto') || p.includes('brushstroke') ||
      // Specific artists known for painterly styles
      p.includes('van gogh') || p.includes('monet') || p.includes('seurat') ||
      p.includes('pointillis') || p.includes('impressionis') ||
      p.includes('frida kahlo') || p.includes('klimt') || p.includes('gold leaf') ||
      p.includes('hokusai') || p.includes('bob ross') || p.includes('mucha') ||
      // Hand-drawn / cartoon / anime
      p.includes('anime') || p.includes('manga') || p.includes('cel animation') ||
      p.includes('comic book') || p.includes('halftone') || p.includes('ben-day') ||
      p.includes('spider-verse') ||
      // Traditional print / craft
      p.includes('woodblock') || p.includes('ukiyo-e') || p.includes('woodcut') ||
      p.includes('cross-stitch') || p.includes('embroidery') || p.includes('tarot') ||
      p.includes('stained glass')) {
    return {
      model: 'sdxl',
      inputOverrides: { width: 768, height: 1344, num_inference_steps: 30, guidance_scale: 7.5 },
    };
  }

  // Default: Flux Dev
  return { model: 'black-forest-labs/flux-dev', inputOverrides: {} };
}

async function generateImage(
  mode: string,
  prompt: string,
  inputImage: string | undefined,
  replicateToken: string
): Promise<string> {
  const { model, inputOverrides } = pickModel(mode, prompt);
  const isSDXL = model === 'sdxl';
  const SDXL_VERSION = '7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc';

  const input: Record<string, unknown> = {
    prompt,
    ...(!isSDXL ? {
      aspect_ratio: '9:16',
      num_outputs: 1,
      output_format: 'jpg',
    } : {
      width: 768,
      height: 1344,
      num_outputs: 1,
    }),
    ...inputOverrides,
  };

  if (mode === 'flux-kontext' && inputImage) {
    input.input_image = inputImage;
    input.output_quality = 90;
  }

  // SDXL uses version-based API, Flux uses model-based API
  const url = isSDXL
    ? 'https://api.replicate.com/v1/predictions'
    : `https://api.replicate.com/v1/models/${model}/predictions`;
  const body = isSDXL
    ? { version: SDXL_VERSION, input }
    : { input };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${replicateToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const body = await res.json();
    const retryAfter = body.retry_after ?? 6;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return generateImage(mode, prompt, inputImage, replicateToken);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate submit failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.id) throw new Error('No prediction ID');

  // Poll for result
  const maxPolls = mode === 'flux-kontext' ? 30 : 60;
  const intervalMs = mode === 'flux-kontext' ? 2000 : 1500;

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${data.id}`, {
      headers: { Authorization: `Bearer ${replicateToken}` },
    });
    const pollData = await pollRes.json();
    if (pollData.status === 'succeeded') {
      const url = typeof pollData.output === 'string' ? pollData.output : pollData.output?.[0];
      if (url) return url;
    }
    if (pollData.status === 'failed' || pollData.status === 'canceled') {
      throw new Error(`Generation ${pollData.status}: ${pollData.error ?? 'unknown'}`);
    }
  }
  throw new Error('Generation timed out');
}

async function persistToStorage(
  tempUrl: string,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
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

function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}
