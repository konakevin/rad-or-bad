import type { Category } from '@/types/database';

export const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'animals', label: 'Animals', icon: 'paw' },
  { key: 'art',     label: 'Art',     icon: 'color-palette' },
  { key: 'beauty',  label: 'Beauty',  icon: 'sparkles' },
  { key: 'cute',    label: 'Cute',    icon: 'heart' },
  { key: 'food',    label: 'Food',    icon: 'restaurant' },
  { key: 'funny',   label: 'Funny',   icon: 'happy' },
  { key: 'memes',   label: 'Memes',   icon: 'skull' },
  { key: 'music',   label: 'Music',   icon: 'musical-notes' },
  { key: 'nature',  label: 'Nature',  icon: 'leaf' },
  { key: 'people',  label: 'People',  icon: 'people' },
  { key: 'quotes',  label: 'Quotes',  icon: 'chatbubble-ellipses' },
  { key: 'sports',  label: 'Sports',  icon: 'basketball' },
];

export const CATEGORY_LABELS: Record<string, string> =
  Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

export const CATEGORY_ICONS: Record<string, string> =
  Object.fromEntries(CATEGORIES.map((c) => [c.key, c.icon]));
