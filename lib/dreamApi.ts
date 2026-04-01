/**
 * Dream API — shared Replicate + Haiku calls for all dream generation flows.
 * Single source of truth for API keys, polling, and image persistence.
 */

import { supabase } from '@/lib/supabase';

// TODO: move to edge function for production
export const REPLICATE_TOKEN = '***REMOVED***';
export const ANTHROPIC_KEY = '***REMOVED***';

const HAIKU_HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': ANTHROPIC_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
};

/**
 * Enhance a prompt brief via Claude Haiku. Returns the enhanced prompt,
 * or the fallback if Haiku fails.
 */
export async function enhanceWithHaiku(brief: string, fallback: string, maxTokens = 150): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: HAIKU_HEADERS,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: brief }],
      }),
    });
    if (!res.ok) throw new Error('Haiku error');
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() ?? '';
    return text.length >= 10 ? text : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Poll a Replicate prediction until it succeeds, fails, or times out.
 */
async function pollPrediction(predictionId: string, maxPolls = 60, intervalMs = 1500): Promise<string> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
    });
    const data = await res.json();
    if (data.status === 'succeeded') {
      const url = typeof data.output === 'string' ? data.output : data.output?.[0];
      if (url) return url;
    }
    if (data.status === 'failed') throw new Error('Generation failed');
  }
  throw new Error('Generation timed out');
}

/**
 * Generate an image via Flux Dev (text-to-image, no photo input).
 * Returns the temporary Replicate URL.
 */
export async function generateFluxDev(prompt: string): Promise<string> {
  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { prompt, aspect_ratio: '9:16', num_outputs: 1, output_format: 'jpg' },
    }),
  });

  if (res.status === 429) {
    const body = await res.json();
    await new Promise((r) => setTimeout(r, (body.retry_after ?? 6) * 1000));
    return generateFluxDev(prompt); // retry
  }

  if (!res.ok) throw new Error('Generation failed to start');
  const data = await res.json();
  if (!data.id) throw new Error('No prediction ID');

  return pollPrediction(data.id);
}

/**
 * Generate an image via Flux Kontext Pro (photo-to-image).
 * inputImage should be a data URL (base64).
 * Returns the temporary Replicate URL.
 */
export async function generateFluxKontext(prompt: string, inputImage: string): Promise<string> {
  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: {
        prompt,
        input_image: inputImage,
        aspect_ratio: '9:16',
        output_format: 'jpg',
        output_quality: 90,
      },
    }),
  });

  if (!res.ok) throw new Error('Generation failed to start');
  const data = await res.json();
  if (!data.id) throw new Error('No prediction ID');

  return pollPrediction(data.id, 30, 2000); // shorter timeout for Kontext
}

/**
 * Download an image from a temporary URL and upload to Supabase Storage.
 * Returns the permanent public URL.
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
