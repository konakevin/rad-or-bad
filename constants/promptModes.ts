import type { PromptMode } from '@/types/vibeProfile';

export interface PromptModeConfig {
  userWeight: number;
  spiceWeight: number;
  directive: string;
}

export const PROMPT_MODE_CONFIGS: Record<PromptMode, PromptModeConfig> = {
  dream_me: {
    userWeight: 0.7,
    spiceWeight: 0.3,
    directive: 'Create a personalized dream that feels like it was made just for this person.',
  },
  chaos: {
    userWeight: 0.3,
    spiceWeight: 0.7,
    directive:
      'Go wild. Use their taste as a launchpad but take it somewhere unexpected and bizarre. Surprise them.',
  },
  cinematic_poster: {
    userWeight: 0.7,
    spiceWeight: 0.3,
    directive:
      'Frame this as a cinematic movie poster. Dramatic lighting, strong focal point, epic scale. Anamorphic lens, dramatic angle.',
  },
  minimal_mood: {
    userWeight: 0.8,
    spiceWeight: 0.2,
    directive:
      'Strip everything to essentials: ONE subject, ONE color mood, ONE emotion. Negative space. Less is more.',
  },
  nature_escape: {
    userWeight: 0.6,
    spiceWeight: 0.4,
    directive:
      'Create a breathtaking landscape with NO characters. Pure place. Light, texture, depth.',
  },
  character_study: {
    userWeight: 0.7,
    spiceWeight: 0.3,
    directive:
      'Focus on a single character or creature. Give them personality through pose and detail.',
  },
  nostalgia_trip: {
    userWeight: 0.8,
    spiceWeight: 0.2,
    directive:
      'Lean heavily into their era and personal anchors. Warm memory. Golden tones, soft focus, familiar objects.',
  },
};

export const PROMPT_MODE_TILES: { key: PromptMode; label: string; icon: string; hint: string }[] = [
  {
    key: 'dream_me',
    label: 'Dream Me',
    icon: 'sparkles',
    hint: 'Personalized to your taste with a splash of surprise',
  },
  { key: 'chaos', label: 'Chaos', icon: 'flash', hint: 'Wild and unpredictable — anything goes' },
  {
    key: 'cinematic_poster',
    label: 'Cinematic',
    icon: 'film',
    hint: 'Dramatic movie poster vibes, epic lighting',
  },
  {
    key: 'minimal_mood',
    label: 'Minimal',
    icon: 'remove',
    hint: 'Clean and simple — one subject, one mood',
  },
  { key: 'nature_escape', label: 'Nature', icon: 'leaf', hint: 'Pure landscapes, no characters' },
  {
    key: 'character_study',
    label: 'Character',
    icon: 'person',
    hint: 'A creature or figure takes center stage',
  },
  {
    key: 'nostalgia_trip',
    label: 'Nostalgia',
    icon: 'time',
    hint: 'Warm memories, golden tones, your favorite eras',
  },
];
