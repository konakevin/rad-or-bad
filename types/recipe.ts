/** Continuous axes — each value is a probability bias from 0.0 to 1.0 */
export interface RecipeAxes {
  /** 0 = cool blue/purple, 1 = warm golden/amber */
  color_warmth: number;
  /** 0 = minimalist/simple, 1 = maximalist/detailed */
  complexity: number;
  /** 0 = illustrated/artistic, 1 = photorealistic */
  realism: number;
  /** 0 = calm/serene, 1 = intense/dramatic */
  energy: number;
  /** 0 = dark/moody, 1 = bright/light */
  brightness: number;
  /** 0 = predictable/consistent, 1 = chaotic/surprising */
  chaos: number;
  /** 0 = normal proportions, 1 = full surrealism */
  weirdness: number;
  /** 0 = intimate close-up, 1 = epic wide vista */
  scale: number;
}

/** Color palette preference */
export type ColorPalette =
  | 'warm_sunset' // 🟡🟠🔴
  | 'cool_twilight' // 🔵🟣💜
  | 'earthy_natural' // 🌿🍃💚
  | 'soft_pastel' // 🌸💗🤍
  | 'dark_bold' // ⚫🔴🟡
  | 'monochrome' // ⬛⬜
  | 'sepia' // 📜
  | 'neon' // 💡
  | 'candy' // 🍬
  | 'everything'; // 🌈 random

/** Interest categories the user selected */
export type Interest =
  | 'animals'
  | 'nature'
  | 'fantasy'
  | 'sci_fi'
  | 'architecture'
  | 'fashion'
  | 'food'
  | 'abstract'
  | 'dark'
  | 'cute'
  | 'ocean'
  | 'space'
  | 'whimsical'
  | 'gaming'
  | 'movies'
  | 'music'
  | 'geek'
  | 'sports'
  | 'travel'
  | 'pride';

/** Personality trait tags — injected as adjectives into prompts */
export type PersonalityTag =
  | 'dreamy'
  | 'adventurous'
  | 'cozy'
  | 'edgy'
  | 'romantic'
  | 'mysterious'
  | 'playful'
  | 'fierce'
  | 'peaceful'
  | 'chaotic'
  | 'nostalgic'
  | 'futuristic'
  | 'elegant'
  | 'raw'
  | 'whimsical'
  | 'bold'
  | 'gentle'
  | 'wild';

/** Era / time period — controls the WORLD layer */
export type Era =
  | 'ancient'
  | 'medieval'
  | 'victorian'
  | 'retro'
  | 'modern'
  | 'far_future'
  | 'prehistoric'
  | 'steampunk'
  | 'art_deco'
  | 'synthwave';

/** Setting — controls the WORLD layer */
export type Setting =
  | 'cozy_indoors'
  | 'wild_outdoors'
  | 'city_streets'
  | 'otherworldly'
  | 'beach_tropical'
  | 'mountains'
  | 'underground'
  | 'space'
  | 'village'
  | 'underwater';

/** Scene atmosphere — weather/season/time combos */
export type SceneAtmosphere =
  | 'sunny_morning'
  | 'rainy_afternoon'
  | 'snowy_night'
  | 'foggy_dawn'
  | 'stormy_twilight'
  | 'starry_midnight'
  | 'golden_hour'
  | 'aurora_night';

/** Spirit companion — recurring motif in ~30% of images */
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

/** The complete taste recipe stored in user_recipes.recipe JSONB */
export interface Recipe {
  axes: RecipeAxes;
  interests: Interest[];
  color_palettes: ColorPalette[];
  personality_tags: PersonalityTag[];
  eras: Era[];
  settings: Setting[];
  scene_atmospheres: SceneAtmosphere[];
  spirit_companion: SpiritCompanion | null;
}

/** Default recipe — all axes at 0.5 (neutral), no selections */
export const DEFAULT_RECIPE: Recipe = {
  axes: {
    color_warmth: 0.5,
    complexity: 0.5,
    realism: 0.5,
    energy: 0.5,
    brightness: 0.5,
    chaos: 0.5,
    weirdness: 0.3,
    scale: 0.5,
  },
  interests: [],
  color_palettes: [],
  personality_tags: [],
  eras: [],
  settings: [],
  scene_atmospheres: [],
  spirit_companion: null,
};
