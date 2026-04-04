import type { Aesthetic, ArtStyle, SubjectInterest, SpiritCompanion } from '@/types/vibeProfile';

/** Step 2a: Aesthetic tiles */
export const AESTHETIC_TILES: { key: Aesthetic; label: string; icon: string }[] = [
  { key: 'cyberpunk', label: 'Cyberpunk', icon: 'flash' },
  { key: 'cozy', label: 'Cozy', icon: 'cafe' },
  { key: 'liminal', label: 'Liminal', icon: 'exit' },
  { key: 'brutalist', label: 'Brutalist', icon: 'business' },
  { key: 'retrofuturism', label: 'Retro-Futurism', icon: 'rocket' },
  { key: 'dreamy', label: 'Dreamy', icon: 'cloud' },
  { key: 'analog_film', label: 'Analog Film', icon: 'film' },
  { key: 'surreal', label: 'Surreal', icon: 'eye' },
  { key: 'cottagecore', label: 'Cottagecore', icon: 'flower' },
  { key: 'dark_academia', label: 'Dark Academia', icon: 'book' },
  { key: 'solarpunk', label: 'Solarpunk', icon: 'sunny' },
  { key: 'vaporwave', label: 'Vaporwave', icon: 'musical-notes' },
  { key: 'gothic', label: 'Gothic', icon: 'moon' },
  { key: 'art_nouveau', label: 'Art Nouveau', icon: 'color-palette' },
  { key: 'maximalist', label: 'Maximalist', icon: 'sparkles' },
  { key: 'minimalist', label: 'Minimalist', icon: 'remove' },
  { key: 'psychedelic', label: 'Psychedelic', icon: 'nuclear' },
  { key: 'steampunk', label: 'Steampunk', icon: 'cog' },
  { key: 'biopunk', label: 'Biopunk', icon: 'pulse' },
  { key: 'afrofuturism', label: 'Afrofuturism', icon: 'globe' },
];

/** Step 2b: Art style tiles */
export const ART_STYLE_TILES: { key: ArtStyle; label: string; icon: string }[] = [
  { key: 'oil_painting', label: 'Oil Painting', icon: 'brush' },
  { key: 'anime', label: 'Anime', icon: 'star' },
  { key: '35mm_photography', label: '35mm Film', icon: 'camera' },
  { key: 'watercolor', label: 'Watercolor', icon: 'water' },
  { key: 'cgi', label: 'CGI', icon: 'cube' },
  { key: 'pixel_art', label: 'Pixel Art', icon: 'grid' },
  { key: 'claymation', label: 'Claymation', icon: 'hand-left' },
  { key: 'pencil_sketch', label: 'Pencil Sketch', icon: 'pencil' },
  { key: 'comic_book', label: 'Comic Book', icon: 'chatbubble' },
  { key: 'stained_glass', label: 'Stained Glass', icon: 'diamond' },
  { key: 'ukiyo_e', label: 'Ukiyo-e', icon: 'leaf' },
  { key: 'gouache', label: 'Gouache', icon: 'color-fill' },
  { key: 'vector_art', label: 'Vector Art', icon: 'shapes' },
  { key: 'collage', label: 'Collage', icon: 'albums' },
  { key: 'neon_sign', label: 'Neon Sign', icon: 'bulb' },
  { key: 'papercraft', label: 'Papercraft', icon: 'newspaper' },
  { key: 'embroidery', label: 'Embroidery', icon: 'heart' },
  { key: 'lego', label: 'LEGO', icon: 'cube' },
  { key: 'felt_puppet', label: 'Felt Puppet', icon: 'paw' },
];

/** Step 3: Subject interest tiles */
export const INTEREST_TILES: { key: SubjectInterest; label: string; icon: string }[] = [
  { key: 'nature', label: 'Nature', icon: 'leaf' },
  { key: 'architecture', label: 'Architecture', icon: 'business' },
  { key: 'sci_fi', label: 'Sci-Fi', icon: 'planet' },
  { key: 'fantasy', label: 'Fantasy', icon: 'sparkles' },
  { key: 'animals', label: 'Animals', icon: 'paw' },
  { key: 'cities', label: 'Cities', icon: 'grid' },
  { key: 'space', label: 'Space', icon: 'rocket' },
  { key: 'oceans', label: 'Oceans', icon: 'water' },
  { key: 'mountains', label: 'Mountains', icon: 'triangle' },
  { key: 'food', label: 'Food', icon: 'restaurant' },
  { key: 'fashion', label: 'Fashion', icon: 'shirt' },
  { key: 'music', label: 'Music', icon: 'musical-notes' },
  { key: 'gaming', label: 'Gaming', icon: 'game-controller' },
  { key: 'sports', label: 'Sports', icon: 'football' },
  { key: 'travel', label: 'Travel', icon: 'airplane' },
  { key: 'abstract', label: 'Abstract', icon: 'color-palette' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
  { key: 'cute', label: 'Cute', icon: 'heart' },
  { key: 'whimsical', label: 'Whimsical', icon: 'balloon' },
  { key: 'pride', label: 'Pride', icon: 'heart-circle' },
];

/** Step 6: Spirit companion tiles */
export const SPIRIT_COMPANIONS: { key: SpiritCompanion; label: string; icon: string }[] = [
  { key: 'fox', label: 'Fox', icon: 'paw' },
  { key: 'cat', label: 'Cat', icon: 'paw' },
  { key: 'owl', label: 'Owl', icon: 'eye' },
  { key: 'dragon', label: 'Dragon', icon: 'flame' },
  { key: 'rabbit', label: 'Rabbit', icon: 'heart' },
  { key: 'wolf', label: 'Wolf', icon: 'moon' },
  { key: 'jellyfish', label: 'Jellyfish', icon: 'water' },
  { key: 'deer', label: 'Deer', icon: 'leaf' },
  { key: 'butterfly', label: 'Butterfly', icon: 'flower' },
  { key: 'robot', label: 'Robot', icon: 'hardware-chip' },
  { key: 'ghost', label: 'Ghost', icon: 'cloudy-night' },
  { key: 'mushroom_creature', label: 'Mushroom', icon: 'nuclear' },
];

/** Minimum selections per step */
export const LIMITS = {
  aesthetics: { min: 3 },
  art_styles: { min: 2 },
  interests: { min: 3 },
} as const;

/** Total steps in the onboarding flow */
export const TOTAL_STEPS = 7;
