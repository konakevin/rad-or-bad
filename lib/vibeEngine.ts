/**
 * Vibe Engine — two-pass prompt generation for VibeProfile users.
 *
 * Pass 1 (Concept Generator): Haiku creates a structured concept recipe from the user's vibe profile.
 * Pass 2 (Prompt Polisher): Haiku converts the concept into an optimized Flux prompt.
 *
 * This replaces the old recipe engine's approach of dumping 15-20 ingredients into a brief.
 * Instead, we tell Haiku WHO the user is and let it make creative decisions.
 */

import type { VibeProfile, MoodAxes, ConceptRecipe, PromptMode } from '@/types/vibeProfile';
import { PROMPT_MODE_CONFIGS } from '@/constants/promptModes';

function describeMoods(moods: MoodAxes): string {
  const parts: string[] = [];

  if (moods.peaceful_chaotic < 0.3) parts.push('deeply peaceful');
  else if (moods.peaceful_chaotic > 0.7) parts.push('chaotic and intense');
  else parts.push('balanced energy');

  if (moods.cute_terrifying < 0.3) parts.push('cute and warm');
  else if (moods.cute_terrifying > 0.7) parts.push('dark and unsettling');
  else parts.push('tonally neutral');

  if (moods.minimal_maximal < 0.3) parts.push('clean and minimal');
  else if (moods.minimal_maximal > 0.7) parts.push('lush and maximalist');
  else parts.push('moderately detailed');

  if (moods.realistic_surreal < 0.3) parts.push('grounded in reality');
  else if (moods.realistic_surreal > 0.7) parts.push('deeply surreal');
  else parts.push('slightly stylized');

  return parts.join(', ');
}

/**
 * Build the Pass 1 prompt: Concept Generator.
 * Tells Haiku WHO the user is and asks for a structured concept recipe.
 */
export function buildConceptPrompt(
  profile: VibeProfile,
  mode: PromptMode = 'dream_me',
  seed: number = Math.random(),
): string {
  const config = PROMPT_MODE_CONFIGS[mode];

  // Spirit companion: ~20% chance to include as a hint
  const spiritHint = profile.spirit_companion && seed < 0.2
    ? `\nTheir spirit companion is a ${profile.spirit_companion.replace(/_/g, ' ')} — consider weaving it into the scene.`
    : '';

  // Personal anchors: include selectively to prevent overuse
  // dream_vibe always included (it's the creative north star)
  // place, object, era: each has 40% chance of appearing per dream
  const anchorLines: string[] = [];
  if (profile.personal_anchors.place && Math.random() < 0.4) anchorLines.push(`- Places they love: "${profile.personal_anchors.place}"`);
  if (profile.personal_anchors.object && Math.random() < 0.4) anchorLines.push(`- Objects they love: "${profile.personal_anchors.object}"`);
  if (profile.personal_anchors.era && Math.random() < 0.4) anchorLines.push(`- Eras they vibe with: "${profile.personal_anchors.era}"`);
  if (profile.personal_anchors.dream_vibe) anchorLines.push(`- Their dream vibe: "${profile.personal_anchors.dream_vibe}"`);
  const anchorsBlock = anchorLines.length > 0
    ? `\nPERSONAL ANCHORS (weave in naturally when they fit — don't force them):\n${anchorLines.join('\n')}`
    : '';

  const avoidBlock = profile.avoid.length > 0
    ? `\nNEVER INCLUDE: ${profile.avoid.join(', ')}`
    : '';

  return `You are a concept artist designing a single dream image for someone. Output a structured JSON concept recipe.

WHO THIS PERSON IS:
- Aesthetics they love: ${profile.aesthetics.join(', ')}
- Art styles they respond to: ${profile.art_styles.join(', ')}
- Subjects that excite them: ${profile.interests.join(', ')}
- Their mood spectrum: ${describeMoods(profile.moods)}
${anchorsBlock}${spiritHint}${avoidBlock}

CREATIVE DIRECTION:
${config.directive}

WEIGHTING: ${Math.round(config.userWeight * 100)}% of your choices should draw from their profile. ${Math.round(config.spiceWeight * 100)}% should be a creative surprise — something adjacent to their taste but unexpected. The surprise is what makes each dream feel fresh.

OUTPUT exactly this JSON (no markdown, no commentary):
{
  "subject": "the main subject — be specific and visual, not generic",
  "environment": "where the scene takes place — concrete sensory details",
  "lighting": "specific lighting that sets the mood",
  "camera": "camera angle, lens type, perspective",
  "style": "ONE art style from their preferences (or a creative mashup of two)",
  "palette": "2-3 specific colors that anchor the image",
  "twist": "one unexpected visual element that makes this image impossible to forget",
  "composition": "framing and layout",
  "mood": "2-3 word emotional tone"
}

MANDATORY RULES:
- The "twist" must be something surprising — it prevents repetition
- "subject" must NOT be "lone figure gazing at landscape" — be more creative
- Pick ONE art style, don't blend three
- Be concrete: name textures, materials, specific objects. Not adjectives.
- Must include an unusual light source OR a reflective surface OR a surreal object
- Stylized characters welcome, no photorealistic human faces, no nudity`;
}

/**
 * Build the Pass 2 prompt: Prompt Polisher.
 * Converts the concept recipe into an optimized Flux prompt.
 */
export function buildPolisherPrompt(concept: ConceptRecipe): string {
  return `Convert this concept into a Flux image generation prompt. 50-70 words, comma-separated phrases, no sentences.

${JSON.stringify(concept, null, 2)}

FORMAT:
- Start with the art style/medium
- Describe subject and scene concretely
- Include lighting, palette, mood
- Work the "twist" in naturally
- Include camera/composition as technical terms
- End with quality terms (hyper detailed, gorgeous lighting, etc.)
- No negative prompts, no meta-commentary, no quotation marks

Output ONLY the prompt text.`;
}

/**
 * Fallback concept when Haiku fails on Pass 1.
 * Mechanically constructs from profile arrays.
 */
export function buildFallbackConcept(profile: VibeProfile): ConceptRecipe {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const style = profile.art_styles.length > 0
    ? pick(profile.art_styles).replace(/_/g, ' ')
    : 'digital painting';

  const interest = profile.interests.length > 0
    ? pick(profile.interests).replace(/_/g, ' ')
    : 'mysterious landscape';

  const aesthetic = profile.aesthetics.length > 0
    ? pick(profile.aesthetics).replace(/_/g, ' ')
    : 'dreamy';

  const isSurreal = profile.moods.realistic_surreal > 0.5;
  const isDark = profile.moods.cute_terrifying > 0.5;

  return {
    subject: `a scene about ${interest}`,
    environment: profile.personal_anchors.place || `an atmospheric ${aesthetic} setting`,
    lighting: isDark ? 'moody low-key light with deep shadows' : 'soft golden hour light',
    camera: '35mm wide angle, eye level',
    style,
    palette: 'vivid and expressive',
    twist: isSurreal ? 'objects floating weightlessly' : 'unexpected reflections in water',
    composition: 'center subject, depth of field',
    mood: isDark ? 'haunting and atmospheric' : 'warm and dreamlike',
  };
}

/**
 * Fallback Flux prompt when Haiku fails on Pass 2.
 * Concatenates concept fields directly.
 */
export function buildFallbackFluxPrompt(concept: ConceptRecipe): string {
  return [
    concept.style,
    concept.subject,
    concept.environment,
    concept.lighting,
    concept.palette + ' color palette',
    concept.twist,
    concept.camera,
    concept.composition,
    concept.mood + ' atmosphere',
    'hyper detailed, gorgeous lighting',
  ].filter(Boolean).join(', ');
}

/**
 * Try to parse JSON from Haiku output, handling common issues
 * (markdown fences, trailing text, etc.)
 */
export function parseConceptJson(raw: string): ConceptRecipe {
  // Strip markdown fences
  let cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '');

  // Find first { and last }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found');

  cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned) as ConceptRecipe;
}
