// AUTO-GENERATED from lib/recipe/ modules — keep in sync

/**
 * Recipe Engine — DEPLOY COPY for Supabase Edge Functions (Deno runtime).
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

import type { Recipe } from './recipe.ts';
import { DEFAULT_RECIPE } from './recipe.ts';

// ═══════════════════════════════════════════════════════════════════════════════
// Types (from lib/recipe/types.ts)
// ═══════════════════════════════════════════════════════════════════════════════

interface TaggedOption {
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
// Utils (from lib/recipe/utils.ts)
// ═══════════════════════════════════════════════════════════════════════════════

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWithChaos<T>(preferred: T[], allOptions: T[], chaos: number): T {
  // chaos 0 = always pick from preferred; chaos 1 = 50/50 preferred vs random
  // Small preferred sets (1-2 items) get a variety bonus to avoid monotony
  const varietyBonus = preferred.length <= 2 ? 0.15 : 0;
  if (preferred.length === 0 || Math.random() < chaos * 0.5 + varietyBonus) {
    return pick(allOptions);
  }
  return pick(preferred);
}

function rollAxis(value: number): 'high' | 'low' {
  return Math.random() < value ? 'high' : 'low';
}

function getModifierByValue(modifiers: string[], value: number): string {
  const index = Math.min(modifiers.length - 1, Math.floor(value * modifiers.length));
  return modifiers[index];
}

function filterPool(
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
// Pools (from lib/recipe/pools.ts)
// ═══════════════════════════════════════════════════════════════════════════════

// ── TECHNIQUE: Medium Pool ──────────────────────────────────────────────────
// Tagged with axes so the engine filters by rolled values.

const MEDIUM_POOL: TaggedOption[] = [
  {
    text: 'ultra-realistic photograph, DSLR, 8K detail',
    axes: { realism: 'high', complexity: 'high', energy: 'high', brightness: 'high' },
  },
  {
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
    text: '1960s Pan Am airline advertisement illustration, glamorous jet-age optimism, bold colors',
    axes: { realism: 'low', brightness: 'high', color_warmth: 'high', energy: 'low' },
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
    text: 'mosaic tile artwork, small colorful square tiles, ancient Roman style',
    axes: { realism: 'low', complexity: 'high', color_warmth: 'high' },
  },
  {
    text: 'pop art screen print, bold primary colors, Andy Warhol style',
    axes: { realism: 'low', energy: 'high', brightness: 'high' },
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
    text: 'woodcut print, bold carved lines, high contrast black and white with one accent color',
    axes: { complexity: 'low', brightness: 'low', energy: 'high' },
  },
  {
    text: 'Dreamworks animation style, expressive characters, cinematic lighting',
    axes: { realism: 'low', energy: 'high', complexity: 'high' },
  },
  {
    text: 'faded vintage photograph, slightly overexposed, warm nostalgic tones',
    axes: { realism: 'high', brightness: 'high', energy: 'low' },
  },
  {
    text: 'shadow puppet theater, silhouettes against warm backlit screen',
    axes: { realism: 'low', brightness: 'low', complexity: 'low' },
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
    text: 'Japanese ink sumi-e, minimal brushstrokes, zen simplicity, negative space',
    axes: { realism: 'low', complexity: 'low', energy: 'low' },
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
    text: 'Picasso cubist style, fragmented geometric faces, multiple perspectives',
    axes: {
      realism: 'low',
      complexity: 'high',
      energy: 'high',
      brightness: 'low',
      color_warmth: 'low',
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
    text: 'Banksy street art, stencil graffiti, political irony, concrete wall',
    axes: {
      realism: 'high',
      energy: 'high',
      brightness: 'low',
      complexity: 'low',
      color_warmth: 'low',
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
    text: 'Edward Hopper lonely realism, empty diners, long shadows, isolation',
    axes: {
      realism: 'high',
      energy: 'low',
      brightness: 'low',
      color_warmth: 'high',
      complexity: 'low',
    },
  },
  {
    text: 'Keith Haring bold outlines, dancing figures, primary colors, street art',
    axes: {
      realism: 'low',
      energy: 'high',
      brightness: 'high',
      complexity: 'low',
      color_warmth: 'high',
    },
  },
  {
    text: 'MC Escher impossible architecture, tessellations, mind-bending perspective',
    axes: {
      realism: 'low',
      complexity: 'high',
      energy: 'low',
      brightness: 'low',
      color_warmth: 'low',
    },
  },
  {
    text: 'Basquiat neo-expressionist, raw, crown motif, scrawled text, street',
    axes: { realism: 'low', energy: 'high', brightness: 'low' },
  },
  {
    text: 'Hokusai Great Wave style, Japanese woodblock, dramatic ocean, Mount Fuji',
    axes: { realism: 'low', energy: 'high', color_warmth: 'low' },
  },
  {
    text: 'Rothko color field, massive blocks of bleeding color, meditative',
    axes: { realism: 'low', complexity: 'low', energy: 'low' },
  },
  {
    text: 'Dalí melting clocks surrealism, desert dreamscape, impossible objects',
    axes: { realism: 'low', complexity: 'high', energy: 'low' },
  },
  {
    text: 'Warhol repeated screen print, bold flat pop art colors, celebrity style',
    axes: { realism: 'low', energy: 'high', brightness: 'high' },
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
  // Art movements
  {
    text: 'pointillism, entire image made of tiny colored dots, Seurat style',
    axes: { realism: 'low', complexity: 'high', energy: 'low', brightness: 'high' },
  },
  {
    text: 'Mondrian De Stijl, bold black grid lines, primary color blocks, geometric abstraction',
    axes: { realism: 'low', complexity: 'low', energy: 'low', brightness: 'high' },
  },
  {
    text: 'Bauhaus design, clean geometric shapes, primary colors, functional minimalism',
    axes: { realism: 'low', complexity: 'low', energy: 'low', brightness: 'high' },
  },
  {
    text: 'Soviet Constructivist propaganda poster, bold red and black, angular typography, dramatic composition',
    axes: { realism: 'low', energy: 'high', brightness: 'low', complexity: 'low' },
  },
  {
    text: 'Art Brut outsider art, raw untrained style, intense emotion, unconventional materials',
    axes: { realism: 'low', energy: 'high', complexity: 'low', brightness: 'high' },
  },
  // Modern aesthetics
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
  // Hyperreal & psychedelic
  {
    text: 'hyperrealistic CGI render, impossibly sharp detail, every pore and fiber visible, uncanny perfection',
    axes: { realism: 'high', complexity: 'high', brightness: 'high', energy: 'low' },
  },
  {
    text: 'kaleidoscope vision, infinite symmetrical reflections, fractal patterns, shifting geometry',
    axes: { realism: 'low', complexity: 'high', energy: 'high', brightness: 'high' },
  },
  {
    text: 'DMT visionary art, machine elf entities, sacred geometry, infinite recursive patterns, overwhelming color',
    axes: {
      realism: 'low',
      complexity: 'high',
      energy: 'high',
      brightness: 'high',
      color_warmth: 'high',
    },
  },
  {
    text: 'acid trip visuals, melting surfaces, breathing walls, trails and halos, colors bleeding into each other',
    axes: { realism: 'low', complexity: 'high', energy: 'high', brightness: 'high' },
  },
  {
    text: 'Alex Grey visionary art, translucent bodies, energy meridians, cosmic consciousness',
    axes: {
      realism: 'low',
      complexity: 'high',
      energy: 'high',
      brightness: 'high',
      color_warmth: 'high',
    },
  },
];

// ── ATMOSPHERE: Mood Pool ───────────────────────────────────────────────────

const MOOD_POOL: TaggedOption[] = [
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

const LIGHTING_POOL: TaggedOption[] = [
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

const ERA_KEYWORDS: Record<string, string[]> = {
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
};

// Bonus era vibes mixed in randomly
const BONUS_ERAS = [
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
];

// ── WORLD: Setting keywords ─────────────────────────────────────────────────

const SETTING_KEYWORDS: Record<string, string[]> = {
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
const BONUS_SETTINGS = [
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
];

// ── ATMOSPHERE: Scene atmosphere keywords ────────────────────────────────────

const SCENE_ATMOSPHERE_KEYWORDS: Record<string, string> = {
  sunny_morning: 'bright morning sunlight, dew, fresh, long shadows',
  rainy_afternoon: 'rain falling, wet surfaces, reflections in puddles, overcast',
  snowy_night: 'fresh snow, cold blue night, snowflakes, frost on everything',
  foggy_dawn: 'thick fog, pre-dawn grey light, silhouettes emerging from mist',
  stormy_twilight: 'dramatic storm clouds, purple twilight sky, wind, lightning in distance',
  starry_midnight: 'clear night sky full of stars, milky way, deep blue darkness',
  golden_hour: 'golden hour warm light, long shadows, everything glowing amber',
  aurora_night: 'northern lights in sky, green and purple aurora, snow-covered ground',
};

// ── TECHNIQUE: Color palette keywords ───────────────────────────────────────

const PALETTE_KEYWORDS: Record<string, string> = {
  warm_sunset: 'warm golden amber and crimson color palette',
  cool_twilight: 'cool blue purple and lavender color palette',
  earthy_natural: 'earthy green brown and forest tones',
  soft_pastel: 'soft pastel pink lavender and cream tones',
  dark_bold: 'dark dramatic palette with deep blacks and vivid accent colors',
  monochrome: 'black and white, high contrast, dramatic shadows, no color',
  sepia: 'warm sepia tone, vintage photograph, faded amber and brown',
  neon: 'electric neon colors, hot pink cyan and lime green, glowing edges',
  candy: 'candy pop colors, bubblegum pink, bright magenta, sparkly gold',
  everything: '',
};

// ── TECHNIQUE: Weirdness modifiers ──────────────────────────────────────────

const WEIRDNESS_MODIFIERS = [
  '', // 0-0.2: normal
  'slightly unusual proportions', // 0.2-0.4
  'dreamlike distortions, things not quite right', // 0.4-0.6
  'surreal impossible geometry, melting forms', // 0.6-0.8
  'full Salvador Dali surrealism, gravity-defying, morphing shapes', // 0.8-1.0
];

// ── TECHNIQUE: Scale modifiers ──────────────────────────────────────────────

const SCALE_MODIFIERS = [
  'zoomed in on tiny intricate details', // 0-0.2
  'up close and personal', // 0.2-0.4
  'balanced view showing subject and surroundings', // 0.4-0.6
  'pulled back to show the full environment', // 0.6-0.8
  'vast sweeping view, everything feels enormous', // 0.8-1.0
];

// ── SUBJECT: Actions ────────────────────────────────────────────────────────

const ACTIONS = [
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
];

// ── SUBJECT: Scene types ────────────────────────────────────────────────────

const SCENE_TYPES = [
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
];

// ── SUBJECT: Interest flavor expansions ─────────────────────────────────────
// When an interest is sampled, sometimes replace it with a specific pop culture flavor
const INTEREST_FLAVORS: Record<string, string[]> = {
  gaming: [
    'Pok\u00e9mon-style',
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
    'D\u00eda de los Muertos sugar skull celebration, marigolds, candles',
    'Stranger Things upside-down, vines, flickering lights',
    'Game of Thrones iron throne room',
    'Squid Game playground',
    'Wednesday Addams gothic school',
    'Mandalorian desert walk',
    'Bridgerton Regency ballroom',
    'Black Mirror dystopia',
  ],
  music: [
    'rock concert',
    'jazz club',
    'vinyl record',
    'synthwave DJ',
    'orchestra pit',
    'punk rock',
    'hip hop graffiti',
    'music festival',
    'karaoke night',
    'street musician',
    'opera house',
    'music box',
    'electric guitar solo, spotlight, smoke machine',
    'grand piano in moonlight',
    'drums mid-solo, sticks blurred, cymbals ringing',
    'DJ turntables, crowd going wild',
    'acoustic campfire guitar, stars above',
    'cello in an empty cathedral',
    'Coachella festival at sunset, ferris wheel, crowd',
    'Woodstock vibes, peace signs, mud',
    'Nashville honky-tonk bar, neon signs, cowboy boots',
    'underground rave, laser grid, bass drop',
    'mariachi band in a plaza',
    'bluegrass porch jam, banjo, rocking chairs',
    'Broadway stage, spotlight, showtime',
    'reggae beach bar, Bob Marley vibes',
    'EDM festival main stage, pyrotechnics, LED wall',
    'classical string quartet in a garden',
    'beatboxer on a subway platform',
    'vinyl record shop, crate digging',
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
    'Pok\u00e9mon gym battle',
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
    'cyberpunk neon city',
    'space station',
    'alien marketplace',
    'terraformed Mars colony',
    'mech hangar',
    'hyperspace tunnel',
    'holographic city',
    'android assembly line',
    'warp gate',
  ],
  cute: [
    'kawaii',
    'chibi',
    'plushie',
    'baby animal',
    'tiny fairy',
    'miniature',
    'squishy',
    'sparkly',
  ],
  dark: [
    'gothic cathedral',
    'haunted forest',
    'abandoned asylum',
    'vampire castle',
    'deep sea abyss',
    'necromancer crypt',
    'shadow realm',
    'cursed ruins',
    'dark fairy tale',
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
    'asteroid mining',
    'nebula nursery',
    'moon base',
    'comet surfing',
    'black hole edge',
    'space whale',
    'satellite repair',
    'alien first contact',
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
    'tiny bakery',
    'ramen shop at midnight',
    'candy factory',
    'giant fruit landscape',
    'sushi conveyor belt',
    'pizza planet',
  ],
  abstract: [
    'impossible geometry',
    'fractal dimension',
    'color explosion',
    'optical illusion world',
    'sacred geometry',
    'glitch reality',
  ],
  whimsical: [
    'upside-down world',
    'cloud kingdom',
    'inside a snowglobe',
    'tiny world in a bottle',
    'music box interior',
    'kaleidoscope dimension',
  ],
  architecture: [
    'impossible Escher staircase',
    'art deco skyscraper',
    'treehouse city',
    'ice palace',
    'underground bunker',
    'futuristic greenhouse',
  ],
  fashion: [
    'haute couture aesthetic, fabric textures, elegant design',
    'vintage boutique, mannequins, lace and velvet',
    'fairy tale wardrobe, glass slippers, enchanted gown',
    'steampunk accessories, goggles, gears, leather',
    'pastel aesthetic, soft fabrics, dreamy styling',
    'bohemian textile market, colorful patterns, flowing fabrics',
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

const DREAM_SUBJECTS = [
  // Mythical creatures
  'a massive dragon',
  'a gentle giant sea serpent',
  'a phoenix rising from embers',
  'a tiny fairy with glowing wings',
  'a crystal golem',
  'a floating jellyfish made of light',
  'a ancient tree spirit',
  'a cloud whale swimming through the sky',
  'a mechanical clockwork bird',
  'a galaxy-patterned wolf',
  // Fantasy creatures
  'a baby kraken',
  'an enormous friendly mushroom creature',
  'a bioluminescent deep sea fish',
  'a stone guardian covered in moss',
  'a glass butterfly',
  'a constellation bear',
  'a tiny dragon sleeping on a leaf',
  'a flying manta ray made of aurora light',
  'a fox made of autumn leaves',
  'a cat made of starlight',
  // Objects as subjects
  'a glowing lantern floating alone',
  'an ancient telescope pointed at the stars',
  'a massive ancient tree',
  'a mysterious floating crystal',
  'a forgotten lighthouse',
  'a tiny house inside a seashell',
  'an overgrown abandoned train',
  'a door standing alone in a field',
  'a giant flower blooming in an impossible place',
  'a music box playing to no one',
  // Scale subjects
  'a miniature world inside a dewdrop',
  'an enormous clock tower',
  'a tiny boat on a vast ocean',
  'a single candle in infinite darkness',
  // Puppet & craft characters
  'a fuzzy felt Muppet-style creature with googly eyes and a wide grin',
  'a knitted Sackboy-style character exploring a cardboard world',
  'a gentle long-necked dinosaur in a lush prehistoric valley',
  'a Funko Pop figure with oversized glossy head and tiny body',
  'Falkor the luck dragon soaring through clouds, NeverEnding Story',
  // Insects & botanical
  'a jewel-colored beetle on a mossy log',
  'a praying mantis perfectly still among flowers',
  'a dragonfly with iridescent wings hovering over water',
  'a carnivorous plant with a tiny world inside its mouth',
  'an ancient twisted bonsai tree',
  'a single mushroom glowing in the dark',
  // Weather as subject
  'a tornado made of something unexpected',
  'a single lightning bolt frozen in time',
  'a cloud formation that looks like something alive',
  'a Wallace & Gromit-style inventor tinkering with mad contraptions',
  'a Totoro-sized gentle forest spirit',
  'a brass automaton winding down in a garden',
  "a lighthouse keeper's ghost still tending the light",
  'a whale swimming through the clouds',
  'a train that runs on starlight between floating islands',
  // Stylized characters (illustrated, not photorealistic faces)
  'a tiny cloaked wanderer exploring a strange place',
  'a small explorer with a glowing backpack',
  'a masked spirit dancer',
  'a robot child discovering something for the first time',
  // Attractive/stylized human figures — tasteful, never explicit
  'a fierce warrior in ornate battle armor',
  'a rock star mid-guitar-solo, leather and chains',
  'a shadowy figure in a slinky evening outfit, noir lighting',
  'a blacksmith hammering at a glowing forge',
  'a haute couture figure strutting through a fantasy world',
  'a brooding vampire in a velvet cloak',
  'a sea creature lounging on sun-warmed rocks',
  'a gladiator raising a sword to the crowd',
  'a sorcerer in flowing robes channeling arcane power',
  'an elven archer poised to fire, wind in their hair',
  'a dancer mid-leap, fabric trailing like wings',
  'a cyberpunk hacker in sleek gear and neon visor',
  'a pirate captain at the helm, tattoos showing',
  'a celestial being descending from the clouds in golden armor',
  'a mysterious alchemist stirring a glowing cauldron',
  'a surfer riding a massive wave, sun-bronzed',
  'a mysterious figure in a wet trench coat under city rain',
  'a winged warrior on a flying horse, battle-ready',
];

// Interests that are too vague on their own — always expand to a specific flavor
// Expanded to include more categories so concrete interests also get flavorful variety
const ALWAYS_EXPAND = new Set([
  'gaming',
  'movies',
  'music',
  'geek',
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

const COMPOSITIONS = [
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
  '',
  '',
  '',
  '',
];

// ── Derive complexity from user choices (no UI slider needed) ──────────────
// High-complexity signals: detailed/ornate/epic interests and moods
// Low-complexity signals: cute/cozy/minimal interests and moods
const HIGH_COMPLEXITY_SIGNALS = new Set([
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
const LOW_COMPLEXITY_SIGNALS = new Set([
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
// Builder (from lib/recipe/builder.ts)
// ═══════════════════════════════════════════════════════════════════════════════

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
};

export function buildPromptInput(recipe: Recipe, archetype?: Record<string, unknown>): PromptInput {
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

  // ARCHETYPE MODE: Lock the lead interest to the archetype's trigger
  if (archetype) {
    const triggerInterests = (archetype.trigger_interests as string[]) ?? [];
    const matchingInterests = interests.filter(i => triggerInterests.includes(i));
    if (matchingInterests.length > 0) {
      interests = matchingInterests;
    }
  }

  // Mood sampling: use archetype's trigger mood or random from selected
  const selectedMoods = (recipe as Record<string, unknown>).selected_moods as string[] | undefined;

  if (archetype) {
    const archMoods = (archetype.trigger_moods as string[]) ?? [];
    const matchingMood = archMoods.find(m => selectedMoods?.includes(m)) ?? archMoods[0];
    if (matchingMood) {
      const profile = MOOD_AXIS_PROFILES[matchingMood];
      if (profile) {
        axes.energy = profile.energy;
        axes.brightness = profile.brightness;
        axes.color_warmth = profile.warmth;
      }
    }
  } else if (selectedMoods && selectedMoods.length > 0) {
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
    } else if (subjectRoll < 0.35) {
      // 5% — spirit companion as main subject
      dreamSubject = spiritCompanion
        ? `a magical ${spiritCompanion.replace(/_/g, ' ')}`
        : pick(DREAM_SUBJECTS);
    }
  }
  // 40% — no subject, pure landscape/scene

  // WORLD layer — sometimes swap in a wild bonus location/era for variety
  let eraKeywordsStr: string;
  if (Math.random() < chaos * 0.3) {
    // Bonus era — chaos-gated so adventurous users get more surprises
    eraKeywordsStr = pick(BONUS_ERAS);
  } else {
    const allEras = Object.keys(ERA_KEYWORDS);
    const eraKey = eras.length > 0 ? pickWithChaos(eras, allEras, chaos) : pick(allEras);
    const eraVariations = ERA_KEYWORDS[eraKey];
    eraKeywordsStr = eraVariations ? pick(eraVariations) : '';
  }

  let settingKeywordsStr: string;
  if (Math.random() < chaos * 0.3) {
    // Bonus setting — pop culture / iconic locations
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

WRITE a single image prompt (max 60 words). Start with the art style. Describe ONE specific, coherent scene — not a list of ingredients.

RULES:
- If elements conflict, DROP the lower-priority one. A coherent scene beats a complete checklist.
- Characters should be stylized, illustrated, or silhouetted — NEVER photorealistic human faces or bodies. If a person appears, they should feel like part of the art style (cartoon, painted, sketched), not a photo of a real person.
- No nudity or explicit content
- Be concrete and visual, not poetic or abstract
- The result should make someone say "that's MY dream bot — it gets me"
- AVOID AI ART CLICHÉS: no "figure standing with back to camera gazing at vast landscape", no "lone silhouette on cliff edge", no "person looking up at giant glowing thing". These are overused. Be more creative with composition.
- LEAN INTO THE ART STYLE: if the medium is cartoon, make it LOOK like a cartoon — exaggerated, flat colors, bold outlines. Don't let it default to photorealistic with a filter. The medium should fundamentally change HOW the image looks.
- NEVER include text, words, letters, speech bubbles, signs with writing, or any readable text in the scene. Images only, no text.

Output ONLY the prompt, nothing else.`;
}

// Note: Solo template (buildHaikuPromptDeep/buildHaikuPromptDual) was removed.
// The three-part song now uses: Chord template (buildHaikuPrompt) for both
// Chord and Solo modes, with archetype brief appended in the edge function.
// Beauty mode has its own inline template in the edge function.
