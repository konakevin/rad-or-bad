/**
 * Migrate legacy Recipe to VibeProfile v2.
 * Runs lazily on app launch when a legacy recipe is detected.
 */

import type { Recipe } from '@/types/recipe';
import type {
  VibeProfile,
  Aesthetic,
  ArtStyle,
  SubjectInterest,
  MoodAxes,
} from '@/types/vibeProfile';

const TAG_TO_AESTHETIC: Record<string, Aesthetic> = {
  dreamy: 'dreamy',
  cozy: 'cozy',
  edgy: 'gothic',
  mysterious: 'liminal',
  futuristic: 'retrofuturism',
  nostalgic: 'analog_film',
  raw: 'brutalist',
  whimsical: 'cottagecore',
  bold: 'maximalist',
  gentle: 'minimalist',
  peaceful: 'solarpunk',
  chaotic: 'psychedelic',
  elegant: 'art_nouveau',
  playful: 'vaporwave',
};

const ERA_TO_AESTHETIC: Record<string, Aesthetic> = {
  synthwave: 'vaporwave',
  steampunk: 'steampunk',
  victorian: 'gothic',
  art_deco: 'art_nouveau',
  far_future: 'cyberpunk',
  medieval: 'dark_academia',
  retro: 'analog_film',
  ancient: 'brutalist',
};

export function migrateRecipeToVibeProfile(recipe: Recipe): VibeProfile {
  // Map personality_tags + eras → aesthetics
  const aesthetics = new Set<Aesthetic>();
  for (const tag of recipe.personality_tags ?? []) {
    const mapped = TAG_TO_AESTHETIC[tag];
    if (mapped) aesthetics.add(mapped);
  }
  for (const era of recipe.eras ?? []) {
    const mapped = ERA_TO_AESTHETIC[era];
    if (mapped) aesthetics.add(mapped);
  }
  // Pad to minimum 3
  const defaults: Aesthetic[] = ['dreamy', 'cozy', 'surreal'];
  for (const d of defaults) {
    if (aesthetics.size >= 3) break;
    aesthetics.add(d);
  }

  // Infer art styles from realism axis
  const artStyles: ArtStyle[] = [];
  if (recipe.axes.realism > 0.6) {
    artStyles.push('35mm_photography', 'cgi');
  } else if (recipe.axes.realism < 0.4) {
    artStyles.push('watercolor', 'anime');
  } else {
    artStyles.push('oil_painting', 'watercolor');
  }

  // Map axes → mood axes
  const moods: MoodAxes = {
    peaceful_chaotic: recipe.axes.energy,
    cute_terrifying: 1 - recipe.axes.brightness,
    minimal_maximal: recipe.axes.complexity,
    realistic_surreal: recipe.axes.weirdness,
  };

  // Interests carry over (types overlap)
  const interests = (recipe.interests ?? []) as SubjectInterest[];

  return {
    version: 2,
    aesthetics: [...aesthetics].slice(0, 6),
    art_styles: artStyles,
    interests,
    moods,
    personal_anchors: { place: '', object: '', era: '', dream_vibe: '' },
    avoid: ['text', 'watermarks'],
    spirit_companion: recipe.spirit_companion ?? null,
  };
}

export function isVibeProfile(data: unknown): data is VibeProfile {
  return (
    typeof data === 'object' && data !== null && (data as Record<string, unknown>).version === 2
  );
}

export function isLegacyRecipe(data: unknown): data is Recipe {
  return (
    typeof data === 'object' &&
    data !== null &&
    'axes' in (data as Record<string, unknown>) &&
    !('version' in (data as Record<string, unknown>))
  );
}
