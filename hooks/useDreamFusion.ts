import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { buildPromptInput, buildRawPrompt } from '@/lib/recipeEngine';
import { DEFAULT_RECIPE } from '@/types/recipe';

const REPLICATE_TOKEN = '***REMOVED***';
const ANTHROPIC_KEY = '***REMOVED***';

async function generateImage(prompt: string): Promise<string> {
  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { prompt, aspect_ratio: '9:16', num_outputs: 1, output_format: 'jpg' },
    }),
  });

  if (res.status === 429) {
    const body = await res.json();
    const retryAfter = body.retry_after ?? 6;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return generateImage(prompt);
  }

  if (!res.ok) throw new Error(`Replicate ${res.status}`);
  const pred = await res.json();
  if (!pred.id) throw new Error('No prediction ID');

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
    });
    const data = await poll.json();
    if (data.status === 'succeeded') {
      const url = data.output?.[0];
      if (!url) throw new Error('No URL');
      return url;
    }
    if (data.status === 'failed') throw new Error('Generation failed');
  }
  throw new Error('Timed out');
}

async function buildFusionPrompt(theirPrompt: string, myRecipe: Record<string, unknown>): Promise<string> {
  // Use Haiku to creatively merge the two dream DNAs
  const myInput = buildPromptInput(myRecipe as typeof DEFAULT_RECIPE);
  const myPrompt = buildRawPrompt(myInput);

  const request = `You are a dream fusion artist. Two dreams are being combined into one new dream child.

DREAM A (the dream they liked):
"${theirPrompt}"

DREAM B (their own Dream Bot's style):
"${myPrompt}"

Create a FUSION dream that:
- Takes the SUBJECT and ACTION from Dream A (what's happening)
- Uses the ART STYLE from whichever parent is more interesting (coin flip)
- Blends the MOOD and LIGHTING from both
- Uses Dream B's COLOR PALETTE
- Makes it surprising and delightful — not just an average, but a creative mashup

Output ONLY the image generation prompt. Max 80 words. Start with the art medium.`;

  try {
    const haikuRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: request }],
      }),
    });
    if (!haikuRes.ok) throw new Error('Haiku error');
    const haikuData = await haikuRes.json();
    return haikuData.content?.[0]?.text?.trim() ?? myPrompt;
  } catch {
    // Fallback: just use their prompt with our color palette
    return theirPrompt;
  }
}

async function buildStylePrompt(theirPrompt: string, myRecipe: Record<string, unknown>): Promise<string> {
  const myInput = buildPromptInput(myRecipe as typeof DEFAULT_RECIPE);

  const request = `You are a dream style transfer artist. A user wants their Dream Bot to dream in the style of another dream they liked.

STYLE REFERENCE (the dream they liked):
"${theirPrompt}"

USER'S OWN DREAM BOT ATTRIBUTES:
- Interests: ${myInput.interests.join(', ')}
- Personality: ${myInput.personalityTags.join(', ')}
- Colors: ${myInput.colorKeywords || 'vivid'}
- Spirit companion: ${myInput.spiritCompanion ?? 'none'}

Create a NEW dream that uses the ART STYLE, MEDIUM, MOOD, and LIGHTING from the style reference, but with the user's own INTERESTS, PERSONALITY, and COLORS as the subject matter.

Output ONLY the image generation prompt. Max 80 words. Start with the art medium.`;

  try {
    const haikuRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: request }],
      }),
    });
    if (!haikuRes.ok) throw new Error('Haiku error');
    const haikuData = await haikuRes.json();
    return haikuData.content?.[0]?.text?.trim() ?? theirPrompt;
  } catch {
    return theirPrompt;
  }
}

interface FusionParams {
  mode: 'fuse' | 'style';
  sourcePostId: string;
  sourcePrompt: string;
}

export function useDreamFusion() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mode, sourcePostId, sourcePrompt }: FusionParams) => {
      if (!user) throw new Error('Not logged in');

      // Load user's recipe
      const { data: recipeRow } = await supabase
        .from('user_recipes')
        .select('recipe')
        .eq('user_id', user.id)
        .single();
      const recipe = recipeRow?.recipe ?? DEFAULT_RECIPE;

      // Build the fusion/style prompt via Haiku
      console.log('[Fusion] Building prompt...');
      const prompt = mode === 'fuse'
        ? await buildFusionPrompt(sourcePrompt, recipe)
        : await buildStylePrompt(sourcePrompt, recipe);
      console.log('[Fusion] Prompt:', prompt.slice(0, 120));

      // Generate image
      console.log('[Fusion] Generating...');
      const imageUrl = await generateImage(prompt);

      // Post it
      const { data: upload } = await supabase.from('uploads').insert({
        user_id: user.id,
        categories: ['art'],
        image_url: imageUrl,
        media_type: 'image',
        caption: null,
        is_ai_generated: true,
        ai_prompt: prompt,
        is_approved: true,
        is_active: true,
      }).select('id').single();

      return {
        uploadId: upload?.id,
        imageUrl,
        prompt,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['dreamFeed'] });
    },
  });
}
