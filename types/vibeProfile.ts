/** Vibe Profile v2 — replaces Recipe as the user's creative identity */

export type Aesthetic =
  | 'cyberpunk'
  | 'cozy'
  | 'liminal'
  | 'brutalist'
  | 'retrofuturism'
  | 'dreamy'
  | 'analog_film'
  | 'surreal'
  | 'cottagecore'
  | 'dark_academia'
  | 'solarpunk'
  | 'vaporwave'
  | 'gothic'
  | 'art_nouveau'
  | 'maximalist'
  | 'minimalist'
  | 'psychedelic'
  | 'steampunk'
  | 'biopunk'
  | 'afrofuturism';

export type ArtStyle =
  | 'oil_painting'
  | 'anime'
  | '35mm_photography'
  | 'watercolor'
  | 'cgi'
  | 'pixel_art'
  | 'claymation'
  | 'pencil_sketch'
  | 'comic_book'
  | 'stained_glass'
  | 'ukiyo_e'
  | 'gouache'
  | 'vector_art'
  | 'collage'
  | 'neon_sign'
  | 'papercraft'
  | 'embroidery'
  | 'lego'
  | 'felt_puppet';

export type SubjectInterest =
  | 'nature'
  | 'architecture'
  | 'sci_fi'
  | 'fantasy'
  | 'animals'
  | 'cities'
  | 'space'
  | 'oceans'
  | 'mountains'
  | 'food'
  | 'fashion'
  | 'music'
  | 'gaming'
  | 'sports'
  | 'travel'
  | 'abstract'
  | 'dark'
  | 'cute'
  | 'whimsical'
  | 'pride';

export type SpiritCompanion =
  | 'fox'
  | 'cat'
  | 'owl'
  | 'dragon'
  | 'rabbit'
  | 'wolf'
  | 'jellyfish'
  | 'deer'
  | 'butterfly'
  | 'robot'
  | 'ghost'
  | 'mushroom_creature';

/** 4 bipolar mood sliders, each 0.0–1.0 */
export interface MoodAxes {
  /** 0 = peaceful, 1 = chaotic */
  peaceful_chaotic: number;
  /** 0 = cute, 1 = terrifying */
  cute_terrifying: number;
  /** 0 = minimal, 1 = maximal */
  minimal_maximal: number;
  /** 0 = realistic, 1 = surreal */
  realistic_surreal: number;
}

/** Free-text personal anchors that make dreams feel uniquely theirs */
export interface PersonalAnchors {
  /** "a place you love" */
  place: string;
  /** "an object you love" */
  object: string;
  /** "an era you vibe with" */
  era: string;
  /** "your dream vibe (one-liner)" */
  dream_vibe: string;
}

/** The complete vibe profile stored in user_recipes.recipe JSONB */
export interface VibeProfile {
  version: 2;
  aesthetics: Aesthetic[];
  art_styles: ArtStyle[];
  interests: SubjectInterest[];
  moods: MoodAxes;
  personal_anchors: PersonalAnchors;
  avoid: string[];
  spirit_companion: SpiritCompanion | null;
}

export const DEFAULT_VIBE_PROFILE: VibeProfile = {
  version: 2,
  aesthetics: [],
  art_styles: [],
  interests: [],
  moods: {
    peaceful_chaotic: 0.5,
    cute_terrifying: 0.3,
    minimal_maximal: 0.5,
    realistic_surreal: 0.5,
  },
  personal_anchors: { place: '', object: '', era: '', dream_vibe: '' },
  avoid: ['text', 'watermarks'],
  spirit_companion: null,
};

/** Prompt mode — adjusts weighting and creative direction */
export type PromptMode =
  | 'dream_me'
  | 'chaos'
  | 'cinematic_poster'
  | 'minimal_mood'
  | 'nature_escape'
  | 'character_study'
  | 'nostalgia_trip';

/** Structured concept output from Pass 1 */
export interface ConceptRecipe {
  subject: string;
  environment: string;
  lighting: string;
  camera: string;
  style: string;
  palette: string;
  twist: string;
  composition: string;
  mood: string;
}
