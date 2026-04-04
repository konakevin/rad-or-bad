/**
 * Edge Function: extract-style
 *
 * Takes an AI dream prompt and asks Haiku to extract just the visual style —
 * medium, palette, lighting, texture. Used by Dream Like This to accurately
 * apply a reference style to a user's photo.
 *
 * POST /functions/v1/extract-style
 * Body: { prompt: string }
 * Returns: { style: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // ── Auth: verify JWT ──────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500 });
  }

  let body: { prompt: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  if (!body.prompt) {
    return new Response(JSON.stringify({ error: 'prompt is required' }), { status: 400 });
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Extract ONLY the visual art style from this AI image prompt. Include: the rendering medium/technique, color palette description, lighting quality, and texture. Do NOT include any subject matter, characters, objects, scenes, or environments — ONLY how the image looks and feels visually.

Return a single comma-separated phrase, 15-30 words max. Examples:
- "watercolor on textured paper, soft muted pastels, diffused warm lighting, visible brushstrokes"
- "pixel art, NES color palette, chunky pixels, retro CRT glow"
- "oil painting, thick impasto brushstrokes, dramatic chiaroscuro lighting, rich warm tones"

Prompt: "${body.prompt.slice(0, 400)}"`,
          },
        ],
      }),
    });

    const data = await resp.json();
    const style = data?.content?.[0]?.text?.trim() ?? '';
    console.log('[extract-style] Input:', body.prompt.slice(0, 80));
    console.log('[extract-style] Extracted:', style);

    return new Response(JSON.stringify({ style }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[extract-style] Error:', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
