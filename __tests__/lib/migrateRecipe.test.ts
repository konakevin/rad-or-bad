import { migrateRecipeToVibeProfile, isVibeProfile, isLegacyRecipe } from '@/lib/migrateRecipe';
import { DEFAULT_RECIPE } from '@/types/recipe';
import type { Recipe } from '@/types/recipe';
import { DEFAULT_VIBE_PROFILE } from '@/types/vibeProfile';

const FULL_RECIPE: Recipe = {
  axes: {
    color_warmth: 0.7,
    complexity: 0.6,
    realism: 0.3,
    energy: 0.4,
    brightness: 0.8,
    chaos: 0.5,
    weirdness: 0.6,
    scale: 0.5,
  },
  interests: ['fantasy', 'ocean', 'dark'],
  color_palettes: ['cool_twilight', 'dark_bold'],
  personality_tags: ['dreamy', 'mysterious', 'edgy'],
  eras: ['medieval', 'synthwave'],
  settings: ['underwater', 'otherworldly'],
  scene_atmospheres: ['starry_midnight', 'foggy_dawn'],
  spirit_companion: 'dragon',
};

describe('migrateRecipeToVibeProfile', () => {
  it('sets version to 2', () => {
    const profile = migrateRecipeToVibeProfile(FULL_RECIPE);
    expect(profile.version).toBe(2);
  });

  it('maps personality tags to aesthetics', () => {
    const profile = migrateRecipeToVibeProfile(FULL_RECIPE);
    expect(profile.aesthetics).toContain('dreamy');
    expect(profile.aesthetics).toContain('liminal'); // mysterious → liminal
    expect(profile.aesthetics).toContain('gothic'); // edgy → gothic
  });

  it('maps eras to aesthetics', () => {
    const profile = migrateRecipeToVibeProfile(FULL_RECIPE);
    expect(profile.aesthetics).toContain('vaporwave'); // synthwave → vaporwave
    expect(profile.aesthetics).toContain('dark_academia'); // medieval → dark_academia
  });

  it('has at least 3 aesthetics', () => {
    const profile = migrateRecipeToVibeProfile(DEFAULT_RECIPE);
    expect(profile.aesthetics.length).toBeGreaterThanOrEqual(3);
  });

  it('maps axes to mood axes', () => {
    const profile = migrateRecipeToVibeProfile(FULL_RECIPE);
    expect(profile.moods.peaceful_chaotic).toBe(0.4); // energy
    expect(profile.moods.realistic_surreal).toBe(0.6); // weirdness
  });

  it('infers art styles from realism', () => {
    const profile = migrateRecipeToVibeProfile(FULL_RECIPE);
    // realism=0.3 → illustrated styles
    expect(profile.art_styles).toContain('watercolor');
  });

  it('preserves interests', () => {
    const profile = migrateRecipeToVibeProfile(FULL_RECIPE);
    expect(profile.interests).toContain('fantasy');
    expect(profile.interests).toContain('ocean');
  });

  it('preserves spirit companion', () => {
    const profile = migrateRecipeToVibeProfile(FULL_RECIPE);
    expect(profile.spirit_companion).toBe('dragon');
  });

  it('sets empty personal anchors', () => {
    const profile = migrateRecipeToVibeProfile(FULL_RECIPE);
    expect(profile.personal_anchors.place).toBe('');
    expect(profile.personal_anchors.dream_vibe).toBe('');
  });

  it('includes default avoid list', () => {
    const profile = migrateRecipeToVibeProfile(FULL_RECIPE);
    expect(profile.avoid).toContain('text');
    expect(profile.avoid).toContain('watermarks');
  });
});

describe('isVibeProfile', () => {
  it('returns true for vibe profile', () => {
    expect(isVibeProfile(DEFAULT_VIBE_PROFILE)).toBe(true);
  });

  it('returns false for legacy recipe', () => {
    expect(isVibeProfile(DEFAULT_RECIPE)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isVibeProfile(null)).toBe(false);
  });
});

describe('isLegacyRecipe', () => {
  it('returns true for legacy recipe', () => {
    expect(isLegacyRecipe(DEFAULT_RECIPE)).toBe(true);
  });

  it('returns false for vibe profile', () => {
    expect(isLegacyRecipe(DEFAULT_VIBE_PROFILE)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isLegacyRecipe(null)).toBe(false);
  });
});
