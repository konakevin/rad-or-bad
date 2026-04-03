/**
 * AUTO-GENERATED from lib/recipe/ modules — keep in sync.
 * DEPLOY COPY for Supabase Edge Functions (Deno runtime).
 *
 * SOURCE OF TRUTH: lib/recipe/types.ts, lib/recipe/pools.ts,
 *                  lib/recipe/utils.ts, lib/recipe/builder.ts
 *
 * DO NOT EDIT DIRECTLY. Run: node scripts/sync-deno-engine.js
 * Generated: 2026-04-03T16:33:48.395Z
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Recipe Types (from types/recipe.ts)
// ═══════════════════════════════════════════════════════════════════════════════

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
  | 'warm_sunset'
  | 'cool_twilight'
  | 'earthy_natural'
  | 'soft_pastel'
  | 'dark_bold'
  | 'monochrome'
  | 'neon'
  | 'ocean_blues'
  | 'jewel_tones';

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
  | 'anime'
  | 'geek'
  | 'horror'
  | 'tattoo_art'
  | 'mythology'
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
  | 'synthwave'
  | 'y2k'
  | 'wild_west'
  | 'mythological'
  | 'fairy_tale'
  | 'post_apocalyptic'
  | 'tropical'
  | 'cyberpunk'
  | 'pirate'
  | 'ancient_egypt'
  | 'samurai'
  | 'underwater_kingdom'
  | 'haunted'
  | 'celestial'
  | 'arctic';

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
  | 'aurora_night'
  | 'moonlit'
  | 'autumn_leaves'
  | 'cherry_blossom'
  | 'sunset_fire'
  | 'overcast'
  | 'tropical_rain'
  | 'misty_forest';

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
  | 'mushroom_creature'
  | 'dog'
  | 'bird'
  | 'octopus'
  | 'phoenix'
  | 'snake'
  | 'bear'
  | 'whale'
  | 'crow'
  | 'turtle'
  | 'horse'
  | 'koi'
  | 'lion'
  | 'penguin'
  | 'bee'
  | 'tiger'
  | 'fairy'
  | 'unicorn'
  | 'mermaid'
  | 'narwhal';

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
  /** Mood keys selected during onboarding — sampled per-dream for axis variety */
  selected_moods?: string[];
  /** Vibe keys selected during onboarding — maps to curated archetype bundles */
  selected_vibes?: string[];
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


// ═══════════════════════════════════════════════════════════════════════════════
// Engine Types (from lib/recipe/types.ts)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recipe Engine — shared types.
 */

export interface TaggedOption {
  text: string;
  axes?: Partial<
    Record<'realism' | 'complexity' | 'energy' | 'color_warmth' | 'brightness', 'high' | 'low'>
  >;
}

export interface PromptInput {
  // TECHNIQUE layer
  medium: string;
  colorKeywords: string;
  weirdnessModifier: string;
  scaleModifier: string;
  // SUBJECT layer
  interests: string[];
  action: string;
  sceneType: string;
  spiritCompanion: string | null;
  spiritAppears: boolean;
  dreamSubject: string;
  // WORLD layer
  eraKeywords: string;
  settingKeywords: string;
  // ATMOSPHERE layer
  mood: string;
  lighting: string;
  personalityTags: string[];
  sceneAtmosphere: string;
}


// ═══════════════════════════════════════════════════════════════════════════════
// Pools (from lib/recipe/pools.ts)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recipe Engine — all data pools (mediums, moods, eras, settings, subjects, etc.)
 */


// ── TECHNIQUE: Medium Pool ──────────────────────────────────────────────────
// Tagged with axes so the engine filters by rolled values.

export const MEDIUM_POOL: TaggedOption[] = [{
    text: 'Pixar-style 3D render, soft rounded shapes, vibrant colors',
    axes: { realism: 'low', energy: 'low' },
  },
  {
    text: 'Studio Ghibli anime watercolor, hand-painted cel animation',
    axes: { realism: 'low', color_warmth: 'high' },
  },
  {
    text: 'adorable chibi kawaii illustration, big sparkly eyes, pastel colors',
    axes: { realism: 'low', brightness: 'high' },
  },
  {
    text: 'oil painting on canvas, visible brushstrokes, impressionist',
    axes: { realism: 'low', complexity: 'high' },
  },
  {
    text: 'papercraft diorama, handmade paper cutouts, miniature',
    axes: { realism: 'low', brightness: 'high' },
  },
  {
    text: 'vintage Disney animation cel, 1950s hand-drawn style',
    axes: { realism: 'low', color_warmth: 'high' },
  },
  {
    text: 'ukiyo-e Japanese woodblock print, flat color, bold outlines',
    axes: { realism: 'low', complexity: 'low' },
  },
  {
    text: 'chalk pastel on black paper, soft edges, dramatic contrast',
    axes: { brightness: 'low', energy: 'high' },
  },
  {
    text: 'claymation stop-motion, visible fingerprint textures in clay',
    axes: {
      realism: 'low',
      complexity: 'low',
      energy: 'low',
      brightness: 'high',
      color_warmth: 'high',
    },
  },
  {
    text: 'retro 1980s airbrush illustration, chrome and gradients',
    axes: { energy: 'high', color_warmth: 'high' },
  },
  {
    text: 'botanical scientific illustration, ink linework with watercolor',
    axes: { complexity: 'high', energy: 'low' },
  },
  {
    text: 'stained glass window, bold black leading, jewel-tone translucent color',
    axes: { brightness: 'high', complexity: 'high' },
  },
  {
    text: 'neon sign art, glowing tube lights on dark brick wall',
    axes: { brightness: 'low', energy: 'high' },
  },
  {
    text: 'low-poly geometric 3D render, faceted surfaces',
    axes: { realism: 'low', complexity: 'low' },
  },
  {
    text: 'pencil sketch with watercolor splashes, loose linework',
    axes: { realism: 'low', complexity: 'low' },
  },
  {
    text: 'fantasy book cover illustration, lush detail, dramatic lighting',
    axes: { complexity: 'high', energy: 'high' },
  },
  {
    text: 'vaporwave digital collage, glitch art, pink and cyan',
    axes: { realism: 'low', energy: 'high' },
  },
  {
    text: 'cross-stitch embroidery on fabric, every element stitched in thread, visible grid texture, framed in a hoop',
    axes: { realism: 'low', complexity: 'low' },
  },
  {
    text: 'everything is shiny molded plastic, like toys in a playset — glossy surfaces, seam lines, injection mold marks',
    axes: { realism: 'low', complexity: 'low', brightness: 'high', color_warmth: 'high' },
  },
  {
    text: 'isometric pixel art, retro game aesthetic, crisp edges',
    axes: { realism: 'low', complexity: 'low' },
  },
  // ── Additional styles for variety ──
  {
    text: 'entire world built from LEGO bricks, everything is LEGO — ground, sky, characters, trees, water — plastic studs visible everywhere',
    axes: {
      realism: 'low',
      complexity: 'low',
      brightness: 'high',
      energy: 'low',
      color_warmth: 'high',
    },
  },
  {
    text: 'LEGO minifigure in a realistic world, tiny plastic character in a real environment',
    axes: { realism: 'high', complexity: 'low', brightness: 'high', energy: 'low' },
  },
  {
    text: '8-bit pixel art, NES color palette, chunky pixels, retro gaming',
    axes: { realism: 'low', complexity: 'low', energy: 'high' },
  },
  {
    text: 'classic Disney 2D animation, clean ink outlines, cel-shaded, 1990s era',
    axes: { realism: 'low', color_warmth: 'high', brightness: 'high' },
  },
  {
    text: 'Tim Burton gothic illustration, spindly limbs, spiral shapes, dark whimsy',
    axes: { realism: 'low', brightness: 'low', energy: 'high' },
  },
  {
    text: 'Wes Anderson symmetrical composition, pastel color palette, dollhouse miniature',
    axes: { realism: 'high', brightness: 'high', complexity: 'high' },
  },
  {
    text: 'vintage travel poster, bold flat shapes, limited color palette, art deco lettering',
    axes: { realism: 'low', complexity: 'low', color_warmth: 'high' },
  },
  {
    text: 'dreamy soft-focus film photography, 35mm grain, light leaks, golden tones',
    axes: { realism: 'high', brightness: 'high', color_warmth: 'high' },
  },
  {
    text: 'comic book art, bold ink outlines, halftone dots, vivid flat colors, dynamic angles',
    axes: { realism: 'low', energy: 'high', complexity: 'low' },
  },
  {
    text: 'felt and fabric diorama, stitched textures, button eyes, handmade craft',
    axes: { realism: 'low', brightness: 'high', energy: 'low' },
  },
  {
    text: 'Muppet-style felt puppet world, fuzzy textures, googly eyes, Jim Henson whimsy',
    axes: { realism: 'low', brightness: 'high', energy: 'high', color_warmth: 'high' },
  },
  {
    text: 'LittleBigPlanet craft world, knitted Sackboy characters, cardboard and sticker scenery, buttons and zippers',
    axes: { realism: 'low', brightness: 'high', energy: 'low', complexity: 'low' },
  },
  {
    text: 'Funko Pop vinyl figure style, oversized head, tiny body, glossy plastic',
    axes: { realism: 'low', complexity: 'low', brightness: 'high', energy: 'low' },
  },
  {
    text: 'cyberpunk neon cityscape style, rain-slicked surfaces, holographic ads',
    axes: { realism: 'high', brightness: 'low', energy: 'high' },
  },
  {
    text: 'Spider-Verse animation style, mixed media, comic dots, paint splatters, dynamic angles',
    axes: { realism: 'low', energy: 'high', brightness: 'high', complexity: 'high' },
  },
  {
    text: 'Tron digital world, glowing neon lines on black, light trails, geometric',
    axes: { realism: 'low', brightness: 'low', energy: 'high', complexity: 'low' },
  },
  {
    text: "gouache painting, thick opaque paint, matte finish, children's book illustration",
    axes: { realism: 'low', brightness: 'high', energy: 'low' },
  },
  {
    text: 'origami paper sculpture, crisp folds, white paper with colored accents',
    axes: { realism: 'low', complexity: 'low', brightness: 'high' },
  },
  {
    text: 'art nouveau style, flowing organic lines, Alphonse Mucha inspired',
    axes: { realism: 'low', complexity: 'high', color_warmth: 'high' },
  },
  {
    text: 'miniature tilt-shift photograph, toy-like depth of field, vivid saturated',
    axes: { realism: 'high', complexity: 'low', brightness: 'high' },
  },
  {
    text: 'Dreamworks animation style, expressive characters, cinematic lighting',
    axes: { realism: 'low', energy: 'high', complexity: 'high' },
  },
  {
    text: 'faded vintage photograph, slightly overexposed, warm nostalgic tones',
    axes: { realism: 'high', brightness: 'high', energy: 'low' },
  },
  // Anime & Japan inspired
  {
    text: 'shonen manga action scene, speed lines, dramatic angles, high energy',
    axes: { realism: 'low', energy: 'high', complexity: 'high' },
  },
  {
    text: 'soft shoujo manga, sparkly eyes, flower petals, gentle pastels',
    axes: { realism: 'low', brightness: 'high', energy: 'low' },
  },
  {
    text: 'Makoto Shinkai style, photorealistic anime backgrounds, dramatic sky',
    axes: { realism: 'high', brightness: 'high', complexity: 'high' },
  },
  {
    text: 'K-pop album cover aesthetic, glossy, soft lighting, pastel gradients',
    axes: { realism: 'high', brightness: 'high', color_warmth: 'low' },
  },
  {
    text: 'voxel 3D art, chunky isometric blocks, Minecraft meets cute',
    axes: { realism: 'low', complexity: 'low', brightness: 'high' },
  },
  {
    text: 'retro anime VHS aesthetic, 1990s cel animation, warm grain, scanlines',
    axes: { realism: 'low', color_warmth: 'high', energy: 'high' },
  },
  // Famous artists
  {
    text: 'Van Gogh Starry Night style, swirling thick brushstrokes, vivid blues and yellows',
    axes: {
      realism: 'low',
      complexity: 'high',
      energy: 'high',
      color_warmth: 'high',
      brightness: 'low',
    },
  },
  {
    text: 'Monet impressionist, soft water lilies, dappled light, dreamy blur',
    axes: {
      realism: 'low',
      brightness: 'high',
      energy: 'low',
      color_warmth: 'high',
      complexity: 'low',
    },
  },
  {
    text: 'Frida Kahlo surrealist style, lush flowers, vivid symbolic colors, folk art motifs',
    axes: {
      realism: 'low',
      complexity: 'high',
      color_warmth: 'high',
      energy: 'low',
      brightness: 'high',
    },
  },
  {
    text: 'Gustav Klimt gold leaf style, ornate patterns, Byzantine mosaic influence',
    axes: {
      complexity: 'high',
      color_warmth: 'high',
      brightness: 'high',
      realism: 'low',
      energy: 'low',
    },
  },
  {
    text: 'Hokusai Great Wave style, Japanese woodblock, dramatic ocean, Mount Fuji',
    axes: { realism: 'low', energy: 'high', color_warmth: 'low' },
  },
  {
    text: 'Bob Ross happy little trees, soft landscape, calm mountains, cabin',
    axes: { realism: 'low', energy: 'low', color_warmth: 'high' },
  },
  // Craft & puppet styles
  {
    text: 'Rankin/Bass stop-motion, classic Christmas special, felt snow and glitter',
    axes: { realism: 'low', brightness: 'high', color_warmth: 'high', energy: 'low' },
  },
  {
    text: 'Aardman claymation, Wallace & Gromit smooth clay, expressive faces',
    axes: { realism: 'low', brightness: 'high', energy: 'low', color_warmth: 'high' },
  },
  {
    text: 'Laika stop-motion, Coraline/Kubo style, dark handcrafted beauty',
    axes: { realism: 'low', brightness: 'low', complexity: 'high', energy: 'high' },
  },
  // Traditional & fine art
  {
    text: 'golden age storybook illustration, Beatrix Potter watercolor, gentle linework',
    axes: { realism: 'low', brightness: 'high', energy: 'low', color_warmth: 'high' },
  },
  {
    text: 'marble sculpture, Michelangelo carved stone, dramatic form',
    axes: { realism: 'high', complexity: 'high', energy: 'high', brightness: 'high' },
  },
  {
    text: 'charcoal drawing on textured paper, smudged dramatic shadows',
    axes: { realism: 'high', brightness: 'low', complexity: 'low', energy: 'high' },
  },
  {
    text: 'tarot card illustration, ornate gold borders, mystical symbolism',
    axes: { realism: 'low', complexity: 'high', brightness: 'low', energy: 'low' },
  },
  // Retro & pop
  {
    text: 'blacklight poster, psychedelic velvet colors glowing in the dark',
    axes: { realism: 'low', brightness: 'low', energy: 'high', color_warmth: 'high' },
  },
  {
    text: 'vintage illustrated comic art, warm hand-drawn linework, soft colors, Calvin & Hobbes warmth',
    axes: { realism: 'low', complexity: 'low', energy: 'low', color_warmth: 'high' },
  },
  {
    text: "children's chalk drawing on sidewalk, colorful and wobbly, puddle reflections",
    axes: { realism: 'low', complexity: 'low', brightness: 'high', energy: 'low' },
  },
  {
    text: 'Looney Tunes cartoon, exaggerated squash and stretch, painted backgrounds, slapstick energy',
    axes: { realism: 'low', energy: 'high', brightness: 'high', color_warmth: 'high' },
  },
  {
    text: '1920s Steamboat Willie style, black and white rubber hose animation, simple shapes',
    axes: { realism: 'low', complexity: 'low', brightness: 'low', energy: 'high' },
  },
  // Art movements// Modern aesthetics
  {
    text: 'cottagecore aesthetic, wildflowers, linen, honey jars, soft pastoral warmth',
    axes: { realism: 'high', energy: 'low', brightness: 'high', color_warmth: 'high' },
  },
  {
    text: 'dark academia aesthetic, leather-bound books, candlelit libraries, autumn tones',
    axes: { realism: 'high', energy: 'low', brightness: 'low', color_warmth: 'high' },
  },
  {
    text: 'solarpunk, lush green futurism, solar panels on organic architecture, optimistic sci-fi',
    axes: { realism: 'high', energy: 'low', brightness: 'high', color_warmth: 'high' },
  },
  {
    text: 'vaporwave aesthetic, pink and cyan gradients, Greek statues, Windows 95, surreal consumerism',
    axes: { realism: 'low', energy: 'low', brightness: 'high', color_warmth: 'low' },
  },
  // Music-inspired
  {
    text: 'lo-fi hip hop album cover, cozy room, warm lighting, anime-inspired chill',
    axes: { realism: 'low', energy: 'low', brightness: 'low', color_warmth: 'high' },
  },
  {
    text: 'heavy metal album cover, dark fantasy, skulls and fire, intricate detail',
    axes: { realism: 'low', energy: 'high', brightness: 'low', complexity: 'high' },
  },
  {
    text: 'Blue Note jazz album cover, bold graphic shapes, smoky atmosphere, cool tones',
    axes: { realism: 'low', energy: 'low', brightness: 'low', color_warmth: 'low' },
  },
  // Famous artists — these route to SDXL and produce stunning painterly results
  {
    text: 'Van Gogh Starry Night style, swirling thick brushstrokes, vivid blues and yellows',
    axes: { realism: 'low', complexity: 'high', energy: 'high', color_warmth: 'high', brightness: 'low' },
  },
  {
    text: 'Monet impressionist, soft water lilies, dappled light, dreamy blur',
    axes: { realism: 'low', brightness: 'high', energy: 'low', color_warmth: 'high', complexity: 'low' },
  },
  {
    text: 'Frida Kahlo surrealist style, lush flowers, vivid symbolic colors, folk art motifs',
    axes: { realism: 'low', complexity: 'high', color_warmth: 'high', energy: 'low', brightness: 'high' },
  },
  {
    text: 'Gustav Klimt gold leaf style, ornate patterns, Byzantine mosaic influence',
    axes: { complexity: 'high', color_warmth: 'high', brightness: 'high', realism: 'low', energy: 'low' },
  },
  {
    text: 'Hokusai Great Wave style, Japanese woodblock, dramatic ocean, bold composition',
    axes: { realism: 'low', energy: 'high', color_warmth: 'low' },
  },
  {
    text: 'Bob Ross happy little trees, soft landscape, calm mountains, warm and gentle',
    axes: { realism: 'low', energy: 'low', color_warmth: 'high' },
  },
  {
    text: 'Dalí melting surrealism, desert dreamscape, impossible objects, time bending',
    axes: { realism: 'low', complexity: 'high', energy: 'low' },
  },
  {
    text: 'Picasso cubist style, fragmented geometric faces, multiple perspectives at once',
    axes: { realism: 'low', complexity: 'high', energy: 'high', brightness: 'low', color_warmth: 'low' },
  },
  // ── New accessible mediums (with axis tags so they get picked) ──
  { text: 'Unreal Engine 5 cinematic render, volumetric lighting, photogrammetry detail', axes: { realism: 'high', complexity: 'high', energy: 'high' } },
  { text: 'infrared photography, white trees, dark skies, otherworldly color palette', axes: { realism: 'high', brightness: 'low', color_warmth: 'low' } },
  { text: 'double exposure photograph, two images merged into one, ghostly overlay', axes: { realism: 'high', complexity: 'high', brightness: 'low' } },
  { text: 'long exposure photography, light trails, silky water, star trails, time compressed', axes: { realism: 'high', energy: 'low', brightness: 'low' } },
  { text: 'cinematic movie still, anamorphic lens flare, film grain, 35mm widescreen', axes: { realism: 'high', energy: 'high', brightness: 'low' } },
  { text: 'glowing neon wireframe on black, Tron-style digital world, geometric light', axes: { realism: 'low', brightness: 'low', energy: 'high', color_warmth: 'low' } },
  { text: 'candy-colored 3D render, glossy plastic, bubblegum pink, soft rounded everything', axes: { realism: 'low', brightness: 'high', color_warmth: 'high', energy: 'low' } },
  { text: 'cute 3D character render, big eyes, tiny body, Funko Pop meets Pixar', axes: { realism: 'low', brightness: 'high', energy: 'low', complexity: 'low' } },
  { text: 'snow globe diorama, tiny world under glass, fake snow, miniature perfection', axes: { realism: 'low', brightness: 'high', color_warmth: 'high', energy: 'low' } },
  { text: 'terrarium world, tiny ecosystem inside glass, moss and mushrooms and mist', axes: { realism: 'low', brightness: 'low', color_warmth: 'high', energy: 'low' } },
  { text: 'needle felt sculpture, soft fuzzy wool texture, handmade, adorable and tactile', axes: { realism: 'low', brightness: 'high', color_warmth: 'high', energy: 'low' } },
  { text: 'pressed flower art, dried botanicals arranged on cream paper, delicate and preserved', axes: { realism: 'low', brightness: 'high', energy: 'low', color_warmth: 'high' } },
  { text: 'sand art in a bottle, layered colored sand forming a landscape, glass container visible', axes: { realism: 'low', brightness: 'high', color_warmth: 'high', complexity: 'low' } },
  { text: 'holographic iridescent style, rainbow reflections on everything, chrome and shimmer', axes: { realism: 'low', brightness: 'high', energy: 'high', color_warmth: 'low' } },
  { text: 'neon sign style but the neon shapes form an entire scene, glowing tubes on dark wall', axes: { brightness: 'low', energy: 'high', color_warmth: 'high' } },
  { text: 'Indian miniature painting, rich detail, gold accents, flat perspective, jewel tones', axes: { realism: 'low', complexity: 'high', color_warmth: 'high', brightness: 'high' } },
  { text: 'Mexican Day of the Dead folk art, sugar skulls, marigolds, vivid celebration colors', axes: { realism: 'low', energy: 'high', brightness: 'high', color_warmth: 'high' } },
  { text: 'Persian illuminated manuscript, intricate borders, lapis and gold, calligraphic beauty', axes: { realism: 'low', complexity: 'high', color_warmth: 'high', energy: 'low' } },
  { text: 'Aboriginal dot painting, earthy colors, ancient patterns, landscape from above', axes: { realism: 'low', complexity: 'high', energy: 'low', color_warmth: 'high' } },
  { text: 'synthwave outrun aesthetic, chrome grid, sunset gradient, palm trees, retro future', axes: { realism: 'low', energy: 'high', brightness: 'low', color_warmth: 'high' } },
  { text: 'dark fantasy concept art, dramatic lighting, epic scale, cinematic composition', axes: { realism: 'high', energy: 'high', brightness: 'low', complexity: 'high' } },
  { text: 'cozy illustration, warm colors, soft edges, the kind of art on a favorite book cover', axes: { realism: 'low', energy: 'low', brightness: 'high', color_warmth: 'high' } },
  { text: 'retro futurism 1960s, space age optimism, bubble helmets, chrome everything', axes: { realism: 'low', energy: 'low', brightness: 'high', color_warmth: 'high' } },
  { text: 'haunted daguerreotype, old photograph, ghostly figures, Victorian era, eerie', axes: { realism: 'high', brightness: 'low', energy: 'low', color_warmth: 'high' } },
  { text: 'embossed leather book cover style, ornate tooling, gold stamping, medieval craftsmanship', axes: { realism: 'low', complexity: 'high', color_warmth: 'high', brightness: 'low' } },
  { text: 'Japanese cherry blossom screen painting, gold leaf background, delicate branches', axes: { realism: 'low', brightness: 'high', color_warmth: 'high', energy: 'low' } },
  { text: 'diorama inside a jar, entire tiny world contained in glass, cork lid, shelf display', axes: { realism: 'low', brightness: 'high', energy: 'low', complexity: 'low' } },
];

// ── ATMOSPHERE: Mood Pool ───────────────────────────────────────────────────

export const MOOD_POOL: TaggedOption[] = [
  // ── Calm + Warm ──
  { text: 'cozy and intimate', axes: { energy: 'low', color_warmth: 'high', brightness: 'low' } },
  {
    text: 'hygge — warm and safe indoors while a storm rages outside, rain on glass, soft light',
    axes: { energy: 'low', color_warmth: 'high', brightness: 'low', complexity: 'low' },
  },
  { text: 'nostalgic and warm', axes: { color_warmth: 'high', energy: 'low', brightness: 'low' } },
  { text: 'tender and gentle', axes: { energy: 'low', color_warmth: 'high', brightness: 'high' } },
  {
    text: 'homesick in the sweetest way',
    axes: { energy: 'low', color_warmth: 'high', complexity: 'low' },
  },
  // ── Calm + Cool ──
  { text: 'serene and vast', axes: { energy: 'low', color_warmth: 'low', brightness: 'high' } },
  {
    text: 'quietly awe-inspiring',
    axes: { energy: 'low', color_warmth: 'low', complexity: 'high' },
  },
  {
    text: 'still and crystalline',
    axes: { energy: 'low', color_warmth: 'low', brightness: 'high' },
  },
  { text: 'meditative and deep', axes: { energy: 'low', color_warmth: 'low', brightness: 'low' } },
  // ── Calm + Bright ──
  { text: 'ethereal and dreamlike', axes: { energy: 'low', brightness: 'high' } },
  {
    text: 'magical and enchanted',
    axes: { energy: 'low', brightness: 'high', complexity: 'high' },
  },
  { text: 'soft and glowing', axes: { energy: 'low', brightness: 'high', complexity: 'low' } },
  // ── Calm + Dark ──
  { text: 'moody and atmospheric', axes: { energy: 'low', brightness: 'low' } },
  {
    text: 'haunting and melancholic',
    axes: { brightness: 'low', energy: 'low', color_warmth: 'low' },
  },
  { text: 'spooky but cute', axes: { brightness: 'low', energy: 'low', color_warmth: 'high' } },
  // ── Playful (mid energy) ──
  {
    text: 'playful and whimsical',
    axes: { energy: 'low', brightness: 'high', color_warmth: 'high' },
  },
  {
    text: 'mischievous and sneaky',
    axes: { energy: 'high', brightness: 'low', color_warmth: 'low' },
  },
  { text: 'silly and absurd', axes: { energy: 'high', brightness: 'high', color_warmth: 'high' } },
  {
    text: 'cheeky and irreverent',
    axes: { energy: 'high', brightness: 'high', complexity: 'low' },
  },
  // ── Intense + Warm ──
  {
    text: 'epic and grandiose',
    axes: { energy: 'high', complexity: 'high', color_warmth: 'high' },
  },
  {
    text: 'triumphant and heroic',
    axes: { energy: 'high', brightness: 'high', color_warmth: 'high' },
  },
  {
    text: 'passionate and fiery',
    axes: { energy: 'high', color_warmth: 'high', brightness: 'low' },
  },
  {
    text: 'luxurious and opulent',
    axes: { complexity: 'high', color_warmth: 'high', brightness: 'high' },
  },
  // ── Intense + Cool ──
  {
    text: 'mysterious and suspenseful',
    axes: { energy: 'high', brightness: 'low', color_warmth: 'low' },
  },
  {
    text: 'electric and charged',
    axes: { energy: 'high', color_warmth: 'low', brightness: 'high' },
  },
  {
    text: 'surreal and otherworldly',
    axes: { energy: 'high', complexity: 'high', color_warmth: 'low' },
  },
  { text: 'chaotic and energetic', axes: { energy: 'high', color_warmth: 'low' } },
  // ── Intense + Dark ──
  {
    text: 'dramatic and cinematic',
    axes: { energy: 'high', brightness: 'low', complexity: 'high' },
  },
  {
    text: 'ominous and foreboding',
    axes: { energy: 'high', brightness: 'low', color_warmth: 'low' },
  },
  // ── Complex / Simple ──
  { text: 'intricate and layered', axes: { complexity: 'high', energy: 'low' } },
  { text: 'clean and minimal', axes: { complexity: 'low', brightness: 'high', energy: 'low' } },
];

// ── ATMOSPHERE: Lighting Pool ───────────────────────────────────────────────

export const LIGHTING_POOL: TaggedOption[] = [
  { text: 'warm candlelight', axes: { color_warmth: 'high', brightness: 'low' } },
  { text: 'golden hour sunlight', axes: { color_warmth: 'high', brightness: 'high' } },
  { text: 'soft overcast diffused light', axes: { brightness: 'high', energy: 'low' } },
  { text: 'neon city glow', axes: { color_warmth: 'low', brightness: 'low' } },
  { text: 'cool blue moonlight', axes: { color_warmth: 'low', brightness: 'low' } },
  { text: 'dramatic backlight silhouette', axes: { energy: 'high', brightness: 'low' } },
  { text: 'dappled light through leaves', axes: { color_warmth: 'high', brightness: 'high' } },
  { text: 'firelight with dancing shadows', axes: { color_warmth: 'high', brightness: 'low' } },
  { text: 'bioluminescent ambient glow', axes: { color_warmth: 'low', brightness: 'low' } },
  { text: 'aurora borealis light', axes: { color_warmth: 'low', energy: 'high' } },
  { text: 'foggy diffused streetlight', axes: { brightness: 'low', energy: 'low' } },
  { text: 'studio Rembrandt lighting', axes: { energy: 'high', brightness: 'low' } },
  {
    text: 'laser light show, colorful beams cutting through haze',
    axes: { energy: 'high', brightness: 'high' },
  },
  {
    text: 'underwater caustics, rippling light patterns on surfaces',
    axes: { color_warmth: 'low', energy: 'low' },
  },
  {
    text: 'lava glow, deep red-orange light from below',
    axes: { color_warmth: 'high', energy: 'high' },
  },
  {
    text: 'christmas lights bokeh, warm multicolor twinkle',
    axes: { color_warmth: 'high', brightness: 'high' },
  },
  {
    text: 'black light UV glow, neon colors popping against darkness',
    axes: { brightness: 'low', energy: 'high' },
  },
  {
    text: 'sunrise through stained glass, colored light beams',
    axes: { color_warmth: 'high', brightness: 'high' },
  },
];

// ── WORLD: Era keywords ─────────────────────────────────────────────────────

export const ERA_KEYWORDS: Record<string, string[]> = {
  prehistoric: [
    'prehistoric world, cave paintings, volcanoes, giant creatures, primal',
    'primordial swamp, ferns taller than trees, amber sunlight, ancient insects',
    'ice age tundra, woolly mammoths, glaciers creaking, vast frozen plains',
    'volcanic landscape, obsidian cliffs, lava rivers, smoke-filled sky',
  ],
  ancient: [
    'ancient civilization, stone and bronze, weathered ruins',
    'crumbling temple columns, overgrown with vines, offerings at the altar',
    'ancient marketplace, clay pots, woven baskets, dusty desert streets',
    'stone monoliths at twilight, ritual circle, carved runes glowing faintly',
  ],
  medieval: [
    'medieval fantasy, stone castles, candlelit, hand-forged',
    'medieval village at harvest time, thatched roofs, woodsmoke, lanterns',
    'knight tournament grounds, banners snapping in wind, armor glinting',
    'monastery scriptorium, illuminated manuscripts, quill and ink, quiet stone halls',
  ],
  victorian: [
    'Victorian era, ornate brass and dark wood, gas lamps, lace',
    'Victorian parlor, velvet curtains, grandfather clock, tea set on doily',
    'foggy London street, cobblestones, horse-drawn carriages, chimney smoke',
    'Victorian greenhouse, iron frame, exotic plants, condensation on glass panes',
  ],
  steampunk: [
    'steampunk Victorian, brass gears, airships, clockwork mechanisms, steam',
    'steampunk workshop, copper pipes hissing, blueprints pinned to walls, goggles',
    'airship deck above the clouds, brass telescope, leather and rivets',
    'clockwork city, steam vents in streets, mechanical birds, gear-tower skyline',
  ],
  art_deco: [
    '1920s art deco, jazz age, gold and black geometry, Great Gatsby glamour',
    'art deco ballroom, geometric chandeliers, marble floors, champagne tower',
    'art deco skyscraper lobby, sunburst elevator doors, terrazzo and chrome',
    '1920s speakeasy, hidden door, smoky jazz club, beaded curtains, cocktails',
  ],
  retro: [
    'retro 1950s-70s, mid-century modern, vintage colors, analog',
    '1950s diner, chrome stools, jukebox glowing, checkered floor, milkshakes',
    '1970s living room, shag carpet, wood paneling, lava lamp, vinyl records',
    'retro drive-in theater, classic cars, giant screen, popcorn and starlight',
  ],
  synthwave: [
    '1980s synthwave, neon grid, palm trees, sunset gradient, VHS aesthetic',
    'retro arcade at midnight, CRT screens glowing, quarters on the cabinet',
    '80s mall atrium, escalators, neon signs, fountain, rollerskating',
    'VHS tape world, tracking lines, chromatic aberration, analog warmth',
  ],
  modern: [
    'contemporary modern, clean lines, current day',
    'minimalist loft apartment, concrete and glass, single plant, afternoon light',
    'modern coffee shop, exposed brick, laptop glow, rain on windows',
    'rooftop terrace at sunset, skyline view, string lights, modern furniture',
  ],
  far_future: [
    'far future sci-fi, holographic, chrome and glass, alien tech',
    'orbital space station, curved white corridors, holographic displays, Earth below',
    'biopunk megacity, living architecture, organic tech, glowing vein-like streets',
    'post-singularity garden, crystalline structures, data streams as waterfalls',
  ],
  y2k: [
    'Y2K aesthetic, frosted glass, metallic textures, butterfly clips, iridescent everything',
    'early 2000s internet cafe, chunky monitors, neon mouse pads, AIM chat windows',
    'chrome and translucent plastic everything, iMac colors, bubble shapes, optimistic future',
    'mall at the millennium, fountain, food court glow, escalators, peak consumerism',
  ],
  wild_west: [
    'dusty frontier town at high noon, saloon doors swinging, tumbleweeds, golden desert light',
    'cowboy campfire under a million stars, canyon walls glowing orange, horse silhouettes',
    'train robbery in progress, steam locomotive, desert canyon, bandits on horseback',
    'ghost town at sunset, abandoned buildings, creaking signs, dust devils, eerie beauty',
  ],
  mythological: [
    'Mount Olympus above the clouds, marble temples, gods lounging, lightning in the distance',
    'Norse Valhalla, golden hall, feasting warriors, Bifrost rainbow bridge across the sky',
    'Egyptian underworld, jackal-headed gods, golden scales, hieroglyphic walls glowing',
    'Japanese spirit world, torii gates floating in mist, fox spirits, paper lanterns, cherry blossoms',
  ],
  fairy_tale: [
    'enchanted fairy tale forest, glass slippers on moss, pumpkin carriage, wishing well',
    'candy cottage in a gingerbread wood, frosting on the roof, gumdrop path, sugar plum trees',
    'fairy tale castle on a cloud, rainbow bridge, singing birds, golden turrets',
    'enchanted mirror showing another world, rose petals falling, spinning wheel in the corner',
  ],
  post_apocalyptic: [
    'overgrown city ruins, vines on skyscrapers, deer walking on cracked highways, nature reclaiming',
    'rust and wildflowers, an abandoned gas station with a tree growing through the roof, golden light',
    'flooded city streets reflecting a clear sky, boats tied to street signs, fish in lobbies',
    'a lone figure walking a highway through endless desert, the skyline of a dead city on the horizon',
  ],
  tropical: [
    'lush tropical jungle, toucans, massive leaves, waterfall into a turquoise pool, humidity visible',
    'tiki bar at sunset, bamboo and string lights, ocean view, cocktails with tiny umbrellas',
    'tropical island from above, white sand ring, palm trees, the water every shade of blue and green',
    'bioluminescent tropical bay at night, kayak cutting through glowing water, stars above, palm silhouettes',
  ],
  cyberpunk: [
    'rain-soaked neon city at night, holographic billboards, flying cars, puddle reflections doubling everything',
    'a ramen stall under a massive corporate tower, steam mixing with neon, chopsticks mid-slurp',
    'rooftop overlooking a megacity, someone in a hooded jacket, drones delivering packages, sunset through smog',
    'underground hacker den, screens everywhere, neon wires, a cat on the keyboard, energy drinks stacked',
  ],
  pirate: [
    'pirate ship cresting a massive wave at sunset, black flag snapping, crew bracing, gold light on sails',
    'treasure cave, gold coins piled to the ceiling, a single shaft of light from above, chest overflowing',
    'port town at dusk, ships in harbor, taverns glowing, rope bridges between masts, sea shanty energy',
    'underwater shipwreck, coral growing on cannons, fish swimming through portholes, treasure scattered on sand',
  ],
  ancient_egypt: [
    'pyramids at golden hour, the Sphinx casting a long shadow, desert stretching to infinity',
    'inside a pharaoh tomb, hieroglyphics glowing gold, sarcophagus, canopic jars, torchlight on painted walls',
    'Nile river at dawn, papyrus boats, temples on the bank, ibis birds, morning mist on the water',
    'an Egyptian temple interior, massive columns carved with gods, sunlight cutting through in beams, incense',
  ],
  samurai: [
    'samurai standing in a cherry blossom storm, katana drawn, petals catching on the blade',
    'Japanese castle at dusk, koi pond, stone lanterns, a single figure meditating on the bridge',
    'bamboo forest duel, two swords, rain falling, the moment before the clash, everything still',
    'a ronin walking a mountain path in autumn, red and gold leaves, distant temple bells, mist rising',
  ],
  underwater_kingdom: [
    'an underwater palace of coral and pearl, fish swimming through archways, bioluminescent chandeliers',
    'a sunken city on the ocean floor, marble columns encrusted with sea life, shafts of light from above',
    'a mermaid throne room carved from a giant shell, seahorse guards, jellyfish lanterns',
    'a deep ocean trench kingdom, glowing creatures, volcanic vents, an entire civilization in darkness',
  ],
  haunted: [
    'a haunted Victorian mansion, every window glowing a different color, fog rolling across the lawn',
    'a graveyard at midnight, iron fence, crooked headstones, a single lantern floating between the graves',
    'an abandoned asylum hallway, peeling paint, one wheelchair, moonlight through broken windows',
    'a ghost ship drifting through fog, tattered sails, spectral crew visible through the hull, green glow',
  ],
  celestial: [
    'a palace in the clouds, golden light streaming through marble columns, angels in silhouette',
    'a staircase ascending through layers of cloud into pure golden light, each step more luminous',
    'a celestial garden where the flowers are made of starlight and the trees bear glowing fruit',
    'the edge of heaven looking down at Earth, aurora curtains, a figure with wings of pure light',
  ],
  arctic: [
    'an ice palace with walls of frozen crystal, northern lights visible through the translucent ceiling',
    'a frozen tundra at dawn, ice formations catching pink and gold light, absolute silence',
    'a polar expedition camp, tents glowing warm against endless white, dog sled tracks in fresh snow',
    'an ice cave interior, blue glacial walls, light refracting through frozen waterfalls, other-worldly',
  ],
};

// Bonus era vibes mixed in randomly
export const BONUS_ERAS = [
  '1920s art deco, jazz age, gold and black, Great Gatsby glamour',
  '1980s synthwave, VHS tracking lines, palm trees, sunset gradient',
  'wild west frontier, dusty saloons, tumbleweeds, golden desert light',
  'roaring 1960s space age, atomic design, googie architecture',
  'Pan Am jet age poster, glamorous air travel, exotic destinations, retro illustration',
  '1950s Americana, chrome bumpers, sock hops, soda fountain',
  '1960s mod London, Twiggy, op art, Carnaby Street, mini Cooper',
  'Y2K aesthetic, frosted glass, metallic textures, butterfly clips',
  'prehistoric, cave paintings, volcanoes, giant creatures',
  'steampunk Victorian, brass gears, airships, clockwork',
  '1970s disco fever, mirror balls, hot pink and orange, sequins and velvet',
  'cyberpunk neon Tokyo, holographic signs, rain-slicked streets, electric blue',
  'cottagecore fairytale, wildflowers, thatched roofs, golden hour glow',
  'steampunk industrial revolution, brass gears, copper pipes, Victorian shadows',
  'Y2K maximalism, frosted tips energy, hot topic aesthetic, chrome and lime green',
  'film noir 1940s, venetian blinds shadows, fedoras, smoky jazz clubs',
  'cosmic retro-futurism, atomic starbursts, space age chrome, pastel planets',
  'dark academia gothic, leather-bound books, candlelit libraries, burgundy and gold',
  'maximalist Memphis design, geometric chaos, bold squiggles, clashing neons',
  'ancient Rome imperial luxury, marble columns, gold leaf, dusty amphitheaters',
  '80s Miami Vice, pastel suits, speedboats, ocean spray and neon flamingos',
  'medieval fantasy forest, moss-covered stones, glowing mushrooms, candlelit castles',
  'Soviet brutalism, concrete geometry, cold grays, hammer and sickle symbolism',
  'bohemian 60s counterculture, tie-dye spiral, flower crowns, psychedelic haziness',
  'gothic Victorian steampunk, ornate clockwork, gas lamps, rust and burgundy',
  'tropical tiki culture, bamboo and rattan, pink sunsets, mai tai vibes',
  'retro futurism 1950s, chrome rockets, pastel diners, atomic optimism',
  'medieval witchcraft, candlelit potions, grimoire pages, deep purples and blacks',
  'analog VHS horror, grain and distortion, red warning lights, 90s fear',
  'art nouveau belle époque, flowing curves, botanical designs, jewel tones and gold',
];

// ── WORLD: Setting keywords ─────────────────────────────────────────────────

export const SETTING_KEYWORDS: Record<string, string[]> = {
  cozy_indoors: [
    'cozy interior, warm room, furniture, shelves, windows',
    'reading nook with stacked blankets, lamp glow, rain on the window',
    'cluttered artist studio, paint-splattered table, warm afternoon light',
    'kitchen at dawn, steam from a mug, fruit on the counter, quiet morning',
    'attic room with sloped ceiling, fairy lights, old trunk, skylight',
  ],
  wild_outdoors: [
    'outdoor wilderness, forests, mountains, open sky, natural landscape',
    'mossy old-growth forest, filtered sunlight, mushrooms on fallen logs',
    'windswept prairie, tall grass rolling like waves, storm on the horizon',
    'ancient redwood grove, shafts of golden light, ferns carpeting the floor',
    'alpine wildflower meadow, snow-capped peaks beyond, clear blue sky',
  ],
  city_streets: [
    'urban cityscape, streets, buildings, signs, architecture',
    'rain-slicked city alley at night, puddle reflections, fire escape above',
    'bustling market street, awnings and carts, crowd of silhouettes',
    'rooftop view of the city at golden hour, water towers, distant bridges',
    'quiet side street, brownstone stoops, bicycle chained to a railing, dusk',
  ],
  beach_tropical: [
    'tropical beach, palm trees, turquoise water, golden sand, warm breeze',
    'hidden cove, sea glass and driftwood, gentle waves, cliffs on each side',
    'tidal pools at sunset, starfish and anemones, warm rocks, orange sky',
    'beach bonfire at night, sparks rising, waves lapping, stars overhead',
    'hammock between palm trees, coconut drinks, crystal clear lagoon',
  ],
  mountains: [
    'mountain peaks, alpine meadows, rocky trails, snow caps, vast sky',
    'misty mountain pass, narrow trail, prayer flags, clouds below',
    'mountain lake at dawn, mirror reflection, pine trees, absolute stillness',
    'exposed ridge above treeline, wind-scoured rock, 360-degree panorama',
    'cozy mountain cabin, wood smoke, snow outside, warm light inside',
  ],
  underwater: [
    'deep underwater, coral reefs, fish, light rays from surface, bubbles',
    'kelp forest, sunlight filtering through swaying fronds, sea otters',
    'deep ocean trench, bioluminescent creatures, impossible darkness below',
    'shallow reef, tropical fish, sea turtle gliding past, crystal clear water',
    'sunken shipwreck overgrown with coral, fish swimming through portholes',
  ],
  underground: [
    'underground cavern, crystals, glowing mushrooms, stalactites, hidden world',
    'abandoned mine shaft, old rail cart, lantern light, gem veins in the walls',
    'vast underground lake, perfectly still water, dripping echoes, faint glow',
    'root-woven tunnel beneath an ancient tree, earth smells, tiny creatures',
    'crystal grotto, rainbow light refracting through mineral formations',
  ],
  village: [
    'charming village, cobblestone streets, market square, lanterns, quaint shops',
    'fishing village at dawn, boats rocking in harbor, nets drying, seagulls',
    'hilltop village, terracotta roofs, winding stairs, bougainvillea on walls',
    'winter village, snow on rooftops, warm light in windows, chimney smoke',
    'canal village, narrow bridges, flower boxes, reflections in still water',
  ],
  space: [
    'outer space, stars, nebula, zero gravity, Earth in the distance',
    'asteroid field, tumbling rocks, distant planet rings, starship debris',
    'space station cupola, Earth filling the window, instruments floating',
    'surface of an alien moon, strange horizon, gas giant looming above',
    'inside a nebula, swirling purple and gold gas, newborn stars sparkling',
  ],
  otherworldly: [
    'otherworldly realm, floating islands, impossible geometry, alien landscape',
    'dream dimension, gravity shifts mid-scene, staircases going in every direction',
    'spirit realm, translucent trees, glowing pathways, echo of distant bells',
    'between-worlds void, fragments of different realities drifting past',
    'living landscape, the ground breathes, clouds have faces, rivers flow upward',
  ],
};

// Pop culture and iconic locations — randomly mixed in for fun variety
export const BONUS_SETTINGS = [
  'hobbit village with round green doors, rolling hills, the Shire',
  'frozen ice planet, AT-AT walkers in distance, Hoth-style snowfield',
  'neon-lit rain-soaked cyberpunk alley, flying cars above, Blade Runner vibes',
  'underwater coral kingdom, SpongeBob-style pineapple houses',
  'blocky Minecraft-style landscape, pixelated trees and square clouds',
  'Hogwarts castle corridors, floating candles, moving portraits',
  'mushroom kingdom, green pipes, floating question-mark blocks',
  'Jurassic jungle, massive ferns, dinosaur silhouettes in the mist',
  'inside a pinball machine, bumpers and flashing lights everywhere',
  'Tokyo neon street at night, anime billboards, cherry blossoms falling',
  'inside a snow globe, tiny village, glitter falling',
  'candy land, gumdrop trees, chocolate rivers, waffle cone mountains',
  'retro arcade, rows of glowing cabinets, pixel art on every screen',
  'space station interior, zero gravity, Earth visible through window',
  'enchanted library, books flying off shelves, spiral staircase',
  'giant kitchen, everything oversized, tiny characters on the countertop',
  'inside a fishbowl looking out, distorted glass edges',
  'rooftop garden above the clouds, city far below',
  'pirate ship deck during a storm, lightning, crashing waves',
  'haunted mansion ballroom, ghostly dancers, cobwebs, chandelier',
  'inside a music box, tiny spinning dancer, mechanical gears visible',
  'treehouse village connected by rope bridges, lantern-lit at dusk',
  'laundromat at 2am, flickering fluorescent lights, one machine spinning',
  'ancient Egyptian tomb, hieroglyphics glowing, golden artifacts',
  'Willy Wonka chocolate factory, candy pipes, oompa loompa scale',
  'drive-in movie theater at night, classic cars, giant screen glowing',
  'Japanese zen garden, raked sand, stone lanterns, koi pond',
  'roller coaster mid-loop, amusement park lights below',
  'backstage at a rock concert, amps, cables, spotlight leak',
  // Pop culture iconic locations
  'Bikini Bottom underwater, SpongeBob-style pineapple and Easter Island heads',
  'the Shire, round hobbit doors, rolling green hills, party tree',
  'Hoth ice planet, AT-AT walkers, rebel base carved in ice',
  'inside the Matrix, green code rain, rooftop fight',
  'Hogwarts Great Hall, floating candles, enchanted ceiling showing night sky',
  'Jurassic Park gate, dense jungle, dinosaur footprint in mud',
  'Willy Wonka chocolate room, chocolate waterfall, edible everything',
  'NeverEnding Story Falkor flying through clouds, Ivory Tower in distance',
  'Dark Crystal world, Aughra observatory, crystal shard glowing',
  'Muppet Theater backstage, Kermit at the curtain, felt chaos everywhere',
  'LittleBigPlanet level, cardboard platforms, sticker decorations, yarn and buttons',
  'Land Before Time Great Valley, lush ferns, gentle dinosaurs, golden sunset',
  'a library where the books whisper and pages flutter on their own',
  'a night market floating on lantern-lit boats',
  'inside a giant clockwork mechanism, gears turning slowly',
  'a greenhouse on the moon, plants growing in low gravity',
  'an abandoned amusement park being reclaimed by nature',
  'Princess Bride cliffs of insanity, fire swamp, miracle Max cottage',
  'Tron digital grid, glowing blue lines, light cycles',
  'Pandora bioluminescent forest, floating mountains, six-legged creatures',
  'Bag End interior, round windows, maps on walls, fireplace',
  'Gotham City rooftop at night, bat signal in clouds',
  'Mushroom Kingdom, warp pipes, floating coin blocks, castle in distance',
  'Minecraft village at sunset, blocky villagers, iron golem patrol',
  'Pokémon tall grass, starter creatures peeking out, pokeball on ground',
  'Animal Crossing island, museum, Nook shop, campsite',
  'Death Star trench run, turbolaser fire, exhaust port ahead',
  'Mordor, Mount Doom glowing in distance, dark volcanic wasteland',
  // Anime & Japan locations
  'Tokyo crossing at night, Shibuya style, neon reflections on wet pavement',
  'Japanese cherry blossom tunnel, pink petals falling like snow',
  'anime school rooftop at golden hour, fence, distant cityscape',
  'ramen shop at midnight, steam rising, lantern light, cozy counter seats',
  'Spirit World bathhouse, ornate Japanese architecture, mysterious fog',
  'neon-lit Korean street, food stalls, hangul signs, steam and lights',
  'bamboo forest path in Kyoto, sunbeams filtering through',
  'anime train crossing at sunset, railroad signal blinking',
  'K-pop concert stage, ocean of lightsticks, confetti, LED screens',
  // Famous landmarks & tourist destinations
  'Eiffel Tower at night, twinkling lights, Seine river below',
  'Grand Canyon at sunrise, vast layered red rock, golden light',
  'Northern Lights over Iceland, purple green ribbons, snow field',
  'Venice canals at golden hour, gondolas, pastel buildings, reflections',
  'Machu Picchu in morning mist, ancient stone terraces, llamas',
  'Great Barrier Reef underwater, colorful coral, tropical fish',
  'Santorini white and blue domes, Aegean Sea, sunset',
  'Taj Mahal at dawn, mirror pool, pink sky',
  'Yellowstone hot spring, prismatic colors, steam rising',
  'Disneyland castle at night, fireworks, fairy lights everywhere',
  'Hawaiian volcanic beach, black sand, palm trees, turquoise water',
  'Swiss Alps meadow, wildflowers, snow-capped peaks, wooden chalet',
  'Bali rice terraces, lush green steps, tropical mist',
  'New York City Times Square, neon billboards, yellow taxis, rain',
  'Great Wall of China at autumn, golden leaves, misty mountains',
  'Safari savanna at sunset, acacia trees, silhouette of elephants',
  'Maldives overwater bungalow, crystal clear turquoise lagoon',
  'Redwood forest, massive ancient trees, shafts of light, ferns',
  'Niagara Falls rainbow mist, thundering water, viewing deck',
  'Kyoto temple garden, raked zen sand, red maple, koi pond',
  'Cappadocia hot air balloons at dawn, fairy chimneys below',
  'Cinque Terre colorful cliffside village, boats in harbor',
  'Yosemite valley, El Capitan, waterfall, pine forest',
  'Caribbean beach, hammock between palm trees, turquoise water, sunset',
  'Petra treasury carved in rose-red cliff, narrow canyon approach',
  'Aurora Borealis over Norwegian fjord, still water reflections',
  'Angkor Wat temple at sunrise, lotus pond, ancient stone faces',
  'Banff Lake Louise, turquoise glacier lake, mountain reflection',
  'Amalfi Coast winding road, cliffside lemons, blue Mediterranean',
  // Space & planets
  'Mars red desert, rusty dunes, tiny rover tracks, pink sky, two moons',
  'surface of the Moon, grey craters, Earth rising on the horizon',
  'Jupiter storm clouds up close, swirling red and orange gas bands',
  'Saturn rings, walking on an icy moon, rings filling the sky',
  'Pluto ice plains, heart-shaped glacier, dim distant sun',
  'Europa ice surface, cracks revealing blue ocean glow underneath',
  'Titan methane lake shore, orange hazy sky, Saturn in the distance',
  'asteroid belt, hopping between floating rocks, stars everywhere',
  'nebula nursery, inside colorful gas clouds, baby stars forming',
  'binary sunset, two suns setting over alien desert, long shadows',
  'space elevator view, Earth below, stars above, glass tube ascending',
  'comet tail ride, icy debris sparkling, sun glare in distance',
  'abandoned subway station overgrown with bioluminescent plants, neon graffiti glowing on tiles',
  'Parisian café where the ceiling rains upward into clouds of pastry crumbs',
  'inside a grandfather clock, gears turning slowly, tiny rooms in each chamber',
  'desert oasis with impossible architecture, towers made of crystallized water',
  'Victorian mansion where stairs lead to different seasons in each room',
  'coral reef city with dome structures, fish swimming between buildings',
  'endless candy factory with rivers of caramel, mountains of spun sugar',
  'moonlit Japanese garden bridge, koi fish that glow, bamboo forest reflections',
  'dystopian cyberpunk alleyway, holographic rain, neon kanji characters floating',
  'enchanted forest where trees have faces, glowing mushrooms as streetlights',
  'floating islands connected by rope bridges, waterfalls flowing upward',
  'retro 1950s diner, chrome everything, jukebox playing backwards',
  'ancient Egyptian temple at sunset, hieroglyphics that shimmer gold',
  'underwater city of coral and pearls, bioluminescent jellyfish streetlights',
  'steampunk airship dock, brass pipes and steam clouds, propellers spinning overhead',
  'infinity library where shelves curve into impossible dimensions',
  'volcanic landscape with rivers of liquid ruby, obsidian cliffs',
  'cozy cottage interior with fireplace, autumn leaves swirling indoors',
  'Las Vegas strip made of candy glass, slot machines with spinning hearts',
  'enchanted castle courtyard, roses blooming impossibly fast, marble fountains',
  'Grecian ruins overgrown with ivy, statues that shift slightly when not looking',
  'forest cathedral made of massive hollow trees, stained glass windows of leaves',
  'arctic ice palace with aurora borealis indoors, icicle chandeliers',
  'gothic clockmaker workshop, clocks showing different times, gears visible in walls',
  'tropical island market at dusk, lanterns hanging everywhere, fruits glowing',
  'abandoned amusement park reclaimed by nature, ferris wheel wrapped in vines',
  'Scandinavian wooden village, snow on every surface, warm golden windows',
  'alien bazaar with impossible geometries, merchants selling bottled starlight',
  'Art Deco theater interior, red velvet curtains, art deco patterns everywhere',
  'crystalline cave system with underground lake reflecting chandelier lights',
  'medieval blacksmith forge, molten metal flowing like rivers, sparks floating upward',
  'botanical garden greenhouse with flowers that bloom in fast-forward',
  'film noir city street, rain reflecting neon, vintage cars parked',
  'giant library treehouse, suspended bridges between enormous branches',
  'bioluminescent swamp, cypress trees glowing, will-o-wisps dancing',
  'antique curiosity shop where every object has a tiny universe inside',
  'underwater kelp forest with wooden ship wreck, jellyfish as lanterns',
  'Art Nouveau train station, curved metal arches, stained glass skylights',
  'arctic research station at night, aurora borealis reflected in icy ground',
  'baroque church interior, gold everywhere, candlelight multiplied infinitely',
  'mysterious bazaar in clouds, floating market stalls, merchants made of mist',
  'retro arcade, pixel art on walls, neon glow, high score boards glowing',
  'hidden valley surrounded by impossible mountains, waterfalls on every cliff',
  'ancient library at Alexandria, endless scrolls, soft amber lighting',
  'space station corridor, windows showing different planets, floating debris',
  'magical apothecary shop, potion bottles glowing, dried herbs hanging',
  'jungle temple covered in moss, stone faces emerging from vines',
  'vintage ice skating rink, art deco styling, frozen chandelier overhead',
  'abandoned fairground at twilight, carousel horses still moving slightly',
  'underwater shipwreck with bioluminescent organisms, treasure glinting',
  'misty Japanese tea house, tatami mats, rain on paper screens',
  'mountain monastery perched impossibly high, prayer flags everywhere',
  'crystalline castle made entirely of ice and frozen light',
  'enchanted garden maze where paths rearrange, flowers whisper directions',
  'vintage roller skating venue, 1970s aesthetic, mirrored disco ball',
  'meteorite crater with impossible plantlife, alien rock formations',
  'gothic bookbinding workshop, leather and gold everywhere, candlelight',
  'underwater coral palace, pearl inlays, soft bioluminescent glow',
  'steampunk marketplace, brass cogs visible everywhere, steam hissing',
  'ancient Mayan pyramid interior, torchlit, stone glyphs catching firelight',
  'enchanted greenhouse where plants rearrange themselves nightly',
  'film set wasteland, half-built sets, dramatic lighting, dust particles',
  'nebula observatory, telescope pointing at swirling cosmic colors',
  'Victorian garden maze, hedges taller than buildings, secret grottos',
  'underground city carved from single crystal, light refracting everywhere',
  'Art Deco subway car frozen in time, chrome and geometric patterns',
  'forest of giant mushrooms, spore clouds glowing, impossible biology',
  'marble Roman bathhouse, steam rising, columns reflected in still water',
  'abandoned fairytale theme park, castles rotting beautifully, magic still visible',
  'bioluminescent mushroom forest, glowing in gradient colors, misty air',
  'retro space station from old sci-fi film, analog dials, red warning lights',
  'secret library behind bookshelf, dust motes floating in lamplight',
  'volcanic island with black sand beaches, ruby cliffs, lava-glow horizon',
  'Moroccan riad courtyard, intricate tile patterns, fountain, lanterns',
  'sunken ship graveyard in crystal clear water, fish weaving through ruins',
  'Victorian greenhouse with impossible plants, glass panes fogging',
  'carnival at night, carousel spinning, kaleidoscope of lights',
  'ancient stone circle at midnight, stones slightly humming, stars perfectly aligned',
  'jade temple interior, green light filtering through carved stone',
  'arctic glacier cave, blue ice reflecting white light, perfect silence',
  'enchanted ballroom where chandelier is made of crystallized music',
  'dystopian megacity rooftop garden, plants growing on skyscrapers',
  'impossible staircase in clouds, made of solidified vapor, endless ascent',
  'witch',
  'Anime school rooftop during golden hour with cherry blossoms',
  'Dimly lit ramen shop with steaming bowls and neon signs',
  'Winding stone path up to a traditional Japanese shrine',
  'Bustling night market with paper lanterns and food stalls',
  'Video game save point glowing in a dark dungeon',
  'Cozy inn lobby with fireplace and wooden beams',
  'Boss arena with crystalline floor and swirling magic',
  'Valhalla',
];

// ── ATMOSPHERE: Scene atmosphere keywords ────────────────────────────────────

export const SCENE_ATMOSPHERE_KEYWORDS: Record<string, string> = {
  sunny_morning: 'bright morning sunlight, dew, fresh, long shadows',
  rainy_afternoon: 'rain falling, wet surfaces, reflections in puddles, overcast',
  snowy_night: 'fresh snow, cold blue night, snowflakes, frost on everything',
  foggy_dawn: 'thick fog, pre-dawn grey light, silhouettes emerging from mist',
  stormy_twilight: 'dramatic storm clouds, purple twilight sky, wind, lightning in distance',
  starry_midnight: 'clear night sky full of stars, milky way, deep blue darkness',
  golden_hour: 'golden hour warm light, long shadows, everything glowing amber',
  aurora_night: 'northern lights in sky, green and purple aurora, snow-covered ground',
  moonlit: 'bright full moon, silver light on everything, sharp shadows, cool blue glow',
  autumn_leaves: 'fiery red orange gold leaves falling, crisp air, warm afternoon light through branches',
  cherry_blossom: 'pink cherry blossom petals drifting like snow, soft spring light, gentle breeze',
  sunset_fire: 'dramatic sunset, sky on fire with reds purples and golds, silhouettes, last light',
  overcast: 'soft overcast sky, diffused light with no shadows, cozy grey, gentle and even',
  tropical_rain: 'warm tropical rain, steam rising from hot ground, lush green, humidity visible',
  misty_forest: 'mystical mist weaving through trees, green and silver, dappled light, enchanted feeling',
};

// ── TECHNIQUE: Color palette keywords ───────────────────────────────────────

export const PALETTE_KEYWORDS: Record<string, string> = {
  warm_sunset: 'warm golden amber and crimson color palette, sunset tones, vintage warmth',
  cool_twilight: 'cool blue purple and lavender color palette, dreamy twilight tones',
  earthy_natural: 'earthy green brown and forest tones, natural organic colors',
  soft_pastel: 'soft pastel pink, bubblegum, lavender, cream, candy tones',
  dark_bold: 'dark dramatic palette with deep blacks and vivid accent colors',
  monochrome: '', // removed — rarely interesting, Haiku can still go B&W if it wants
  neon: 'electric neon colors, hot pink cyan and lime green, glowing edges',
  ocean_blues: 'turquoise, teal, deep navy, aquamarine, the full spectrum of ocean blue',
  jewel_tones: 'rich emerald green, ruby red, sapphire blue, amethyst purple, opulent and saturated',
};

// ── TECHNIQUE: Weirdness modifiers ──────────────────────────────────────────

export const WEIRDNESS_MODIFIERS = [ // 0-0.2: normal
  'slightly unusual proportions', // 0.2-0.4
  'dreamlike distortions, things not quite right', // 0.4-0.6
  'surreal impossible geometry, melting forms', // 0.6-0.8
  'full Salvador Dali surrealism, gravity-defying, morphing shapes', // 0.8-1.0
];

// ── TECHNIQUE: Scale modifiers ──────────────────────────────────────────────

export const SCALE_MODIFIERS = [
  'zoomed in on tiny intricate details', // 0-0.2
  'up close and personal', // 0.2-0.4
  'balanced view showing subject and surroundings', // 0.4-0.6
  'pulled back to show the full environment', // 0.6-0.8
  'vast sweeping view, everything feels enormous', // 0.8-1.0
];

// ── SUBJECT: Actions ────────────────────────────────────────────────────────

export const ACTIONS = [
  'tumbling',
  'sneaking',
  'leaping',
  'balancing precariously',
  'wrestling over',
  'tiptoeing',
  'diving headfirst into',
  'stacking things into a wobbly tower',
  'chasing each other',
  'hiding behind',
  'dangling upside down from',
  'squeezing through a tiny gap',
  'sliding down',
  'bouncing off',
  'carrying something absurdly oversized',
  'peeking around a corner at',
  'caught mid-sneeze near',
  'building a fort out of',
  'surfing on top of',
  'catching something falling from above',
  'being startled by a butterfly',
  'painting a tiny masterpiece',
  'conducting a tiny orchestra',
  'trying to open a jar',
  'posing dramatically for no reason',
  'napping peacefully on',
  'exploring a hidden passage in',
  'riding a skateboard off a ramp made of books',
  'having a tea party with unexpected guests',
  'discovering a glowing portal in a wall',
  'photobombing a dramatic scene',
  'trying to catch fireflies in a jar',
  'assembling a tiny robot from spare parts',
  'riding a paper airplane through a canyon',
  'playing a guitar made of clouds',
  'teaching ducklings to march',
  'launching off a catapult into the sky',
  'melting into a puddle of colors',
  'inflating a balloon that lifts them off the ground',
  'running from an adorable tiny avalanche',
  'hatching from a giant egg',
  'planting a flag on a mountain of pillows',
  'parachuting with an umbrella',
  'racing snails and losing',
  'doing a dramatic slow-motion walk',
  'fishing in a puddle and catching something huge',
  'walking a cloud like a dog on a leash',
  'accidentally summoning something magical',
  'juggling flaming objects',
  'melting into the floor',
  'riding a giant creature backwards',
  'whispering secrets to plants',
  'climbing an impossible staircase',
  'being chased by their own shadow',
  'conducting an invisible orchestra',
  'transforming into something else',
  'dancing in slow motion',
  'discovering they can fly',
  'arguing with an inanimate object',
  'painting something into existence',
  'being swallowed by a living thing',
  'defying gravity',
  'caught in an endless fall',
  'playing an instrument made of light',
  'sprouting wings',
  'sinking through solid ground',
  'riding on the back of wind',
  'fleeing from something unseen',
  'building something from chaos',
  'communicating through dance',
  'caught between two worlds',
  'laughing uncontrollably',
  'shrinking rapidly',
  'being pulled in multiple directions',
  'drawing in the air',
  'walking on walls',
  'merging with their environment',
  'conducting a ritual',
  'being lifted by invisible hands',
  'creating fire with their bare hands',
  'frozen in terror',
  'blooming like a flower',
  'swimming through air',
  'reaching for something just out of reach',
  'watching something crumble',
  'being made of water',
  'levitating objects around them',
  'running backwards through time',
  'shattering into pieces',
  'speaking in light',
  'tangled in vines',
  'ascending towards the sky',
  'unraveling',
  'surrounded by swirling energy',
  'piecing reality together',
  'bending light around them',
  'being swept away by wind',
  'riding waves of sand',
  'made entirely of stars',
  'dissolving into mist',
  'caught in a whirlwind',
  'glowing brighter and brighter',
  'dissolving and reforming',
  'emerging from cocoon-like structure',
  'petrifying slowly',
  'dancing with their reflection',
  'calling something from the depths',
  'being crushed by invisible weight',
  'wrapped in ribbons of light',
  'ascending a chain of clouds',
  'fragmenting into color',
  'gesturing reality into shape',
  'caught in loop of time',
  'teleporting in bursts of light',
  'speaking in riddles to spirits',
  'expanding infinitely',
  'being consumed by growth',
  'walking through a mirror',
  'awakening something ancient',
  'covered in flowing fabric',
  'reaching between dimensions',
  'transmuting their surroundings',
  'being pulled toward a vortex',
  'riding lightning bolts',
  'reconstructing from fragments',
  'speaking language of dreams',
  'being crowned with light',
  'sinking into shadow',
  'becoming one with the landscape',
  'escaping from crystalline cage',
  'calling down the stars',
  'being buffeted by invisible currents',
  'wrapped in self-made cocoon',
  'touching the fabric of reality',
  'suspended in thick liquid',
  'becoming more transparent',
  'resonating with ancient power',
  'being launched skyward',
  'enveloped in living darkness',
  'writing with starlight',
  'caught between sleeping and waking',
  'becoming root system',
  'riding on comet tail',
  'being burned by cold fire',
  'shedding layers of self',
  'reaching infinity',
  'being painted by reality',
  'emerging from mirror dimension',
  'anchored by heavy chain of light',
];

// ── SUBJECT: Scene types ────────────────────────────────────────────────────

export const SCENE_TYPES = [
  'unexpected discovery',
  'playful chaos',
  'cozy comfort',
  'tiny adventure',
  'dramatic moment',
  'silly mishap',
  'tender moment',
  'creative activity',
  'celebration',
  'sneaky heist',
  'friendly competition',
  'rescue mission',
  'quiet contemplation',
  'first encounter',
  'magical transformation',
  'boss battle',
  'training montage',
  'unboxing surprise',
  'cooking disaster',
  'dance-off',
  'time travel mishap',
  'shrunk to tiny size',
  'giant among miniatures',
  'dream within a dream',
  'power-up moment',
  'plot twist reveal',
  'secret level discovered',
  'leveling up',
  'treasure hunt',
  'building something impossible',
  'midnight library escape',
  'stolen time loop',
  'forgotten childhood home',
  'neon rain dance',
  'crystal cave awakening',
  'lost in translation',
  'velvet conspiracy meeting',
  'gravity gone wrong',
  'ancient library burning',
  'floating garden party',
  'mirror world reflection',
  'thunderstorm rescue mission',
  'clockwork heart beating',
  'overgrown mansion secrets',
  'dimensional café encounter',
  'bioluminescent forest walk',
  'fractured memory puzzle',
  'underwater city discovery',
  'carnival mirror maze',
  'silent museum theft',
  'aurora sky chase',
  'forgotten ritual beginning',
  'mechanical butterfly migration',
  'shadowed forest ritual',
  'color draining slowly',
  'ghostly reunion moment',
  'infinite staircase climbing',
  'musical instrument transformation',
  'silent auction betrayal',
  'crystalline mountain summit',
  'painting coming alive',
  'temporal office glitch',
  'marble temple collapse',
  'synesthetic color music',
  'velvet darkness descending',
  'portal opening ceremony',
  'phantom orchestra performance',
  'corrupted digital realm',
  'honeycomb structure explorer',
  'rose garden withering',
  'temporal pocket discovery',
  'ink cloud swallowing',
  'impossible architecture defying',
  'whispered secret spreading',
  'crimson tide rising',
  'abandoned amusement park',
  'shadow puppet theater',
  'obsolete technology awakening',
  'silk thread unwinding',
  'volcanic glass field',
  'radiant being appearing',
  'twilight threshold crossing',
  'prism light scattering',
  'fading photograph memory',
  'stone sentinel awakening',
  'luminous creature encounter',
  'melting ice kingdom',
  'celestial navigation error',
  'whispered prophecy fulfilling',
];

// ── SUBJECT: Interest flavor expansions ─────────────────────────────────────
// When an interest is sampled, sometimes replace it with a specific pop culture flavor
export const INTEREST_FLAVORS: Record<string, string[]> = {
  gaming: [
    'Pokémon-style',
    'Minecraft blocky',
    'retro arcade',
    'Nintendo',
    'Zelda-inspired',
    'Mario world',
    'Final Fantasy',
    'Sonic the Hedgehog',
    'Animal Crossing',
    'Pac-Man ghost',
    'Tetris block',
    'Kirby',
    'LittleBigPlanet Sackboy craft world, knitted and stitched',
  ],
  movies: [
    'Star Wars',
    'Lord of the Rings',
    'Jurassic Park',
    'The Matrix',
    'Princess Bride',
    'Spirited Away',
    'The Dark Crystal',
    'NeverEnding Story',
    'Harry Potter',
    'Indiana Jones',
    'E.T.',
    'Ghostbusters',
    'Willy Wonka',
    'Back to the Future',
    'Labyrinth',
    'Coraline',
    'SpongeBob SquarePants',
    'LEGO Batman',
    'Despicable Me Minions',
    'Nightmare Before Christmas',
    'Monsters Inc',
    'Inside Out emotions',
    'Avatar Pandora',
    'Blade Runner',
    'Mad Max wasteland',
    'Shrek fairy tale',
    'Wall-E post-apocalyptic',
    'Ratatouille kitchen',
    'Toy Story',
    'Finding Nemo underwater',
    'Up floating house with balloons',
    "Howl's Moving Castle",
    'Akira neon Tokyo',
    'Ghost in the Shell',
    'Muppet Show stage, felt characters, backstage chaos',
    'The Dark Crystal puppetry, mystical Gelflings',
    'Labyrinth goblin city, Jim Henson puppets',
    'Fraggle Rock underground, Doozers building',
    'Land Before Time, Littlefoot and friends, Great Valley, lush prehistoric',
    'Secret of NIMH, magical rose, brave mice',
    'Coraline other world, button eyes, too-perfect reality',
    'Kubo and the Two Strings, origami magic',
    'Wallace & Gromit, cozy English village, mad inventions',
    'Fantasia, Disney musical dreamscape',
    'Who Framed Roger Rabbit, cartoon meets real world',
    "Pan's Labyrinth, dark fairy tale",
    'Edward Scissorhands, pastel suburbia meets gothic',
    'The Iron Giant, gentle metal giant',
    'Interstellar, wormhole, tesseract, cosmic awe',
    'ParaNorman, spooky small town, ghosts and misfits',
    // Retro & classic pop culture
    'Twilight Zone, black and white surreal, uncanny ordinary',
    'I Love Lucy, 1950s sitcom, slapstick warmth',
    'Alfred Hitchcock suspense, dramatic shadows, Vertigo spiral',
    'James Bond 60s spy style, tuxedo, gadgets, martini',
    "Breakfast at Tiffany's, little black dress, rain-soaked New York",
    '2001: A Space Odyssey, monolith, stark white space station',
    'Planet of the Apes, Statue of Liberty reveal',
    'Yellow Submarine, Beatles psychedelic cartoon',
    'Mary Poppins, chalk drawing world, chimney sweep rooftops',
    'Wizard of Oz, yellow brick road, emerald city, ruby slippers',
    "Singin' in the Rain, lamppost, puddle splashing, pure joy",
    // Marvel & Comics
    'Marvel superhero landing pose',
    'Spider-Man swinging between buildings',
    'Spider-Verse multiverse, mixed animation styles colliding, glitch effects',
    'Avengers assembled, dramatic skyline',
    'Wakanda forever, vibranium tech',
    'Gotham rooftop, bat signal',
    'X-Men danger room training',
    'comic book POW ZAP action panel',
    'graphic novel noir detective',
    'Día de los Muertos sugar skull celebration, marigolds, candles',
    'Stranger Things upside-down, vines, flickering lights',
    'Game of Thrones iron throne room',
    'Squid Game playground',
    'Wednesday Addams gothic school',
    'Mandalorian desert walk',
    'Bridgerton Regency ballroom',
    'Black Mirror dystopia',
  ],
  anime: [
    // Studio Ghibli worlds
    'a Spirited Away bathhouse at dusk, lanterns glowing, spirits arriving by ferry',
    'a Totoro-sized forest spirit waiting at a rainy bus stop, holding a leaf umbrella',
    'a Howl\'s Moving Castle clanking across a flower meadow, smoke trailing, doors to other worlds',
    'a Kiki\'s Delivery Service bakery by the sea, a black cat on the windowsill, ocean breeze',
    'a Nausicaä glider soaring over a toxic jungle, giant insects, spore-filled air, golden light',
    'a Mononoke forest with glowing kodama spirits in ancient trees, a giant wolf silhouette',
    // Shonen / action
    'a shonen hero powering up, energy crackling, ground cracking, hair floating upward',
    'two rivals facing each other across a destroyed battlefield, wind between them, silence before the clash',
    'a Demon Slayer water breathing technique, crescent moon arcs of blue water slicing through darkness',
    'a Jujutsu Kaisen cursed energy explosion, purple and black, distorted space around the fighter',
    'a My Hero Academia hero pose on a rooftop, cape billowing, city lights below',
    'a Dragon Ball energy blast illuminating an entire canyon, two silhouettes mid-clash',
    // Aesthetic / slice of life
    'an anime girl studying at a window desk at golden hour, headphones on, city below, cherry blossoms',
    'a school rooftop at sunset, wind in hair, that over-the-shoulder look, the whole sky on fire',
    'a rain-soaked anime street at night, neon reflecting in puddles, umbrella silhouettes',
    'a train crossing at sunset, bicycle waiting, the signal blinking, warm nostalgic light',
    'a convenience store at 3am, fluorescent glow on wet pavement, one figure inside',
    'a rooftop summer festival, yukata, sparklers, lanterns, fireworks painting the sky',
    // Romance / emotional
    'two hands almost touching across a train window as it pulls away, cherry blossoms falling',
    'a Weathering With You sky ocean, clouds you can walk on, sunlight breaking through rain',
    'a Your Name comet streaking across a twilight sky, two timelines overlapping',
    'a Violet Evergarden letter being written by candlelight, tears on the paper, flowers everywhere',
    // Dark / mecha
    'an Evangelion Unit standing in an orange ocean, head bowed, the pilot questioning everything',
    'a Ghost in the Shell cityscape, rain, neon kanji, a figure diving off a skyscraper into data',
    'an Akira motorcycle slide on a neon-soaked highway, light trails, Neo-Tokyo skyline',
    'a Cowboy Bebop jazz bar in space, whiskey on the counter, a bounty hunter watching stars',
    'an Attack on Titan wall with a massive eye peering over it, birds scattering, soldiers on cables',
    // Magical girl / cute
    'a magical girl mid-transformation, ribbons of light wrapping around her, sparkles and stars everywhere',
    'a Sailor Moon crescent moon framing a princess on a balcony, silver light, roses',
    'a Cardcaptor waving a staff as cards swirl around her in a cherry blossom tornado',
    // Food / cozy anime
    'a Ponyo ramen bowl so perfect it glows, steam curling, a tiny fish girl watching from the counter',
    'an anime kitchen at dawn, someone making bento boxes with impossible precision and love',
    'a cozy anime apartment filled with plants, fairy lights, a cat on every surface, rain outside',
  ],
  horror: [
    'a haunted Victorian mansion where the windows glow different colors on each floor',
    'a forest at night where the trees have too many branches and they are all reaching toward you',
    'a mirror reflecting a room that is slightly different from the one you are standing in',
    'a lighthouse beam sweeping across fog, illuminating something massive moving in the water',
    'a staircase that descends further than the building is tall, each floor more wrong than the last',
    'an abandoned hospital hallway where one light still flickers and a wheelchair faces the wall',
    'a doll collection where one of them has turned its head since you last looked',
    'a beautiful garden at night where every flower is slightly too large and facing the same direction',
    'a movie theater where the screen shows the audience from behind — and there are more people than there should be',
    'a snow globe containing a tiny house, and someone inside is looking out at you',
    'a carnival at midnight, one ride still spinning with nobody on it, calliope music',
    'an elevator that opens onto a floor that should not exist, beautiful and wrong',
    'a painting in a museum where the figure has moved since the last time you walked by',
    'a gorgeous abandoned ballroom with a chandelier still swaying, dust footprints on the floor in a waltz pattern',
    'a phone booth ringing in the middle of a field at 3am, no one around for miles',
  ],
  tattoo_art: [
    'a full sleeve tattoo coming to life, the dragon peeling off the arm and taking flight',
    'a back piece of a Japanese koi fish swimming upstream through cherry blossoms and waves',
    'traditional sailor tattoo flash sheets arranged on a parlor wall, anchors and swallows and roses',
    'a geometric sacred geometry tattoo that reveals a portal when viewed from the right angle',
    'a blackwork mandala so intricate it looks like it was drawn by a machine, perfect symmetry',
    'a watercolor tattoo style landscape, ink bleeding at the edges, no outlines, pure color',
    'a neo-traditional wolf howling at a moon made of roses, bold lines, rich color',
    'dotwork stipple tattoo of a galaxy, thousands of tiny dots forming stars and nebulae on skin',
    'a fine line botanical tattoo of wildflowers wrapping around an arm, delicate and precise',
    'old school American traditional tattoo flash, bold outlines, limited palette, eagles and hearts',
    'a full chest piece of two birds facing each other, symmetrical, ornate, tribal meets modern',
    'a Japanese irezumi full body suit, waves and dragons and peonies flowing as one composition',
  ],
  mythology: [
    'Zeus hurling a lightning bolt from a throne of clouds, the bolt illuminating all of Olympus',
    'Poseidon rising from the ocean, trident raised, a tidal wave forming behind him, ships scattering',
    'Athena in full armor standing in her temple, an owl on her shoulder, wisdom glowing in her eyes',
    'Thor swinging Mjolnir through a frozen battlefield, lightning arcing between Viking longships',
    'Anubis weighing a heart against a feather on golden scales, the underworld stretching behind him',
    'a phoenix mid-rebirth, the old body crumbling to ash while the new one emerges in flame',
    'Medusa in her garden of stone statues, each one frozen in a different expression of awe',
    'the Kraken pulling a ship underwater, tentacles the size of masts, sailors leaping into foam',
    'a Minotaur sitting alone in the center of a beautiful labyrinth, waiting, almost sad',
    'Icarus at the peak of his flight, the moment before the wax melts, the sun filling the frame',
    'Japanese fox spirits (kitsune) dancing under lantern light, multiple tails glowing, shrine in background',
    'a Chinese dragon winding through clouds above a misty mountain temple, pearls of wisdom in its claws',
    'Valkyries riding through a sky full of aurora borealis, choosing warriors from a battlefield below',
    'the Sphinx asking a riddle at the gates of a city, desert stretching endlessly behind',
    'Quetzalcoatl the feathered serpent coiling around an Aztec pyramid, feathers of every color, dawn light',
    'a Greek hero entering the underworld, the river Styx reflecting a sky that does not exist',
    'Odin hanging from Yggdrasil the world tree, one eye given for wisdom, ravens on each branch',
    'Amaterasu emerging from a cave, sunlight pouring out with her, the world blooming back to life',
    'a Celtic fairy ring at midnight, mushrooms glowing, the veil between worlds thin as breath',
    'Hindu god Ganesh sitting peacefully in a garden of lotus flowers, trunk curled, temple bells ringing',
  ],
  geek: [
    'comic book superhero',
    'robot workshop',
    'mad scientist lab',
    'spaceship bridge',
    'wizard library',
    'steampunk inventor',
    'hacker terminal',
    'alien autopsy',
    'mech suit cockpit',
    'TRON light cycle grid',
    'holodeck',
    'time machine interior',
    'anime mech battle',
    'Dragon Ball energy blast',
    'Naruto ninja village',
    'Attack on Titan wall',
    'Death Note dramatic',
    'One Piece pirate ship',
    'Evangelion cockpit',
    'K-pop stage with lightsticks',
    'Korean street food market at night',
    'Tokyo Akihabara neon signs',
    'Japanese konbini at 3am',
    'anime rooftop confession scene',
    'manga panel layout',
    'Sailor Moon transformation',
    'Pokémon gym battle',
    'Studio Ghibli countryside',
    'Jujutsu Kaisen cursed energy',
    'Demon Slayer water breathing',
    'My Hero Academia hero pose',
  ],
  fantasy: [
    'dragon lair',
    'enchanted forest',
    'fairy ring',
    'wizard tower',
    'elven kingdom',
    'dwarf forge',
    'magical potion shop',
    'floating castle',
    'phoenix nest',
    'crystal cave',
    'goblin market',
  ],
  sci_fi: [
    'a cyberpunk ramen stall beneath a 100-story holographic billboard, rain and neon everywhere',
    'a space station greenhouse where tomatoes grow in zero gravity, Earth filling the window',
    'an alien bazaar where every stall sells something impossible, colors you can\'t name',
    'a terraformed Mars at sunset, red dust, the first tree ever planted there, golden light on leaves',
    'a mech suit powering up in a hangar, eyes glowing to life, steam venting, the pilot climbing in',
    'a hyperspace tunnel mid-jump, stars stretching into lines, the cockpit shaking',
    'a holographic city that flickers in and out of existence, beautiful and unstable',
    'an android looking at its own reflection in rain, wondering what it means to dream',
    'a warp gate activating, reality folding like paper, another world visible through the tear',
    'a derelict spaceship overgrown with alien coral, drifting through an asteroid field, beautiful decay',
    'a first contact moment — two species seeing each other for the first time, wonder on both sides',
    'a time machine that looks like a phone booth, bigger on the inside, destinations flashing on a screen',
    'a robot bartender mixing drinks that glow, a space station bar with a viewport showing a nebula',
    'a cyberpunk motorcycle parked in an alley, neon reflecting in chrome, rain steam rising',
  ],
  cute: [
    'a hedgehog in a tiny raincoat splashing in a puddle, the puddle reflects a whole galaxy',
    'a stack of kittens asleep in a teacup, one ear twitching, afternoon light on fur',
    'a baby panda rolling down a hill and not minding at all, bamboo everywhere',
    'a hamster running a tiny bakery inside a wall, flour on its nose, the bread is perfect',
    'a duckling wearing rain boots three sizes too big, determined to cross a puddle',
    'a bunny family having a picnic under a mushroom during a rainstorm, lanterns and laughter',
    'a puppy meeting a butterfly for the first time, nose to wing, frozen in wonder',
    'a tiny dragon the size of a kitten, trying to breathe fire but only making soap bubbles',
    'a penguin sliding down an ice slide into a pool of sparkly water, pure joy',
    'a baby owl in a graduation cap sitting on a stack of books, looking very serious',
    'a corgi in a tiny astronaut helmet, floating in zero gravity, tail still wagging',
    'a frog prince sitting on a lily pad throne, crown slightly too big, looking very official',
    'a mouse sleeping in a walnut shell bed, tucked under a petal blanket, moonlight on whiskers',
    'a fox kit and a bear cub sharing a too-small blanket by a campfire, both asleep',
  ],
  dark: [
    'a gothic cathedral at midnight where the stained glass windows show scenes that change when you blink',
    'a forest where the trees have faces and they are all watching something behind you',
    'a ballroom full of dancing ghosts, chandelier swaying, the music from a century ago still playing',
    'a vampire\'s library, thousands of books collected over a thousand years, a single candle, blood-red wine',
    'the deep ocean floor where something enormous sleeps, its outline barely visible in bioluminescence',
    'an abandoned theater where the last play is still performing to empty seats, the actors are shadows',
    'a graveyard where the headstones are carved with the dreams the dead never got to have',
    'a witch\'s cottage that walks on chicken legs through a frozen birch forest at dawn',
    'a mirror that shows the room as it will look in a hundred years — decayed and beautiful',
    'a black rose garden in moonlight, each rose a different shade of darkness, thorns like silver',
    'a shipwreck at the bottom of a clear lake, perfectly preserved, fish swimming through the captain\'s quarters',
    'a clock tower where time runs backward, the pendulum swinging the wrong way, dust falling upward',
    'a tarot card reading where the cards float and the images on them move and breathe',
    'a masquerade where every mask is a real face and every face is a mask',
  ],
  animals: [
    'safari wildlife',
    'deep ocean creatures',
    'arctic penguin colony',
    'butterfly garden',
    'dinosaur',
    'mythical beast',
    'forest critters',
    'baby fox in wildflowers',
    'owl in moonlight',
    'hummingbird mid-hover',
    'wolf pack howling at aurora',
    'sea turtle gliding through kelp',
    'tiny frog on a lily pad',
    'majestic eagle soaring over canyon',
    'koi fish in a crystal pond',
    'deer in misty morning meadow',
    'polar bear on ice at sunset',
    'chameleon in a rainbow of flowers',
    'octopus in a coral garden',
    'fireflies in a jar at dusk',
  ],
  nature: [
    'enchanted garden',
    'bioluminescent cave',
    'volcanic island',
    'ancient redwood forest',
    'coral reef',
    'aurora-lit tundra',
    'beach at sunset, golden sand, turquoise waves',
    'palm trees swaying, hammock, coconuts',
    'tropical flowers, hibiscus, plumeria, jungle color',
    'crystal clear mountain spring, moss-covered rocks',
    'standing at the edge of Yosemite valley, vast granite cliffs',
    'forest trail with dappled sunlight, ferns and mushrooms',
    'lavender field in Provence, purple rows to the horizon',
    'cherry blossom canopy, petals falling like pink snow',
    'waterfall hidden in jungle, mist rainbow, vines',
    'desert sand dunes at golden hour, ripple patterns',
    'autumn forest, fiery red orange and gold leaves',
    'tide pools, starfish, anemones, tiny crabs',
    'glacier lake, impossibly blue water, snow peaks',
    'meadow of wildflowers, butterflies, warm breeze',
    'lightning over open prairie, dramatic storm clouds',
    'moss-covered stone bridge over a brook',
    'cave opening looking out at sunlit valley',
    'giant sequoia trunk, person for scale, ancient',
    'cliff edge with ocean crashing below, sea spray',
    'sunrise from a mountain summit, clouds below',
    'bioluminescent beach at night, glowing waves',
    'bamboo forest, green light filtering through',
  ],
  ocean: [
    'deep sea submarine',
    'mermaid kingdom',
    'shipwreck dive',
    'bioluminescent jellyfish',
    'pirate treasure',
    'kraken encounter',
    'surfing inside a barrel wave, crystal water',
    'whale breaching at sunset',
    'underwater coral city, fish everywhere',
    'lighthouse in a storm, waves crashing',
    'sailboat on glass-calm sea, stars reflecting',
    'tropical reef snorkeling, clownfish',
    'deep ocean trench, anglerfish glow, darkness',
    'beach bonfire, waves lapping, stars above',
  ],
  space: [
    'an astronaut floating above Earth, one hand reaching toward the planet, tethered by a single cable',
    'a nebula nursery where baby stars are forming, gas clouds in impossible purples and golds',
    'a moon base at dawn, the first coffee of the day, Earth rising through the dome window',
    'surfing the tail of a comet, ice crystals sparkling, the sun a blinding disc in the distance',
    'the edge of a black hole, light bending, time stretching, the most beautiful and terrifying sight',
    'a whale made of starlight swimming through a nebula, smaller fish-stars following in its wake',
    'Saturn\'s rings up close, ice and rock tumbling in slow motion, the planet\'s curve filling the sky',
    'a space garden on the ISS, a single tomato plant floating, the astronaut\'s face lit by earthshine',
    'two spacecraft docking in orbit, the delicate ballet of tonnage meeting at zero velocity',
    'standing on Europa, cracks in the ice glowing blue from the ocean beneath, Jupiter looming above',
    'a space elevator ride, the ground falling away, the stars getting closer, the atmosphere thinning',
    'the Voyager probe\'s last photograph before leaving the solar system, Earth a pale blue dot',
    'a cozy reading nook inside an asteroid that\'s been hollowed out and turned into a home',
    'the Milky Way seen from outside, the entire galaxy a spiraling disk of light, incomprehensible scale',
  ],
  sports: [
    'championship arena',
    'extreme skateboarding',
    'underwater racing',
    'zero-gravity sport',
    'dragon boat race',
    'robot boxing ring',
    // Extreme sports
    'surfing a massive wave, barrel view, spray and sun',
    'skateboard halfpipe trick, graffiti ramp',
    'snowboarding powder run, mountain peak, fresh tracks',
    'skiing down alpine slope, trees blurring',
    'BMX dirt jump, mid-air trick, dust cloud',
    'rock climbing sheer cliff face, chalk hands',
    'paragliding over valley, tiny world below',
    'mountain biking forest trail, leaves flying',
    'bungee jumping off a bridge, freefall moment',
    'wakeboarding behind a boat, sunset spray',
    // Traditional sports
    'NFL football stadium, crowd roaring, Friday night lights',
    'NBA basketball court, slam dunk mid-air',
    'baseball diamond, pitcher mound, stadium lights',
    'soccer pitch, bicycle kick, packed stadium',
    'hockey rink, slapshot, ice spray',
    'tennis grand slam court, serve in motion',
    'boxing ring, spotlight, dramatic corner',
    'MMA octagon, dramatic face-off',
    'Olympic podium, gold medal moment, flags flying',
    'golf course at sunrise, dew on green',
    // Gym & fitness
    'gym weight room, iron plates, chalk dust, determination',
    'yoga pose on a cliff at sunrise',
    'CrossFit box, tire flips, ropes, gritty',
    'running track, sprint finish, motion blur',
    // Hobbies & vehicles (only for sports interest)
    'classic muscle car in a neon-lit garage',
    'monster truck rally, dirt flying',
    'motorcycle on an open highway',
    'hot rod drag strip, burnout smoke',
    'drift racing, tire smoke',
    'lifted truck mudding through a creek',
    'vintage VW van at the beach, surfboards',
    'rock climbing gym, colorful holds',
    'fly fishing in a mountain river',
    'campfire in the woods, sparks rising',
  ],
  travel: [
    'Eiffel Tower at midnight',
    'cherry blossom temple in Kyoto',
    'Venetian gondola canal',
    'Machu Picchu sunrise',
    'Northern Lights Iceland',
    'hot air balloon over Cappadocia',
    'Great Wall misty morning',
    'Santorini sunset',
    'safari savanna',
    'bamboo forest path',
    'Hawaiian beach at sunset',
    'Disneyland Main Street USA',
    'Grand Canyon overlook',
    'Yellowstone geyser',
    'Swiss Alps chalet',
    'Bali temple',
    'New York skyline at dusk',
    'Caribbean island paradise',
    'Maldives overwater villa',
    'Redwood forest trail',
    'Niagara Falls mist',
    'Amalfi Coast road',
    'Petra rose-red canyon',
    'Banff turquoise lake',
    'Angkor Wat at dawn',
    'Paris cafe with croissants',
    'London double-decker bus in rain',
    'Tokyo Tower neon night',
    'Dubai skyline futuristic',
  ],
  food: [
    'a sushi chef mid-slice on a fish the size of a sailboat, dawn shore, seagulls stealing rice',
    'a night market where every stall has a different glowing soup, steam mixing into fog, lanterns',
    'a bakery at 4am, flour dust in golden light, hands kneading dough, the oven glowing',
    'a ramen bowl so perfect the steam forms a tiny city skyline above the broth',
    'a candy shop where everything is edible including the furniture and the walls are chocolate',
    'a grandmother\'s kitchen, every surface has something cooking, the warmth is visible',
    'a pizza being pulled from a wood-fired oven, the cheese stretching impossibly, embers flying',
    'a fruit market in Morocco, pyramids of oranges and pomegranates, golden afternoon light',
    'an ice cream cart on a beach at sunset, the flavors are impossible colors, a line of happy silhouettes',
    'a tiny mouse chef in a Parisian kitchen, standing on a cookbook, stirring a pot bigger than itself',
    'a bento box opened to reveal an entire miniature Japanese garden inside, each section a landscape',
    'a chocolate waterfall flowing into a pool where strawberries float like boats',
    'a street taco stand at midnight, flames licking the grill, lime and cilantro everywhere',
    'a tea ceremony where the steam from the cup forms a dragon that curls around the room',
  ],
  abstract: [
    'a room where gravity works in every direction at once, furniture on walls and ceiling',
    'an infinite corridor of mirrors where each reflection shows a different universe',
    'colors that have escaped their objects and are pooling on the floor like liquid rainbows',
    'a clock melting over a landscape where time is visible as ribbons in the air',
    'a staircase that exists in four dimensions, going up and sideways and through simultaneously',
    'two faces in profile that form a vase in the negative space between them',
    'a landscape painted by pouring paint from the sky, still wet, dripping off the mountains',
    'the number pi visualized as an infinite spiral city, each digit a different building',
    'emotions as weather — joy is a golden rain, sadness is slow blue snow, anger is sideways red wind',
    'a room where sound is visible, a conversation shown as intersecting colored shapes',
    'the inside of a thought, rendered as a vast space with floating fragments of memory',
    'a world where shadows are three-dimensional and cast their own light',
    'a tesseract unfolding, each face revealing a different scene from the same moment',
    'the boundary between two seasons, visible as a crisp line across a landscape — snow on one side, flowers on the other',
  ],
  whimsical: [
    'a mailbox that delivers letters from your future self, each one glowing a different color',
    'a library where the books fly back to their shelves when you\'re done and hum contentedly',
    'a garden where the flowers grow upside down from floating soil, roots reaching for the sun',
    'a bathtub that is also a boat sailing across a bedroom that is also an ocean',
    'clouds that you can bounce on like trampolines, a whole playground in the sky',
    'a vending machine that dispenses tiny adventures in glass bottles, each one a different color',
    'a tree whose branches grow clocks instead of leaves, all showing different times',
    'a fish that swims through the air carrying a tiny house on its back',
    'a door in the floor that opens to the sky below, birds flying up through it',
    'a bicycle that pedals itself through a town made entirely of books',
    'a cat wearing a top hat serving tea to a mushroom that is telling a joke',
    'an umbrella that rains sunshine underneath it on a cloudy day',
    'a postcard that you can step inside and visit for exactly five minutes',
    'shoes that leave flowers wherever they step, turning a city street into a garden',
  ],
  architecture: [
    // Impossible & surreal
    'a staircase that loops back on itself, going up and arriving where you started, one floor higher',
    'a building with rooms that are bigger on the inside, each door opens to a space that shouldn\'t fit',
    'a bridge made entirely of glass spanning a cloud-filled canyon, nothing visible holding it up',
    'a tower so tall the top floors are above the clouds, frost on the windows, stars visible at noon',
    // Ancient & monumental
    'a pyramid being built, thousands of workers, ramps and pulleys, the scale is incomprehensible',
    'a Roman colosseum at sunset, golden light on travertine, empty seats, ghosts of a crowd',
    'a Mayan temple erupting from jungle canopy, roots and vines wrapping every carved stone face',
    'Petra carved into rose-red cliffs, the Treasury appearing through a narrow canyon slot at dawn',
    // Modern & iconic
    'a Zaha Hadid building that looks like frozen liquid, curves that shouldn\'t be possible in concrete',
    'a Brutalist concrete fortress softened by a rooftop garden, wildflowers cracking through every ledge',
    'a glass skyscraper reflecting an entire sunset, the building disappearing into the sky it mirrors',
    'a Frank Lloyd Wright house cantilevered over a waterfall, water running under the living room',
    // Fantasy & dream
    'a treehouse city connected by rope bridges and ziplines, lanterns in every tree, a whole civilization above the ground',
    'an ice palace with walls you can see through, frozen waterfalls as columns, aurora light refracting through every surface',
    'a library that spirals downward underground for fifty floors, each level a different century of books',
    'a greenhouse the size of a cathedral, glass dome sweating with condensation, jungle inside, snow outside',
    // Sacred & spiritual
    'a cathedral with stained glass so vast the entire interior is painted in colored light',
    'a Japanese torii gate standing alone in the ocean at sunrise, the path to it underwater',
    'a mosque with geometric tile patterns so intricate they seem to move and breathe',
    'a stone circle on a hilltop at solstice, the sun threading through a gap that was placed there 5000 years ago',
    // Abandoned & reclaimed
    'an abandoned Art Deco theater, velvet seats rotting, chandelier still hanging, pigeons in the balcony',
    'a Soviet-era apartment block where every balcony has become a tiny jungle, laundry and plants competing for space',
    'a train station with no trains, glass roof cracked, trees growing through the platform, beautiful decay',
    'a swimming pool drained and covered in graffiti, skateboard marks on the walls, golden afternoon light',
    // Futuristic
    'a space elevator stretching from a tropical island into the stars, glass tube ascending forever',
    'a floating city of interconnected pods above the ocean, each one a different color, connected by walkways',
    'a solarpunk neighborhood where every building grows its own food, green walls, beehives on rooftops',
    'an underwater dome city, fish swimming past apartment windows, coral growing on the exterior, blue light everywhere',
  ],
  fashion: [
    'a runway show on the surface of water, each step sending ripples of color outward',
    'a dress made entirely of living butterflies, rearranging themselves as the wearer moves',
    'a vintage thrift shop where every garment remembers its previous owner and tells their story',
    'a masquerade ball where the masks are more alive than the people wearing them',
    'a closet that goes on forever, each rack a different era, a different version of you',
    'a silk gown being woven by spiders in a moonlit forest, gossamer and starlight',
    'a punk jacket covered in pins from places that don\'t exist, each one a portal',
    'a fashion photo shoot on the moon, the model floating mid-pose, Earth in the background',
    'a corset being laced with light instead of ribbon, the wearer glowing from within',
    'a shoe shop where every pair takes you somewhere different when you put them on',
    'a hat that changes shape based on your mood, currently blooming with flowers',
    'armor made of stained glass, fragile and beautiful and somehow stronger than steel',
    'a wedding dress with a train so long it covers the entire church floor like fresh snow',
    'a leather jacket being painted by hand, each brushstroke a story, punk meets art',
  ],
  pride: [
    'rainbow flag colors flowing through the sky',
    'pride parade confetti and joy',
    'love-is-love neon sign glowing',
    'rainbow crosswalk in a city',
    'colorful celebration with rainbow balloons',
    'pride festival with glitter and color',
    'rainbow aurora in the night sky',
    'hearts and rainbows everywhere',
    'chosen-family gathering under string lights',
    'rainbow paint splashes on everything',
  ],
};

// ── SUBJECT: Dream creatures/subjects ──────────────────────────────────────

export const DREAM_SUBJECTS = [
  // Epic creatures in action
  'a dragon mid-flight through a thunderstorm, lightning reflecting off scales',
  'a phoenix exploding out of a volcano, wings of pure fire spreading across the sky',
  'a sea serpent breaching the surface, boats scattering, a wall of water rising',
  'a wolf pack running across a frozen lake, cracks spreading beneath their paws',
  'a whale breaching through clouds, an entire city visible on its back',
  // Cute creatures with personality
  'a fox kit discovering snow for the first time, nose buried, tail wagging',
  'a cat sitting in a window watching rain, the reflection telling a different story',
  'a baby dragon trying to roast a marshmallow and accidentally melting the stick',
  'an octopus organizing a library, each tentacle shelving a different book',
  'a raccoon breaking into a candy store at midnight, paws full of lollipops',
  // Characters mid-action
  'a warrior sliding down a collapsing bridge, sword sparking against stone',
  'a witch on a broomstick racing through a canyon, cloak streaming behind',
  'a ninja mid-leap between rooftops, city lights streaking below',
  'a diver touching the nose of a whale shark, both frozen in the moment',
  'a kid cannonballing into a lake, the splash frozen in time, pure joy',
  // Impossible scenes
  'a train crossing a bridge that spans between two mountains, clouds below',
  'a tree growing upside down from the ceiling of a massive cave, roots in the sky',
  'a door in the middle of the ocean, slightly open, golden light spilling out',
  'a staircase spiraling up through clouds, each step a different season',
  'two worlds colliding — one made of water, one made of fire, meeting in the middle',
  // Nature as character
  'a storm front approaching across open plains, one farmhouse in its path',
  'a single cherry tree in full bloom on a volcanic black sand beach',
  'a waterfall so tall it disappears into mist, rainbows at every level',
  'a coral reef at the exact moment the sun hits it, every color exploding',
  'a field of sunflowers all turning to face something other than the sun',
  // Craft/toy characters
  'a felt puppet fox on a tiny adventure, button eyes wide with wonder',
  'a clay dragon carefully painting a miniature landscape with its tail',
  'a LEGO astronaut planting a flag on a LEGO moon, Earth in the background',
  'a paper boat navigating rapids made from a watercolor painting coming alive',
  // Emotional moments
  'two silhouettes reaching toward each other across a gap that is almost but not quite crossable',
  'a figure standing at the edge of a vast landscape, about to take the first step',
  'a crowd of lanterns rising into the night, each one carrying a wish',
  'a kid asleep in a blanket fort, the shadows on the wall showing their dream',
  // Pop culture characters in action
  'a Totoro-sized forest spirit sheltering tiny creatures from the rain under its belly',
  'a Sackboy stitched from felt, exploring a cardboard world, button eyes wide with wonder',
  'Falkor the luck dragon soaring through a canyon of clouds, a kid on his back laughing',
  'a Wallace & Gromit-style inventor whose latest contraption has gone hilariously wrong',
  'a Miyazaki-style cat bus bounding through a rainy countryside, passengers peeking out',
  'a Pixar-style robot discovering a single flower growing in wreckage',
  'a Studio Ghibli witch on a broomstick delivering packages over a seaside town at sunset',
  'a Minecraft creeper sneaking up behind a player who is building something beautiful',
  'a Pokemon battle mid-attack, energy beams colliding, the arena shaking',
  'a Zelda-style hero pulling a glowing sword from a mossy stone pedestal in a sunbeam',
  'a octopus orchestra conducting bioluminescent waves with tentacle batons',
  'a child chasing fireflies through an ancient library where books float like clouds',
  'a phoenix rising from volcanic ash, wings igniting the sky in orange and gold',
  'a astronaut dancing weightlessly inside a collapsing space station, debris orbiting them',
  'a pack of wolves running across a frozen lake that cracks and glows beneath their paws',
  'a tiny robot painting the stars, leaving trails of light across the night sky',
  'a girl swinging on vines through a canopy of bioluminescent jellyfish trees',
  'a samurai leaping between crumbling pagodas during an earthquake',
  'a sea monster breaching through an aurora borealis, ice crystals shattering around it',
  'a child building sandcastles while the tide rises, racing against the waves',
  'a dragon and human dancing together on a cloud suspended over a canyon',
  'a mushroom forest burning with cool blue flames, spores glowing like falling stars',
  'a time traveler frantically rewinding their own footsteps as reality glitches around them',
  'a swarm of golden beetles lifting a drowsy giant cat skyward',
  'a skateboarder grinding down a waterfall in reverse, water flowing upward',
  'a forest fire made entirely of flowers, petals swirling upward in impossible beauty',
  'a ghost child playing hide-and-seek through walls, leaving handprints of starlight',
  'a mammoth charging through a crystalline ice cave, tusks shattering prisms of light',
  'a ballerina pirouetting on a tightrope strung between two storm clouds',
  'a crow army assembling mid-air, forming patterns that shift like living constellations',
  'a diver plunging into an inverted ocean suspended above mountains',
  'a fox messenger running across rooftops at dusk, carrying a glowing letter',
  'a girl building bridges from her own shadow, jumping between them',
  'a kraken gently cradling a shipwreck in its tentacles, preserving it',
  'a child laughing as they roll down a hill of soft moss toward a sleeping dragon',
  'a swordfighter duel between two silhouettes made entirely of fire and smoke',
  'a traveling carnival riding on the back of a sleeping leviathan',
  'a painter',
  's laughter creating ripples in solid ground like water',
  'a wanderer discovering that their footprints are the only solid things in a dream city',
  'a fox leading a lost child through a forest of bioluminescent mushrooms',
  'a dancer moving through water suspended in air, fish orbiting their movements',
  'a library where books are flying away and the reader is chasing them',
  'a child and a giant tortoise ascending a mountain made of clouds',
  'a thief escaping across rooftops as they transform into a flock of birds mid-run',
  'a storm spirit weeping rain that becomes flowers where it touches ground',
  'a girl braiding light rays into a rope to climb toward the moon',
  'a marketplace appearing in the sky as merchant spirits trade impossible goods',
  'a warrior splitting a meteor with their sword, riding the resulting fragments',
  'a child discovering they can walk on water, leaving flowers blooming in their wake',
];

// Interests that are too vague on their own — always expand to a specific flavor
// Expanded to include more categories so concrete interests also get flavorful variety
export const ALWAYS_EXPAND = new Set([
  'gaming',
  'movies',
  'anime',
  'geek',
  'horror',
  'tattoo_art',
  'mythology',
  'architecture',
  'sports',
  'travel',
  'pride',
  'fashion',
  'animals',
  'nature',
  'ocean',
  'dark',
  'cute',
  'fantasy',
  'sci_fi',
  'space',
]);

// ── COMPOSITIONS: Random framing directives ───────────────────────────────

export const COMPOSITIONS = [
  // Angles
  "Bird's eye view looking straight down.",
  'Viewed from below looking up at the sky.',
  "Worm's eye view, everything towers above.",
  'Dutch angle, slightly tilted and off-kilter.',
  'Over the shoulder, peeking into the scene.',
  'Overhead satellite view, like a map.',
  'Shot from inside something looking out.',

  // Cropping & framing
  'Compose as if cropping into a detail of a much larger painting.',
  'Extreme close-up on one tiny fascinating detail.',
  'Zoomed way out, subject is a tiny speck in a vast world.',
  'Off-center composition, lots of empty space on one side.',
  'Subject cut in half by the frame edge, only partially visible.',
  'Tightly framed, everything pressed to the edges.',

  // Perspectives
  'Fisheye lens distortion, everything curves outward.',
  'Isometric angle, like a cozy video game.',
  'Cross-section cutaway, like a dollhouse showing inside and outside.',
  'Reflected in still water, upside-down mirror world.',
  'Seen through frosted glass, blurry and dreamlike.',
  'Peering through a keyhole or small opening.',
  'Multiple overlapping transparent layers.',

  // Layouts
  'Flat pattern filling the entire frame, like wallpaper, no depth.',
  'Scattered elements floating in space, no gravity, no horizon.',
  'Spiral composition, everything swirls toward the center.',
  'Symmetrical mandala-like arrangement.',
  'Split screen, two different worlds side by side.',
  'Collage of different scenes merged into one image.',
  'Tiled repeating pattern with subtle variations.',

  // Scale play
  'Miniature world inside something ordinary, like a teacup or book.',
  'Giant object in a tiny world, scale is wrong.',
  'Russian nesting dolls, scene within scene within scene.',
  'Tilt-shift effect making real things look like tiny models.',

  // Micro compositions — tiny intimate spaces
  'Tiny scene happening on a windowsill.',
  'Miniature world inside a glass jar.',
  'Scene unfolding on a cluttered desk among pencils and coffee cups.',
  'Happening inside a dresser drawer among forgotten things.',
  'Tiny creatures living in the cracks of a sidewalk.',
  'A whole world inside a bedroom snow globe.',
  'Scene tucked into a bookshelf between old books.',
  'Macro view of something magical happening on a leaf.',
  'An entire adventure on a kitchen table.',
  'Hidden world underneath a bed, dust bunnies and lost toys.',
  'Scene inside a coat pocket, lint and coins.',
  'Mushroom village at the base of a tree trunk.',
  'Life inside a raindrop on a window.',
  'Tiny civilization in a potted plant on a nightstand.',
  'A secret garden inside a cracked teapot.',

  // No directive — pure AI freedom
  'Wide-angle shot from inside a mouth looking outward.',
  'Macro photography of dewdrops reflecting entire landscapes.',
  'Fisheye lens distortion wrapping the scene into a sphere.',
  'Shot from between the pages of an open book.',
  'Panoramic stretched horizontally across the entire frame.',
  'Looking up from deep underwater toward a distant surface.',
  'Extreme Dutch angle, tilted 45 degrees to feel unstable.',
  'From the perspective of an ant on the ground.',
  'Peephole view through a tiny hole, dark vignette around edges.',
  'Zoomed so far in that texture becomes landscape.',
  'Reflected in a funhouse mirror, stretched and distorted.',
  'Inverted upside-down, sky below and ground above.',
  'Through frosted glass, details obscured and dreamlike.',
  'Tunnel vision, narrow focus with total black around sides.',
  'Split-screen with mirror image on both sides.',
  'From inside looking out through a keyhole.',
  'Miniature diorama lit from above like a museum display.',
  'Vertical extreme close-up, compressed depth.',
  'Looking backward while moving forward through space.',
  'Silhouette shot against overwhelming bright background.',
  'Isometric technical drawing style, impossible geometry.',
  'From the edge of a cliff looking down into infinite void.',
  'Macro shot of something microscopic becoming vast.',
  'Through the bars of a cage or prison.',
  'Spinning camera, motion blur suggesting rotation.',
  'From inside a bottle looking out at a world distorted by glass.',
  'Overhead flat-lay arranged like objects on a table.',
  'Worm',
  's nest high in a tree looking down.',
  'In a mirror reflection rather than direct view.',
  'Viewed through stained glass, colored and fragmented.',
  'From inside a whirlpool or spiral, looking toward the center.',
  'Extreme wide shot showing tiny figure in vast landscape.',
  'Through a prism, split into spectrum of colors.',
  'Doll',
  's tunnel beneath the surface.',
  'Extreme low angle making small things seem monumental.',
  'Through the lens of someone else',
];

// ── Derive complexity from user choices (no UI slider needed) ──────────────
// High-complexity signals: detailed/ornate/epic interests and moods
// Low-complexity signals: cute/cozy/minimal interests and moods
export const HIGH_COMPLEXITY_SIGNALS = new Set([
  // interests
  'architecture',
  'fantasy',
  'sci_fi',
  'abstract',
  'geek',
  // personality tags
  'elegant',
  'mysterious',
  'fierce',
  'bold',
  'futuristic',
  // eras
  'victorian',
  'steampunk',
  'art_deco',
  'medieval',
]);
export const LOW_COMPLEXITY_SIGNALS = new Set([
  // interests
  'cute',
  'food',
  'animals',
  // personality tags
  'cozy',
  'gentle',
  'peaceful',
  'playful',
  // eras
  'modern',
  'retro',
]);


// ═══════════════════════════════════════════════════════════════════════════════
// Utilities (from lib/recipe/utils.ts)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recipe Engine — utility functions.
 */


export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickWithChaos<T>(preferred: T[], allOptions: T[], chaos: number): T {
  // chaos 0 = always pick from preferred; chaos 1 = 50/50 preferred vs random
  // Small preferred sets (1-2 items) get a variety bonus to avoid monotony
  const varietyBonus = preferred.length <= 2 ? 0.15 : 0;
  if (preferred.length === 0 || Math.random() < chaos * 0.5 + varietyBonus) {
    return pick(allOptions);
  }
  return pick(preferred);
}

export function rollAxis(value: number): 'high' | 'low' {
  return Math.random() < value ? 'high' : 'low';
}

export function getModifierByValue(modifiers: string[], value: number): string {
  const index = Math.min(modifiers.length - 1, Math.floor(value * modifiers.length));
  return modifiers[index];
}

export function filterPool(
  pool: TaggedOption[],
  rolledAxes: Record<string, 'high' | 'low'>,
  chaos: number = 0.5
): string {
  // Score everything first — we use the scores for both normal and wildcard picks
  const scored = pool.map((opt) => {
    let score = 0;
    if (opt.axes) {
      for (const [axis, val] of Object.entries(opt.axes)) {
        if (rolledAxes[axis] === val) score += 1;
        else score -= 0.5;
      }
    }
    return { text: opt.text, score };
  });
  scored.sort((a, b) => b.score - a.score);

  // Wildcard chance scales with chaos: 10% at chaos=0, 40% at chaos=1
  if (Math.random() < 0.1 + chaos * 0.3) {
    // High chaos (>=0.5): full random from entire pool — anything goes
    // Low chaos (<0.5): pick from top half — surprising but won't clash
    const wildcardPool = chaos >= 0.5 ? scored : scored.slice(0, Math.ceil(scored.length / 2));
    return pick(wildcardPool).text;
  }

  // Normal pick: top 15 scorers — wide enough for real variety across 90+ mediums
  return pick(scored.slice(0, 15)).text;
}


// ═══════════════════════════════════════════════════════════════════════════════
// Builder (from lib/recipe/builder.ts)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recipe Engine — core build logic.
 *
 * Every attribute the user picks MUST change the output. If it doesn't reach
 * the prompt, it shouldn't be in the onboarding.
 *
 * Prompt layers:
 *   1. TECHNIQUE  — medium, palette, weirdness, scale (controls HOW it looks)
 *   2. SUBJECT    — interests, spirit companion (controls WHAT it shows)
 *   3. WORLD      — era, setting (controls WHERE/WHEN)
 *   4. ATMOSPHERE  — mood, personality tags, scene atmosphere (controls HOW IT FEELS)
 */






export function expandInterest(interest: string): string {
  const flavors = INTEREST_FLAVORS[interest];
  if (!flavors) return interest;
  // Always expand vague interests; 40% chance for concrete ones
  if (ALWAYS_EXPAND.has(interest) || Math.random() < 0.4) {
    return pick(flavors);
  }
  return interest;
}

function deriveComplexity(recipe: Recipe): number {
  const allChoices = [
    ...(recipe.interests ?? []),
    ...(recipe.personality_tags ?? []),
    ...(recipe.eras ?? []),
  ];
  let highCount = 0;
  let lowCount = 0;
  for (const choice of allChoices) {
    if (HIGH_COMPLEXITY_SIGNALS.has(choice)) highCount++;
    if (LOW_COMPLEXITY_SIGNALS.has(choice)) lowCount++;
  }
  // Base 0.5, nudged by signal balance. Range ~0.2-0.8.
  const delta = (highCount - lowCount) * 0.08;
  return Math.max(0.2, Math.min(0.8, 0.5 + delta));
}

// Mood axis profiles — must match constants/onboarding.ts MOOD_TILES
const MOOD_AXIS_PROFILES: Record<string, { energy: number; brightness: number; warmth: number }> = {
  cozy: { energy: 0.2, brightness: 0.6, warmth: 0.8 },
  epic: { energy: 0.9, brightness: 0.6, warmth: 0.5 },
  dreamy: { energy: 0.2, brightness: 0.8, warmth: 0.6 },
  moody: { energy: 0.3, brightness: 0.2, warmth: 0.3 },
  playful: { energy: 0.6, brightness: 0.8, warmth: 0.7 },
  serene: { energy: 0.1, brightness: 0.7, warmth: 0.4 },
  intense: { energy: 0.9, brightness: 0.3, warmth: 0.3 },
  nostalgic: { energy: 0.3, brightness: 0.5, warmth: 0.7 },
  mysterious: { energy: 0.5, brightness: 0.2, warmth: 0.2 },
  whimsical: { energy: 0.5, brightness: 0.7, warmth: 0.6 },
  dramatic: { energy: 0.8, brightness: 0.3, warmth: 0.4 },
  peaceful: { energy: 0.1, brightness: 0.6, warmth: 0.5 },
  romantic: { energy: 0.3, brightness: 0.7, warmth: 0.8 },
  spooky: { energy: 0.5, brightness: 0.2, warmth: 0.2 },
  euphoric: { energy: 0.9, brightness: 0.9, warmth: 0.6 },
};

export function buildPromptInput(recipe: Recipe, archetype?: DreamArchetype): PromptInput {
  // Defensive defaults for recipes saved before new fields were added
  let interests = recipe.interests ?? [];
  const colorPalettes = recipe.color_palettes ?? [];
  const personalityTags = recipe.personality_tags ?? [];
  const eras = recipe.eras ?? [];
  const settings = recipe.settings ?? [];
  const sceneAtmospheres = recipe.scene_atmospheres ?? [];
  const spiritCompanion = recipe.spirit_companion ?? null;
  const axes = { ...DEFAULT_RECIPE.axes, ...recipe.axes };
  // Derive complexity from user's choices instead of dead 0.5
  axes.complexity = deriveComplexity(recipe);
  const chaos = axes.chaos;

  // ARCHETYPE MODE: If an archetype is provided, lock the lead interest
  // to the archetype's trigger interest. This focuses the dream on one
  // identity while letting all the Chord machinery do the creative work.
  if (archetype) {
    // Find which of the user's interests matches the archetype trigger
    const archetypeInterest = interests.find(i =>
      archetype.flavor_keywords.length > 0 ? true : true // always use first trigger
    );
    // Lock interests to just the archetype's trigger interest(s)
    // but only if the user actually has that interest
    const matchingInterests = interests.filter(i =>
      (archetype as unknown as { trigger_interests?: string[] }).trigger_interests?.includes(i)
    );
    if (matchingInterests.length > 0) {
      interests = matchingInterests;
    }
  }

  // If the user selected moods during onboarding, randomly sample ONE mood's
  // axes for this dream instead of using the baked-in average.
  const selectedMoods = recipe.selected_moods ?? [];

  // ARCHETYPE MODE: If archetype has a trigger mood, use that instead of random
  if (archetype) {
    const archMoods = (archetype as unknown as { trigger_moods?: string[] }).trigger_moods ?? [];
    const matchingMood = archMoods.find(m => selectedMoods.includes(m)) ?? archMoods[0];
    if (matchingMood) {
      const profile = MOOD_AXIS_PROFILES[matchingMood];
      if (profile) {
        axes.energy = profile.energy;
        axes.brightness = profile.brightness;
        axes.color_warmth = profile.warmth;
      }
    }
  } else if (selectedMoods.length > 0) {
    const moodKey = pick(selectedMoods);
    const profile = MOOD_AXIS_PROFILES[moodKey];
    if (profile) {
      axes.energy = profile.energy;
      axes.brightness = profile.brightness;
      axes.color_warmth = profile.warmth;
    }
  }

  // Roll dice on each axis
  const rolled = {
    realism: rollAxis(axes.realism),
    complexity: rollAxis(axes.complexity),
    energy: rollAxis(axes.energy),
    color_warmth: rollAxis(axes.color_warmth),
    brightness: rollAxis(axes.brightness),
  };

  // TECHNIQUE layer
  const medium = filterPool(MEDIUM_POOL, rolled, chaos);
  const paletteKey = colorPalettes.length > 0 ? pick(colorPalettes) : 'everything';
  const colorKeywordsStr = PALETTE_KEYWORDS[paletteKey] || '';
  const weirdnessModifier = getModifierByValue(WEIRDNESS_MODIFIERS, axes.weirdness);
  const scaleModifier = getModifierByValue(SCALE_MODIFIERS, axes.scale);

  // SUBJECT layer
  // Usually 1 interest for focused dreams, sometimes 2 for chaos/variety
  const sampleCount = Math.random() < 0.3 + chaos * 0.3 ? 2 : 1;
  const shuffledInterests = [...interests].sort(() => Math.random() - 0.5);
  const sampledInterests = shuffledInterests.slice(0, Math.min(sampleCount, interests.length));
  // Only include character actions when energy is high — low energy = scenic/atmospheric
  const includeAction = Math.random() < axes.energy;
  const action = includeAction ? pick(ACTIONS) : '';
  const sceneType = pick(SCENE_TYPES);
  const spiritAppears = spiritCompanion !== null && Math.random() < 0.08;

  // Pick a dream subject — creature/character, or nothing (let scene/setting drive)
  // When archetype is active, skip the random subject so the focused interest drives the scene
  const subjectRoll = Math.random();
  let dreamSubject = '';
  if (!archetype) {
    if (subjectRoll < 0.3) {
      // 30% — a fantastical creature or character
      dreamSubject = pick(DREAM_SUBJECTS);
      // 20% chance to pluralize — "a dragon" becomes "a group of dragons"
      if (Math.random() < 0.2 && dreamSubject.startsWith('a ')) {
        const groupWords = ['a group of', 'a pack of', 'a flock of', 'a swarm of', 'an army of', 'a parade of', 'a crew of', 'a trio of'];
        const singular = dreamSubject.slice(2); // remove "a "
        dreamSubject = `${pick(groupWords)} ${singular}s`;
      }
    } else if (subjectRoll < 0.35) {
      // 5% — spirit companion as main subject
      dreamSubject = spiritCompanion
        ? `a magical ${spiritCompanion.replace(/_/g, ' ')}`
        : pick(DREAM_SUBJECTS);
    }
    // 65% — no subject, let setting/interests/mood drive the scene
  }

  // WORLD layer — sometimes swap in a wild bonus location/era for variety
  let eraKeywordsStr: string;
  if (Math.random() < 0.15 + chaos * 0.3) {
    // Bonus era — base 15% + chaos bonus, with 308 options there's tons of variety
    eraKeywordsStr = pick(BONUS_ERAS);
  } else {
    const allEras = Object.keys(ERA_KEYWORDS);
    const eraKey = eras.length > 0 ? pickWithChaos(eras, allEras, chaos) : pick(allEras);
    const eraVariations = ERA_KEYWORDS[eraKey];
    eraKeywordsStr = eraVariations ? pick(eraVariations) : '';
  }

  let settingKeywordsStr: string;
  if (Math.random() < 0.15 + chaos * 0.3) {
    // Bonus setting — base 15% + chaos bonus, with 308 options there's tons of variety
    settingKeywordsStr = pick(BONUS_SETTINGS);
  } else {
    const allSettings = Object.keys(SETTING_KEYWORDS);
    const settingKey =
      settings.length > 0 ? pickWithChaos(settings, allSettings, chaos) : pick(allSettings);
    const settingVariations = SETTING_KEYWORDS[settingKey];
    settingKeywordsStr = settingVariations ? pick(settingVariations) : '';
  }

  // ATMOSPHERE layer
  const mood = filterPool(MOOD_POOL, rolled, chaos);
  const lighting = filterPool(LIGHTING_POOL, rolled, chaos);

  const tagCount = Math.min(3, personalityTags.length);
  const shuffledTags = [...personalityTags].sort(() => Math.random() - 0.5);
  const sampledTags = shuffledTags.slice(0, Math.max(1, tagCount));

  const allAtmospheres = Object.keys(SCENE_ATMOSPHERE_KEYWORDS);
  const atmosphereKey =
    sceneAtmospheres.length > 0
      ? pickWithChaos(sceneAtmospheres, allAtmospheres, chaos)
      : pick(allAtmospheres);
  const sceneAtmosphere = SCENE_ATMOSPHERE_KEYWORDS[atmosphereKey] || '';

  return {
    medium,
    colorKeywords: colorKeywordsStr,
    weirdnessModifier,
    scaleModifier,
    interests: sampledInterests,
    action,
    sceneType,
    spiritCompanion,
    spiritAppears,
    dreamSubject,
    eraKeywords: eraKeywordsStr,
    settingKeywords: settingKeywordsStr,
    mood,
    lighting,
    personalityTags: sampledTags,
    sceneAtmosphere,
  };
}

/**
 * Build a lean fallback prompt (used ONLY when Haiku is unavailable).
 * Picks the 5 most impactful elements — medium, subject, setting, mood, framing.
 * Flux handles short punchy prompts better than walls of text.
 */
export function buildRawPrompt(input: PromptInput): string {
  const parts: string[] = [];

  // 1. Art style anchor
  parts.push(input.medium + '.');

  // 2. Subject — one clear thing to depict
  const interestStr = input.interests.map(expandInterest).join(' and ');
  if (input.dreamSubject) {
    parts.push(`${input.dreamSubject}, ${interestStr} theme.`);
  } else {
    parts.push(`A ${interestStr} scene.`);
  }

  // 3. Setting — one line, where this happens
  if (input.settingKeywords) parts.push(input.settingKeywords + '.');

  // 4. Mood + lighting — how it feels
  parts.push(`${input.mood}, ${input.lighting}.`);

  // 5. Color palette
  if (input.colorKeywords) parts.push(input.colorKeywords + '.');

  // 6. Optional spice (one of: composition, action, spirit, weirdness)
  const spice: string[] = [];
  const comp = pick(COMPOSITIONS);
  if (comp) spice.push(comp);
  if (input.action) spice.push(`Someone ${input.action}.`);
  if (input.spiritAppears && input.spiritCompanion) {
    spice.push(`Hidden somewhere: a small ${input.spiritCompanion.replace(/_/g, ' ')}.`);
  }
  if (input.weirdnessModifier) spice.push(input.weirdnessModifier + '.');
  // Pick just ONE spice element to keep it tight
  if (spice.length > 0) parts.push(pick(spice));

  parts.push('Stylized characters welcome. No photorealistic faces. No nudity.');

  return parts.join(' ');
}

/**
 * Build a creative brief for Haiku to imagine a dream.
 * Haiku's job: pick the BEST 4-5 elements and weave them into ONE cohesive scene.
 * Everything is phrased as INSPIRATION, not literal instructions.
 */
export function buildHaikuPrompt(input: PromptInput): string {
  // Pick a random composition for Haiku to consider
  const comp = pick(COMPOSITIONS);

  return `You are a dream artist creating a single stunning image for someone. Below are ingredients rolled from their taste profile. Your job is NOT to use all of them — pick the 4-5 that work best together and IGNORE the rest. Competing elements make bad images.

PRIORITY ORDER (most → least important):
1. ART MEDIUM (always use this): ${input.medium}
2. SUBJECT: ${input.dreamSubject || input.interests.map(expandInterest).join(' and ')}
3. SETTING: ${input.settingKeywords}
4. MOOD + LIGHTING: ${input.mood}, ${input.lighting}
5. COLOR PALETTE: ${input.colorKeywords || 'vivid and expressive'}

OPTIONAL — use if they enhance the scene, skip if they clash:
- Era flavor: ${input.eraKeywords}
- Weather: ${input.sceneAtmosphere}
- Personality vibe: ${input.personalityTags.join(', ')}
- Framing: ${input.scaleModifier}
${input.weirdnessModifier ? `- Surrealism: ${input.weirdnessModifier}` : ''}
${input.action ? `- Action: ${input.action}` : ''}
${input.spiritAppears && input.spiritCompanion ? `- Spirit companion: a ${input.spiritCompanion.replace(/_/g, ' ')} hidden in the scene` : ''}
${comp ? `- Composition idea: ${comp}` : ''}
${input.sceneType ? `- Scene type: ${input.sceneType}` : ''}

WRITE a single image prompt (max 60 words) with rich, saturated, beautiful colors. Start with the art style. Describe ONE specific, coherent scene — not a list of ingredients.

RULES:
- If elements conflict, DROP the lower-priority one. A coherent scene beats a complete checklist.
- Characters should be stylized, illustrated, or silhouetted — NEVER photorealistic human faces or bodies. If a person appears, they should feel like part of the art style (cartoon, painted, sketched), not a photo of a real person. Favor facing toward the viewer. Vary their age — kids, teens, adults, elderly are all welcome.
- No nudity or explicit content
- Be concrete and visual, not poetic or abstract
- The result should make someone say "that's MY dream bot — it gets me"
- NEVER show a character with their back to the viewer. Characters should ALWAYS face toward us or be shown from the side. No "figure gazing at landscape from behind", no "lone silhouette on cliff edge", no "person looking up at giant glowing thing". These are banned.
- LEAN INTO THE ART STYLE: if the medium is cartoon, make it LOOK like a cartoon — exaggerated, flat colors, bold outlines. Don't let it default to photorealistic with a filter. The medium should fundamentally change HOW the image looks.
- NEVER include text, words, letters, speech bubbles, signs with writing, or any readable text in the scene. Images only, no text.

Output ONLY the prompt, nothing else.`;
}

/** Archetype interface — used by the edge function to pass archetype data */
export interface DreamArchetype {
  key: string;
  name: string;
  prompt_context: string;
  flavor_keywords: string[];
}

