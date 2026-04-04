/**
 * Genetic Dream Fusion — merges two Recipe objects using dominant/recessive genetics.
 *
 * Axes: extreme values (far from 0.5) are "dominant" and pull harder.
 * Discrete arrays: each parent contributes picks proportional to blend %.
 * Spirit companion: weighted coin flip.
 * 5% chance of random mutation (a trait neither parent has).
 */

import type {
  Recipe,
  RecipeAxes,
  Interest,
  ColorPalette,
  PersonalityTag,
  Era,
  Setting,
  SceneAtmosphere,
  SpiritCompanion,
} from '@/types/recipe';
import { DEFAULT_RECIPE } from '@/types/recipe';

// All possible values for mutation injection
const ALL_INTERESTS: Interest[] = [
  'animals',
  'nature',
  'fantasy',
  'sci_fi',
  'architecture',
  'fashion',
  'food',
  'abstract',
  'dark',
  'cute',
  'ocean',
  'space',
  'whimsical',
  'gaming',
  'movies',
  'music',
  'geek',
  'sports',
  'travel',
  'pride',
];
const ALL_ERAS: Era[] = [
  'ancient',
  'medieval',
  'victorian',
  'retro',
  'modern',
  'far_future',
  'prehistoric',
  'steampunk',
  'art_deco',
  'synthwave',
];
const ALL_SETTINGS: Setting[] = [
  'cozy_indoors',
  'wild_outdoors',
  'city_streets',
  'otherworldly',
  'beach_tropical',
  'mountains',
  'underground',
  'space',
  'village',
  'underwater',
];
const ALL_COMPANIONS: SpiritCompanion[] = [
  'fox',
  'cat',
  'owl',
  'dragon',
  'rabbit',
  'wolf',
  'jellyfish',
  'deer',
  'butterfly',
  'robot',
  'ghost',
  'mushroom_creature',
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Merge two arrays with proportional contribution from each parent.
 * Each parent always contributes at least 1 pick.
 */
function mergeArrays<T>(parentA: T[], parentB: T[], aWeight: number): T[] {
  if (parentA.length === 0 && parentB.length === 0) return [];
  if (parentA.length === 0) return [...parentB];
  if (parentB.length === 0) return [...parentA];

  const aCount = Math.max(1, Math.round(parentA.length * aWeight));
  const bCount = Math.max(1, Math.round(parentB.length * (1 - aWeight)));

  return dedupe([...shuffle(parentA).slice(0, aCount), ...shuffle(parentB).slice(0, bCount)]);
}

/**
 * Merge a single axis value using dominant/recessive genetics.
 * Values far from 0.5 (strong opinions) are dominant and pull harder.
 */
function mergeAxis(a: number, b: number, aWeight: number): number {
  const aDominance = Math.abs(a - 0.5) * 2; // 0-1: how opinionated
  const bDominance = Math.abs(b - 0.5) * 2;

  // Dominant traits pull the blend in their direction
  const dominanceBonus = (aDominance - bDominance) * 0.15;
  const finalAWeight = clamp(aWeight + dominanceBonus, 0.1, 0.9);
  const finalBWeight = 1 - finalAWeight;

  let child = a * finalAWeight + b * finalBWeight;

  // Genetic jitter: ±5% random mutation
  child = clamp(child + (Math.random() - 0.5) * 0.1, 0, 1);

  return Math.round(child * 1000) / 1000; // clean float
}

/**
 * Fuse two Recipe objects into a child Recipe.
 * @param parentA — the source post's recipe (their DNA)
 * @param parentB — the user's recipe (your DNA)
 * @param blend — 0 to 100. 0 = 100% parent A, 100 = 100% parent B, 50 = equal.
 */
export function fuseRecipes(parentA: Recipe, parentB: Recipe, blend: number): Recipe {
  const a = { ...DEFAULT_RECIPE, ...parentA };
  const b = { ...DEFAULT_RECIPE, ...parentB };
  const aWeight = (100 - blend) / 100; // 0-1

  // Merge all 8 axes
  const axisKeys: (keyof RecipeAxes)[] = [
    'color_warmth',
    'complexity',
    'realism',
    'energy',
    'brightness',
    'chaos',
    'weirdness',
    'scale',
  ];
  const axes: RecipeAxes = { ...DEFAULT_RECIPE.axes };
  for (const key of axisKeys) {
    axes[key] = mergeAxis(a.axes[key] ?? 0.5, b.axes[key] ?? 0.5, aWeight);
  }

  // Merge discrete arrays
  const interests = mergeArrays(a.interests, b.interests, aWeight) as Interest[];
  const color_palettes = mergeArrays(a.color_palettes, b.color_palettes, aWeight) as ColorPalette[];
  const personality_tags = mergeArrays(
    a.personality_tags,
    b.personality_tags,
    aWeight
  ) as PersonalityTag[];
  const eras = mergeArrays(a.eras, b.eras, aWeight) as Era[];
  const settings = mergeArrays(a.settings, b.settings, aWeight) as Setting[];
  const scene_atmospheres = mergeArrays(
    a.scene_atmospheres,
    b.scene_atmospheres,
    aWeight
  ) as SceneAtmosphere[];

  // Spirit companion: weighted coin flip
  const spirit_companion = Math.random() < aWeight ? a.spirit_companion : b.spirit_companion;

  // 5% chance of random mutation — inject a trait neither parent has
  if (Math.random() < 0.05) {
    const parentInterests = new Set([...a.interests, ...b.interests]);
    const newInterest = ALL_INTERESTS.find((i) => !parentInterests.has(i));
    if (newInterest) interests.push(newInterest);
  }
  if (Math.random() < 0.05) {
    const parentEras = new Set([...a.eras, ...b.eras]);
    const newEra = ALL_ERAS.find((e) => !parentEras.has(e));
    if (newEra) eras.push(newEra);
  }
  if (Math.random() < 0.05) {
    const parentSettings = new Set([...a.settings, ...b.settings]);
    const newSetting = ALL_SETTINGS.find((s) => !parentSettings.has(s));
    if (newSetting) settings.push(newSetting);
  }

  return {
    axes,
    interests,
    color_palettes,
    personality_tags,
    eras,
    settings,
    scene_atmospheres,
    spirit_companion,
  };
}
