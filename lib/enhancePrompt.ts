/**
 * Send recipe attributes to Haiku for creative prompt generation.
 * Falls back to buildRawPrompt if Haiku is unavailable.
 */

import { buildPromptInput, buildRawPrompt, buildHaikuPrompt } from '@/lib/recipeEngine';
import type { Recipe } from '@/types/recipe';

const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

export async function generateDreamPrompt(recipe: Recipe): Promise<string> {
  const input = buildPromptInput(recipe);
  const haikuBrief = buildHaikuPrompt(input);
  const fallback = buildRawPrompt(input);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages: [{ role: 'user', content: haikuBrief }],
      }),
    });
    if (!res.ok) throw new Error(`Haiku ${res.status}`);
    const data = await res.json();
    const prompt = data.content?.[0]?.text?.trim();
    if (prompt && prompt.length > 10) {
      console.log('[Haiku] Enhanced prompt:', prompt.slice(0, 100));
      return prompt;
    }
    throw new Error('Empty response');
  } catch (err) {
    console.warn('[Haiku] Falling back to raw prompt:', (err as Error).message);
    return fallback;
  }
}
