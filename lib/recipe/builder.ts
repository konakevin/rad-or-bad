/**
 * Recipe Engine — core build logic.
 *
 * Every attribute the user picks MUST change the output. If it doesn't reach
 * the prompt, it shouldn't be in the onboarding.
 *
 * Prompt layers:
 *   1. TECHNIQUE  — medium, palette, weirdness, scale (controls HOW it looks)
 *   2. SUBJECT    — interests, spirit companion (controls WHAT it shows)
 *   3. WORLD      — era, setting (controls WHERE/WHEN)
 *   4. ATMOSPHERE  — mood, personality tags, scene atmosphere (controls HOW IT FEELS)
 */

import type { Recipe } from '@/types/recipe';
import { DEFAULT_RECIPE } from '@/types/recipe';

import type { PromptInput } from './types';
import { pick, pickWithChaos, rollAxis, getModifierByValue, filterPool } from './utils';
import {
  MEDIUM_POOL,
  MOOD_POOL,
  LIGHTING_POOL,
  ERA_KEYWORDS,
  BONUS_ERAS,
  SETTING_KEYWORDS,
  BONUS_SETTINGS,
  SCENE_ATMOSPHERE_KEYWORDS,
  PALETTE_KEYWORDS,
  WEIRDNESS_MODIFIERS,
  SCALE_MODIFIERS,
  ACTIONS,
  SCENE_TYPES,
  INTEREST_FLAVORS,
  ALWAYS_EXPAND,
  DREAM_SUBJECTS,
  COMPOSITIONS,
  HIGH_COMPLEXITY_SIGNALS,
  LOW_COMPLEXITY_SIGNALS,
} from './pools';

export function expandInterest(interest: string): string {
  const flavors = INTEREST_FLAVORS[interest];
  if (!flavors) return interest;
  // Always expand vague interests; 40% chance for concrete ones
  if (ALWAYS_EXPAND.has(interest) || Math.random() < 0.4) {
    return pick(flavors);
  }
  return interest;
}

function deriveComplexity(recipe: Recipe): number {
  const allChoices = [
    ...(recipe.interests ?? []),
    ...(recipe.personality_tags ?? []),
    ...(recipe.eras ?? []),
  ];
  let highCount = 0;
  let lowCount = 0;
  for (const choice of allChoices) {
    if (HIGH_COMPLEXITY_SIGNALS.has(choice)) highCount++;
    if (LOW_COMPLEXITY_SIGNALS.has(choice)) lowCount++;
  }
  // Base 0.5, nudged by signal balance. Range ~0.2-0.8.
  const delta = (highCount - lowCount) * 0.08;
  return Math.max(0.2, Math.min(0.8, 0.5 + delta));
}

// Mood axis profiles — must match constants/onboarding.ts MOOD_TILES
const MOOD_AXIS_PROFILES: Record<string, { energy: number; brightness: number; warmth: number }> = {
  cozy: { energy: 0.2, brightness: 0.6, warmth: 0.8 },
  epic: { energy: 0.9, brightness: 0.6, warmth: 0.5 },
  dreamy: { energy: 0.2, brightness: 0.8, warmth: 0.6 },
  moody: { energy: 0.3, brightness: 0.2, warmth: 0.3 },
  playful: { energy: 0.6, brightness: 0.8, warmth: 0.7 },
  serene: { energy: 0.1, brightness: 0.7, warmth: 0.4 },
  intense: { energy: 0.9, brightness: 0.3, warmth: 0.3 },
  nostalgic: { energy: 0.3, brightness: 0.5, warmth: 0.7 },
  mysterious: { energy: 0.5, brightness: 0.2, warmth: 0.2 },
  whimsical: { energy: 0.5, brightness: 0.7, warmth: 0.6 },
  dramatic: { energy: 0.8, brightness: 0.3, warmth: 0.4 },
  peaceful: { energy: 0.1, brightness: 0.6, warmth: 0.5 },
  romantic: { energy: 0.3, brightness: 0.7, warmth: 0.8 },
  spooky: { energy: 0.5, brightness: 0.2, warmth: 0.2 },
  euphoric: { energy: 0.9, brightness: 0.9, warmth: 0.6 },
};

export function buildPromptInput(recipe: Recipe, archetype?: DreamArchetype): PromptInput {
  // Defensive defaults for recipes saved before new fields were added
  let interests = recipe.interests ?? [];
  const colorPalettes = recipe.color_palettes ?? [];
  const personalityTags = recipe.personality_tags ?? [];
  const eras = recipe.eras ?? [];
  const settings = recipe.settings ?? [];
  const sceneAtmospheres = recipe.scene_atmospheres ?? [];
  const spiritCompanion = recipe.spirit_companion ?? null;
  const axes = { ...DEFAULT_RECIPE.axes, ...recipe.axes };
  // Derive complexity from user's choices instead of dead 0.5
  axes.complexity = deriveComplexity(recipe);
  const chaos = axes.chaos;

  // ARCHETYPE MODE: If an archetype is provided, lock the lead interest
  // to the archetype's trigger interest. This focuses the dream on one
  // identity while letting all the Chord machinery do the creative work.
  if (archetype) {
    // Find which of the user's interests matches the archetype trigger
    const archetypeInterest = interests.find(i =>
      archetype.flavor_keywords.length > 0 ? true : true // always use first trigger
    );
    // Lock interests to just the archetype's trigger interest(s)
    // but only if the user actually has that interest
    const matchingInterests = interests.filter(i =>
      (archetype as unknown as { trigger_interests?: string[] }).trigger_interests?.includes(i)
    );
    if (matchingInterests.length > 0) {
      interests = matchingInterests;
    }
  }

  // If the user selected moods during onboarding, randomly sample ONE mood's
  // axes for this dream instead of using the baked-in average.
  const selectedMoods = recipe.selected_moods ?? [];

  // ARCHETYPE MODE: If archetype has a trigger mood, use that instead of random
  if (archetype) {
    const archMoods = (archetype as unknown as { trigger_moods?: string[] }).trigger_moods ?? [];
    const matchingMood = archMoods.find(m => selectedMoods.includes(m)) ?? archMoods[0];
    if (matchingMood) {
      const profile = MOOD_AXIS_PROFILES[matchingMood];
      if (profile) {
        axes.energy = profile.energy;
        axes.brightness = profile.brightness;
        axes.color_warmth = profile.warmth;
      }
    }
  } else if (selectedMoods.length > 0) {
    const moodKey = pick(selectedMoods);
    const profile = MOOD_AXIS_PROFILES[moodKey];
    if (profile) {
      axes.energy = profile.energy;
      axes.brightness = profile.brightness;
      axes.color_warmth = profile.warmth;
    }
  }

  // Roll dice on each axis
  const rolled = {
    realism: rollAxis(axes.realism),
    complexity: rollAxis(axes.complexity),
    energy: rollAxis(axes.energy),
    color_warmth: rollAxis(axes.color_warmth),
    brightness: rollAxis(axes.brightness),
  };

  // TECHNIQUE layer
  const medium = filterPool(MEDIUM_POOL, rolled, chaos);
  const paletteKey = colorPalettes.length > 0 ? pick(colorPalettes) : 'everything';
  const colorKeywordsStr = PALETTE_KEYWORDS[paletteKey] || '';
  const weirdnessModifier = getModifierByValue(WEIRDNESS_MODIFIERS, axes.weirdness);
  const scaleModifier = getModifierByValue(SCALE_MODIFIERS, axes.scale);

  // SUBJECT layer
  // Usually 1 interest for focused dreams, sometimes 2 for chaos/variety
  const sampleCount = Math.random() < 0.3 + chaos * 0.3 ? 2 : 1;
  const shuffledInterests = [...interests].sort(() => Math.random() - 0.5);
  const sampledInterests = shuffledInterests.slice(0, Math.min(sampleCount, interests.length));
  // Only include character actions when energy is high — low energy = scenic/atmospheric
  const includeAction = Math.random() < axes.energy;
  const action = includeAction ? pick(ACTIONS) : '';
  const sceneType = pick(SCENE_TYPES);
  const spiritAppears = spiritCompanion !== null && Math.random() < 0.08;

  // Pick a dream subject — creature/character, or nothing (let scene/setting drive)
  // When archetype is active, skip the random subject so the focused interest drives the scene
  const subjectRoll = Math.random();
  let dreamSubject = '';
  if (!archetype) {
    if (subjectRoll < 0.3) {
      // 30% — a fantastical creature or character
      dreamSubject = pick(DREAM_SUBJECTS);
    } else if (subjectRoll < 0.35) {
      // 5% — spirit companion as main subject
      dreamSubject = spiritCompanion
        ? `a magical ${spiritCompanion.replace(/_/g, ' ')}`
        : pick(DREAM_SUBJECTS);
    }
    // 65% — no subject, let setting/interests/mood drive the scene
  }

  // WORLD layer — sometimes swap in a wild bonus location/era for variety
  let eraKeywordsStr: string;
  if (Math.random() < chaos * 0.3) {
    // Bonus era — chaos-gated so adventurous users get more surprises
    eraKeywordsStr = pick(BONUS_ERAS);
  } else {
    const allEras = Object.keys(ERA_KEYWORDS);
    const eraKey = eras.length > 0 ? pickWithChaos(eras, allEras, chaos) : pick(allEras);
    const eraVariations = ERA_KEYWORDS[eraKey];
    eraKeywordsStr = eraVariations ? pick(eraVariations) : '';
  }

  let settingKeywordsStr: string;
  if (Math.random() < chaos * 0.3) {
    // Bonus setting — pop culture / iconic locations
    settingKeywordsStr = pick(BONUS_SETTINGS);
  } else {
    const allSettings = Object.keys(SETTING_KEYWORDS);
    const settingKey =
      settings.length > 0 ? pickWithChaos(settings, allSettings, chaos) : pick(allSettings);
    const settingVariations = SETTING_KEYWORDS[settingKey];
    settingKeywordsStr = settingVariations ? pick(settingVariations) : '';
  }

  // ATMOSPHERE layer
  const mood = filterPool(MOOD_POOL, rolled, chaos);
  const lighting = filterPool(LIGHTING_POOL, rolled, chaos);

  const tagCount = Math.min(3, personalityTags.length);
  const shuffledTags = [...personalityTags].sort(() => Math.random() - 0.5);
  const sampledTags = shuffledTags.slice(0, Math.max(1, tagCount));

  const allAtmospheres = Object.keys(SCENE_ATMOSPHERE_KEYWORDS);
  const atmosphereKey =
    sceneAtmospheres.length > 0
      ? pickWithChaos(sceneAtmospheres, allAtmospheres, chaos)
      : pick(allAtmospheres);
  const sceneAtmosphere = SCENE_ATMOSPHERE_KEYWORDS[atmosphereKey] || '';

  return {
    medium,
    colorKeywords: colorKeywordsStr,
    weirdnessModifier,
    scaleModifier,
    interests: sampledInterests,
    action,
    sceneType,
    spiritCompanion,
    spiritAppears,
    dreamSubject,
    eraKeywords: eraKeywordsStr,
    settingKeywords: settingKeywordsStr,
    mood,
    lighting,
    personalityTags: sampledTags,
    sceneAtmosphere,
  };
}

/**
 * Build a lean fallback prompt (used ONLY when Haiku is unavailable).
 * Picks the 5 most impactful elements — medium, subject, setting, mood, framing.
 * Flux handles short punchy prompts better than walls of text.
 */
export function buildRawPrompt(input: PromptInput): string {
  const parts: string[] = [];

  // 1. Art style anchor
  parts.push(input.medium + '.');

  // 2. Subject — one clear thing to depict
  const interestStr = input.interests.map(expandInterest).join(' and ');
  if (input.dreamSubject) {
    parts.push(`${input.dreamSubject}, ${interestStr} theme.`);
  } else {
    parts.push(`A ${interestStr} scene.`);
  }

  // 3. Setting — one line, where this happens
  if (input.settingKeywords) parts.push(input.settingKeywords + '.');

  // 4. Mood + lighting — how it feels
  parts.push(`${input.mood}, ${input.lighting}.`);

  // 5. Color palette
  if (input.colorKeywords) parts.push(input.colorKeywords + '.');

  // 6. Optional spice (one of: composition, action, spirit, weirdness)
  const spice: string[] = [];
  const comp = pick(COMPOSITIONS);
  if (comp) spice.push(comp);
  if (input.action) spice.push(`Someone ${input.action}.`);
  if (input.spiritAppears && input.spiritCompanion) {
    spice.push(`Hidden somewhere: a small ${input.spiritCompanion.replace(/_/g, ' ')}.`);
  }
  if (input.weirdnessModifier) spice.push(input.weirdnessModifier + '.');
  // Pick just ONE spice element to keep it tight
  if (spice.length > 0) parts.push(pick(spice));

  parts.push('Stylized characters welcome. No photorealistic faces. No nudity.');

  return parts.join(' ');
}

/**
 * Build a creative brief for Haiku to imagine a dream.
 * Haiku's job: pick the BEST 4-5 elements and weave them into ONE cohesive scene.
 * Everything is phrased as INSPIRATION, not literal instructions.
 */
export function buildHaikuPrompt(input: PromptInput): string {
  // Pick a random composition for Haiku to consider
  const comp = pick(COMPOSITIONS);

  return `Dream up a stunning image. Use these ingredients however you want — combine them, twist them, surprise us. Drop anything that doesn't fit.

Style: ${input.medium}
Subject: ${input.dreamSubject || input.interests.map(expandInterest).join(' and ')}
Place: ${input.settingKeywords}, ${input.eraKeywords}
Mood: ${input.mood}, ${input.lighting}
${input.colorKeywords ? `Colors: ${input.colorKeywords}` : ''}
${input.sceneAtmosphere ? `Weather: ${input.sceneAtmosphere}` : ''}
${input.action ? `Action: ${input.action}` : ''}
${input.sceneType ? `Moment: ${input.sceneType}` : ''}
${comp ? `Frame: ${comp}` : ''}
${input.spiritAppears && input.spiritCompanion ? `Hidden easter egg: a tiny ${input.spiritCompanion.replace(/_/g, ' ')}` : ''}

Write a vivid image prompt (max 50 words). Start with the art style. Be creative — the best dreams are ones nobody has seen before. No photorealistic humans. No portraits of real people. No text or words in the image.

Output ONLY the prompt.`;
}

/** Archetype interface — used by the edge function to pass archetype data */
export interface DreamArchetype {
  key: string;
  name: string;
  prompt_context: string;
  flavor_keywords: string[];
}
