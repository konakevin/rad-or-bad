import { create } from 'zustand';
import type {
  Recipe, RecipeAxes, Interest, ColorPalette, PersonalityTag,
  Era, Setting, SceneAtmosphere, SpiritCompanion,
} from '@/types/recipe';
import { DEFAULT_RECIPE } from '@/types/recipe';
import { MOOD_TILES } from '@/constants/onboarding';

interface OnboardingStore {
  step: number;
  setStep: (step: number) => void;
  /** True when editing from settings (shows X to dismiss) */
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;

  recipe: Recipe;

  /** Mood keys selected during onboarding (maps to energy/brightness axes) */
  selectedMoods: string[];
  toggleMood: (key: string) => void;

  toggleInterest: (interest: Interest) => void;
  setRealism: (value: number) => void;
  setMoodPosition: (energy: number, brightness: number) => void;
  toggleColorPalette: (palette: ColorPalette) => void;
  togglePersonalityTag: (tag: PersonalityTag) => void;
  setChaos: (value: number) => void;
  setWeirdness: (value: number) => void;
  setScale: (value: number) => void;
  toggleEra: (era: Era) => void;
  toggleSetting: (setting: Setting) => void;
  toggleSceneAtmosphere: (atmosphere: SceneAtmosphere) => void;
  setSpiritCompanion: (companion: SpiritCompanion | null) => void;
  adjustAxis: (axis: keyof RecipeAxes, delta: number) => void;
  reset: () => void;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  step: 1,
  setStep: (step) => set({ step }),

  recipe: { ...DEFAULT_RECIPE },

  selectedMoods: [],
  toggleMood: (key) =>
    set((s) => {
      const current = s.selectedMoods;
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      // Compute average energy/brightness from selected moods
      const selectedData = MOOD_TILES.filter((m) => next.includes(m.key));
      if (selectedData.length > 0) {
        const avgEnergy = selectedData.reduce((sum, m) => sum + m.energy, 0) / selectedData.length;
        const avgBrightness = selectedData.reduce((sum, m) => sum + m.brightness, 0) / selectedData.length;
        return {
          selectedMoods: next,
          recipe: {
            ...s.recipe,
            axes: { ...s.recipe.axes, energy: clamp(avgEnergy), brightness: clamp(avgBrightness) },
          },
        };
      }
      return { selectedMoods: next };
    }),

  toggleInterest: (interest) =>
    set((s) => {
      const current = s.recipe.interests;
      const next = current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest];
      return { recipe: { ...s.recipe, interests: next } };
    }),

  setRealism: (value) =>
    set((s) => ({
      recipe: { ...s.recipe, axes: { ...s.recipe.axes, realism: clamp(value) } },
    })),

  setMoodPosition: (energy, brightness) =>
    set((s) => ({
      recipe: {
        ...s.recipe,
        axes: { ...s.recipe.axes, energy: clamp(energy), brightness: clamp(brightness) },
      },
    })),

  toggleColorPalette: (palette) =>
    set((s) => {
      const current = s.recipe.color_palettes;
      const next = current.includes(palette)
        ? current.filter((p) => p !== palette)
        : [...current, palette];
      return { recipe: { ...s.recipe, color_palettes: next } };
    }),

  togglePersonalityTag: (tag) =>
    set((s) => {
      const current = s.recipe.personality_tags;
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      return { recipe: { ...s.recipe, personality_tags: next } };
    }),

  setChaos: (value) =>
    set((s) => ({
      recipe: { ...s.recipe, axes: { ...s.recipe.axes, chaos: clamp(value) } },
    })),

  setWeirdness: (value) =>
    set((s) => ({
      recipe: { ...s.recipe, axes: { ...s.recipe.axes, weirdness: clamp(value) } },
    })),

  setScale: (value) =>
    set((s) => ({
      recipe: { ...s.recipe, axes: { ...s.recipe.axes, scale: clamp(value) } },
    })),

  toggleEra: (era) =>
    set((s) => {
      const current = s.recipe.eras;
      const next = current.includes(era)
        ? current.filter((e) => e !== era)
        : [...current, era];
      return { recipe: { ...s.recipe, eras: next } };
    }),

  toggleSetting: (setting) =>
    set((s) => {
      const current = s.recipe.settings;
      const next = current.includes(setting)
        ? current.filter((st) => st !== setting)
        : [...current, setting];
      return { recipe: { ...s.recipe, settings: next } };
    }),

  toggleSceneAtmosphere: (atmosphere) =>
    set((s) => {
      const current = s.recipe.scene_atmospheres;
      const next = current.includes(atmosphere)
        ? current.filter((a) => a !== atmosphere)
        : [...current, atmosphere];
      return { recipe: { ...s.recipe, scene_atmospheres: next } };
    }),

  setSpiritCompanion: (companion) =>
    set((s) => ({ recipe: { ...s.recipe, spirit_companion: companion } })),

  adjustAxis: (axis, delta) =>
    set((s) => ({
      recipe: {
        ...s.recipe,
        axes: { ...s.recipe.axes, [axis]: clamp(s.recipe.axes[axis] + delta) },
      },
    })),

  isEditing: false,
  setIsEditing: (v) => set({ isEditing: v }),
  reset: () => set({ step: 1, isEditing: false, selectedMoods: [], recipe: { ...DEFAULT_RECIPE } }),
}));
