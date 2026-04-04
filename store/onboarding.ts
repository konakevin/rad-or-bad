import { create } from 'zustand';
import type {
  VibeProfile,
  Aesthetic,
  ArtStyle,
  SubjectInterest,
  SpiritCompanion,
  MoodAxes,
  PersonalAnchors,
} from '@/types/vibeProfile';
import { DEFAULT_VIBE_PROFILE } from '@/types/vibeProfile';

interface OnboardingStore {
  step: number;
  setStep: (step: number) => void;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;

  profile: VibeProfile;

  // Step 2: Visual Taste
  toggleAesthetic: (key: Aesthetic) => void;
  toggleArtStyle: (key: ArtStyle) => void;

  // Step 3: Interests
  toggleInterest: (key: SubjectInterest) => void;

  // Step 4: Mood Sliders
  setMoodAxis: (axis: keyof MoodAxes, value: number) => void;

  // Step 5: Personal Anchors
  setAnchor: (key: keyof PersonalAnchors, value: string) => void;

  // Step 6: Spirit Companion
  setSpiritCompanion: (companion: SpiritCompanion | null) => void;

  // Load existing profile for editing
  loadProfile: (profile: VibeProfile) => void;

  reset: () => void;
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  step: 1,
  setStep: (step) => set({ step }),

  isEditing: false,
  setIsEditing: (v) => set({ isEditing: v }),

  profile: { ...DEFAULT_VIBE_PROFILE },

  toggleAesthetic: (key) =>
    set((s) => ({ profile: { ...s.profile, aesthetics: toggle(s.profile.aesthetics, key) } })),

  toggleArtStyle: (key) =>
    set((s) => ({ profile: { ...s.profile, art_styles: toggle(s.profile.art_styles, key) } })),

  toggleInterest: (key) =>
    set((s) => ({ profile: { ...s.profile, interests: toggle(s.profile.interests, key) } })),

  setMoodAxis: (axis, value) =>
    set((s) => ({
      profile: { ...s.profile, moods: { ...s.profile.moods, [axis]: clamp(value) } },
    })),

  setAnchor: (key, value) =>
    set((s) => ({
      profile: { ...s.profile, personal_anchors: { ...s.profile.personal_anchors, [key]: value } },
    })),

  setSpiritCompanion: (companion) =>
    set((s) => ({ profile: { ...s.profile, spirit_companion: companion } })),

  loadProfile: (profile) => set({ profile }),

  reset: () => set({ step: 1, isEditing: false, profile: { ...DEFAULT_VIBE_PROFILE } }),
}));
