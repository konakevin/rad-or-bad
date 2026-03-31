import type { Interest, ColorPalette, PersonalityTag, Era, Setting, SceneAtmosphere, SpiritCompanion } from '@/types/recipe';

/** Step 1: Interest tiles */
export const INTEREST_TILES: { key: Interest; label: string; icon: string }[] = [
  { key: 'animals',      label: 'Animals',      icon: 'paw' },
  { key: 'nature',       label: 'Nature',       icon: 'leaf' },
  { key: 'fantasy',      label: 'Fantasy',      icon: 'sparkles' },
  { key: 'sci_fi',       label: 'Sci-Fi',       icon: 'planet' },
  { key: 'architecture', label: 'Architecture', icon: 'business' },
  { key: 'fashion',      label: 'Fashion',      icon: 'shirt' },
  { key: 'food',         label: 'Food',         icon: 'restaurant' },
  { key: 'abstract',     label: 'Abstract',     icon: 'color-palette' },
  { key: 'dark',         label: 'Dark',         icon: 'moon' },
  { key: 'cute',         label: 'Cute',         icon: 'heart' },
  { key: 'ocean',        label: 'Ocean',        icon: 'water' },
  { key: 'space',        label: 'Space',        icon: 'rocket' },
  { key: 'whimsical',    label: 'Whimsical',    icon: 'balloon' },
];

/** Step 2: Spirit companion tiles */
export const SPIRIT_COMPANIONS: { key: SpiritCompanion; label: string; icon: string }[] = [
  { key: 'fox',               label: 'Fox',        icon: 'paw' },
  { key: 'cat',               label: 'Cat',        icon: 'paw' },
  { key: 'owl',               label: 'Owl',        icon: 'eye' },
  { key: 'dragon',            label: 'Dragon',     icon: 'flame' },
  { key: 'rabbit',            label: 'Rabbit',     icon: 'heart' },
  { key: 'wolf',              label: 'Wolf',       icon: 'moon' },
  { key: 'jellyfish',         label: 'Jellyfish',  icon: 'water' },
  { key: 'deer',              label: 'Deer',       icon: 'leaf' },
  { key: 'butterfly',         label: 'Butterfly',  icon: 'flower' },
  { key: 'robot',             label: 'Robot',      icon: 'hardware-chip' },
  { key: 'ghost',             label: 'Ghost',      icon: 'cloudy-night' },
  { key: 'mushroom_creature', label: 'Mushroom',   icon: 'nuclear' },
];

/** Step 4: Era tiles */
export const ERA_TILES: { key: Era; label: string; icon: string }[] = [
  { key: 'ancient',     label: 'Ancient',    icon: 'trophy' },
  { key: 'medieval',    label: 'Medieval',   icon: 'shield' },
  { key: 'victorian',   label: 'Victorian',  icon: 'key' },
  { key: 'retro',       label: 'Retro',      icon: 'radio' },
  { key: 'modern',      label: 'Modern',     icon: 'phone-portrait' },
  { key: 'far_future',  label: 'Far Future', icon: 'rocket' },
];

/** Step 4: Setting tiles */
export const SETTING_TILES: { key: Setting; label: string; icon: string }[] = [
  { key: 'cozy_indoors',  label: 'Cozy Indoors',  icon: 'home' },
  { key: 'wild_outdoors', label: 'Wild Outdoors',  icon: 'trail-sign' },
  { key: 'city_streets',  label: 'City Streets',   icon: 'business' },
  { key: 'otherworldly',  label: 'Otherworldly',   icon: 'planet' },
];

/** Step 5: Mood tiles */
export const MOOD_TILES: { key: string; label: string; icon: string; energy: number; brightness: number }[] = [
  { key: 'cozy',       label: 'Cozy',       icon: 'cafe',           energy: 0.2, brightness: 0.6 },
  { key: 'epic',       label: 'Epic',       icon: 'flash',          energy: 0.9, brightness: 0.6 },
  { key: 'dreamy',     label: 'Dreamy',     icon: 'cloud',          energy: 0.2, brightness: 0.8 },
  { key: 'moody',      label: 'Moody',      icon: 'rainy',          energy: 0.3, brightness: 0.2 },
  { key: 'playful',    label: 'Playful',    icon: 'balloon',        energy: 0.6, brightness: 0.8 },
  { key: 'serene',     label: 'Serene',     icon: 'water',          energy: 0.1, brightness: 0.7 },
  { key: 'intense',    label: 'Intense',    icon: 'thunderstorm',   energy: 0.9, brightness: 0.3 },
  { key: 'nostalgic',  label: 'Nostalgic',  icon: 'time',           energy: 0.3, brightness: 0.5 },
  { key: 'mysterious', label: 'Mysterious', icon: 'eye',            energy: 0.5, brightness: 0.2 },
  { key: 'whimsical',  label: 'Whimsical',  icon: 'sparkles',       energy: 0.5, brightness: 0.7 },
  { key: 'dramatic',   label: 'Dramatic',   icon: 'flame',          energy: 0.8, brightness: 0.3 },
  { key: 'peaceful',   label: 'Peaceful',   icon: 'leaf',           energy: 0.1, brightness: 0.6 },
];

/** Step 6: Scene atmosphere tiles */
export const SCENE_ATMOSPHERE_TILES: { key: SceneAtmosphere; label: string; icon: string }[] = [
  { key: 'sunny_morning',    label: 'Sunny Morning',    icon: 'sunny' },
  { key: 'rainy_afternoon',  label: 'Rainy Afternoon',  icon: 'rainy' },
  { key: 'snowy_night',      label: 'Snowy Night',      icon: 'snow' },
  { key: 'foggy_dawn',       label: 'Foggy Dawn',       icon: 'cloudy' },
  { key: 'stormy_twilight',  label: 'Stormy Twilight',  icon: 'thunderstorm' },
  { key: 'starry_midnight',  label: 'Starry Midnight',  icon: 'moon' },
  { key: 'golden_hour',      label: 'Golden Hour',      icon: 'sunny' },
  { key: 'aurora_night',     label: 'Aurora Night',     icon: 'sparkles' },
];

/** Step 7: Color palette options */
export const COLOR_PALETTES: { key: ColorPalette; label: string; colors: string[] }[] = [
  { key: 'warm_sunset',    label: 'Warm Sunset',    colors: ['#FFD700', '#FF8C00', '#FF4500'] },
  { key: 'cool_twilight',  label: 'Cool Twilight',  colors: ['#6699EE', '#8855CC', '#BB88EE'] },
  { key: 'earthy_natural', label: 'Earthy Natural', colors: ['#4CAA64', '#8B7355', '#556B2F'] },
  { key: 'soft_pastel',    label: 'Soft Pastel',    colors: ['#FFB6C1', '#DDA0DD', '#F0F8FF'] },
  { key: 'dark_bold',      label: 'Dark & Bold',    colors: ['#1A1A2E', '#E63946', '#FFD700'] },
  { key: 'everything',     label: 'Surprise Me',    colors: ['#FF4500', '#FFD700', '#4CAA64', '#6699EE', '#BB88EE'] },
];

/** Step 8: Personality tags */
export const PERSONALITY_TAGS: { key: PersonalityTag; label: string }[] = [
  { key: 'dreamy',      label: 'Dreamy' },
  { key: 'adventurous', label: 'Adventurous' },
  { key: 'cozy',        label: 'Cozy' },
  { key: 'edgy',        label: 'Edgy' },
  { key: 'romantic',    label: 'Romantic' },
  { key: 'mysterious',  label: 'Mysterious' },
  { key: 'playful',     label: 'Playful' },
  { key: 'fierce',      label: 'Fierce' },
  { key: 'peaceful',    label: 'Peaceful' },
  { key: 'chaotic',     label: 'Chaotic' },
  { key: 'nostalgic',   label: 'Nostalgic' },
  { key: 'futuristic',  label: 'Futuristic' },
  { key: 'elegant',     label: 'Elegant' },
  { key: 'raw',         label: 'Raw' },
  { key: 'whimsical',   label: 'Whimsical' },
  { key: 'bold',        label: 'Bold' },
  { key: 'gentle',      label: 'Gentle' },
  { key: 'wild',        label: 'Wild' },
];

/** Minimum selections per step — no maximums, pick as many as you want */
export const LIMITS = {
  interests: { min: 3 },
  colorPalettes: { min: 1 },
  personalityTags: { min: 1 },
  moods: { min: 1 },
  sceneAtmospheres: { min: 1 },
} as const;

/** Total steps in the onboarding flow */
export const TOTAL_STEPS = 11;
