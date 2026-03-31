/**
 * Recipe Engine — translates a user's recipe into layered prompt constraints.
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

import type { Recipe } from '@/types/recipe';
import { DEFAULT_RECIPE } from '@/types/recipe';

// ── TECHNIQUE: Medium Pool ──────────────────────────────────────────────────
// Tagged with axes so the engine filters by rolled values.

interface TaggedOption {
  text: string;
  axes?: Partial<Record<'realism' | 'complexity' | 'energy' | 'color_warmth' | 'brightness', 'high' | 'low'>>;
}

const MEDIUM_POOL: TaggedOption[] = [
  { text: 'ultra-realistic photograph, DSLR, 8K detail', axes: { realism: 'high', complexity: 'high' } },
  { text: 'Pixar-style 3D render, soft rounded shapes, vibrant colors', axes: { realism: 'low', energy: 'low' } },
  { text: 'Studio Ghibli anime watercolor, hand-painted cel animation', axes: { realism: 'low', color_warmth: 'high' } },
  { text: 'adorable chibi kawaii illustration, big sparkly eyes, pastel colors', axes: { realism: 'low', brightness: 'high' } },
  { text: 'oil painting on canvas, visible brushstrokes, impressionist', axes: { realism: 'low', complexity: 'high' } },
  { text: 'papercraft diorama, handmade paper cutouts, miniature', axes: { realism: 'low', brightness: 'high' } },
  { text: 'vintage Disney animation cel, 1950s hand-drawn style', axes: { realism: 'low', color_warmth: 'high' } },
  { text: 'ukiyo-e Japanese woodblock print, flat color, bold outlines', axes: { realism: 'low', complexity: 'low' } },
  { text: 'chalk pastel on black paper, soft edges, dramatic contrast', axes: { brightness: 'low', energy: 'high' } },
  { text: 'claymation stop-motion, visible fingerprint textures in clay', axes: { realism: 'low', complexity: 'low', energy: 'low', brightness: 'high' } },
  { text: 'retro 1980s airbrush illustration, chrome and gradients', axes: { energy: 'high', color_warmth: 'high' } },
  { text: 'botanical scientific illustration, ink linework with watercolor', axes: { complexity: 'high', energy: 'low' } },
  { text: 'stained glass window, bold black leading, jewel-tone translucent color', axes: { brightness: 'high', complexity: 'high' } },
  { text: 'neon sign art, glowing tube lights on dark brick wall', axes: { brightness: 'low', energy: 'high' } },
  { text: 'low-poly geometric 3D render, faceted surfaces', axes: { realism: 'low', complexity: 'low' } },
  { text: 'pencil sketch with watercolor splashes, loose linework', axes: { realism: 'low', complexity: 'low' } },
  { text: 'fantasy book cover illustration, lush detail, dramatic lighting', axes: { complexity: 'high', energy: 'high' } },
  { text: 'vaporwave digital collage, glitch art, pink and cyan', axes: { realism: 'low', energy: 'high' } },
  { text: 'cross-stitch embroidery on fabric, pixel grid texture', axes: { realism: 'low', complexity: 'low' } },
  { text: 'isometric pixel art, retro game aesthetic, crisp edges', axes: { realism: 'low', complexity: 'low' } },
  // ── Additional styles for variety ──
  { text: 'LEGO brick diorama, plastic minifigures, snap-together studs visible', axes: { realism: 'low', complexity: 'low', brightness: 'high' } },
  { text: '8-bit pixel art, NES color palette, chunky pixels, retro gaming', axes: { realism: 'low', complexity: 'low', energy: 'high' } },
  { text: 'classic Disney 2D animation, clean ink outlines, cel-shaded, 1990s era', axes: { realism: 'low', color_warmth: 'high', brightness: 'high' } },
  { text: 'Tim Burton gothic illustration, spindly limbs, spiral shapes, dark whimsy', axes: { realism: 'low', brightness: 'low', energy: 'high' } },
  { text: 'Wes Anderson symmetrical composition, pastel color palette, dollhouse miniature', axes: { realism: 'high', brightness: 'high', complexity: 'high' } },
  { text: 'vintage travel poster, bold flat shapes, limited color palette, art deco lettering', axes: { realism: 'low', complexity: 'low', color_warmth: 'high' } },
  { text: 'dreamy soft-focus film photography, 35mm grain, light leaks, golden tones', axes: { realism: 'high', brightness: 'high', color_warmth: 'high' } },
  { text: 'comic book panel, bold ink outlines, halftone dots, speech bubble style', axes: { realism: 'low', energy: 'high', complexity: 'low' } },
  { text: 'felt and fabric diorama, stitched textures, button eyes, handmade craft', axes: { realism: 'low', brightness: 'high', energy: 'low' } },
  { text: 'mosaic tile artwork, small colorful square tiles, ancient Roman style', axes: { realism: 'low', complexity: 'high', color_warmth: 'high' } },
  { text: 'pop art screen print, bold primary colors, Andy Warhol style', axes: { realism: 'low', energy: 'high', brightness: 'high' } },
  { text: 'cyberpunk neon cityscape style, rain-slicked surfaces, holographic ads', axes: { realism: 'high', brightness: 'low', energy: 'high' } },
  { text: 'gouache painting, thick opaque paint, matte finish, children\'s book illustration', axes: { realism: 'low', brightness: 'high', energy: 'low' } },
  { text: 'origami paper sculpture, crisp folds, white paper with colored accents', axes: { realism: 'low', complexity: 'low', brightness: 'high' } },
  { text: 'art nouveau poster, flowing organic lines, floral borders, Alphonse Mucha style', axes: { realism: 'low', complexity: 'high', color_warmth: 'high' } },
  { text: 'miniature tilt-shift photograph, toy-like depth of field, vivid saturated', axes: { realism: 'high', complexity: 'low', brightness: 'high' } },
  { text: 'woodcut print, bold carved lines, high contrast black and white with one accent color', axes: { complexity: 'low', brightness: 'low', energy: 'high' } },
  { text: 'Dreamworks animation style, expressive characters, cinematic lighting', axes: { realism: 'low', energy: 'high', complexity: 'high' } },
  { text: 'polaroid instant photo, slightly overexposed, white border, nostalgic fade', axes: { realism: 'high', brightness: 'high', energy: 'low' } },
  { text: 'shadow puppet theater, silhouettes against warm backlit screen', axes: { realism: 'low', brightness: 'low', complexity: 'low' } },
  // Anime & Japan inspired
  { text: 'shonen manga action scene, speed lines, dramatic angles, high energy', axes: { realism: 'low', energy: 'high', complexity: 'high' } },
  { text: 'soft shoujo manga, sparkly eyes, flower petals, gentle pastels', axes: { realism: 'low', brightness: 'high', energy: 'low' } },
  { text: 'Makoto Shinkai style, photorealistic anime backgrounds, dramatic sky', axes: { realism: 'high', brightness: 'high', complexity: 'high' } },
  { text: 'K-pop album cover aesthetic, glossy, soft lighting, pastel gradients', axes: { realism: 'high', brightness: 'high', color_warmth: 'low' } },
  { text: 'Japanese ink sumi-e, minimal brushstrokes, zen simplicity, negative space', axes: { realism: 'low', complexity: 'low', energy: 'low' } },
  { text: 'voxel 3D art, chunky isometric blocks, Minecraft meets cute', axes: { realism: 'low', complexity: 'low', brightness: 'high' } },
  { text: 'retro anime VHS aesthetic, 1990s cel animation, warm grain, scanlines', axes: { realism: 'low', color_warmth: 'high', energy: 'high' } },
  // Famous artists
  { text: 'Van Gogh Starry Night style, swirling thick brushstrokes, vivid blues and yellows', axes: { realism: 'low', complexity: 'high', energy: 'high' } },
  { text: 'Picasso cubist style, fragmented geometric faces, multiple perspectives', axes: { realism: 'low', complexity: 'high', energy: 'high' } },
  { text: 'Monet impressionist, soft water lilies, dappled light, dreamy blur', axes: { realism: 'low', brightness: 'high', energy: 'low' } },
  { text: 'Frida Kahlo surrealist self-portrait style, flowers, vivid colors, symbolic', axes: { realism: 'low', complexity: 'high', color_warmth: 'high' } },
  { text: 'Banksy street art, stencil graffiti, political irony, concrete wall', axes: { realism: 'high', energy: 'high', brightness: 'low' } },
  { text: 'Gustav Klimt gold leaf style, ornate patterns, Byzantine mosaic influence', axes: { complexity: 'high', color_warmth: 'high', brightness: 'high' } },
  { text: 'Edward Hopper lonely realism, empty diners, long shadows, isolation', axes: { realism: 'high', energy: 'low', brightness: 'low' } },
  { text: 'Keith Haring bold outlines, dancing figures, primary colors, street art', axes: { realism: 'low', energy: 'high', brightness: 'high' } },
  { text: 'MC Escher impossible architecture, tessellations, mind-bending perspective', axes: { realism: 'low', complexity: 'high', energy: 'low' } },
  { text: 'Basquiat neo-expressionist, raw, crown motif, scrawled text, street', axes: { realism: 'low', energy: 'high', brightness: 'low' } },
  { text: 'Hokusai Great Wave style, Japanese woodblock, dramatic ocean, Mount Fuji', axes: { realism: 'low', energy: 'high', color_warmth: 'low' } },
  { text: 'Rothko color field, massive blocks of bleeding color, meditative', axes: { realism: 'low', complexity: 'low', energy: 'low' } },
  { text: 'Dalí melting clocks surrealism, desert dreamscape, impossible objects', axes: { realism: 'low', complexity: 'high', energy: 'low' } },
  { text: 'Warhol repeated screen print, bold flat pop art colors, celebrity style', axes: { realism: 'low', energy: 'high', brightness: 'high' } },
  { text: 'Bob Ross happy little trees, soft landscape, calm mountains, cabin', axes: { realism: 'low', energy: 'low', color_warmth: 'high' } },
];

// ── ATMOSPHERE: Mood Pool ───────────────────────────────────────────────────

const MOOD_POOL: TaggedOption[] = [
  { text: 'cozy and intimate', axes: { energy: 'low', color_warmth: 'high' } },
  { text: 'epic and grandiose', axes: { energy: 'high', complexity: 'high' } },
  { text: 'ethereal and dreamlike', axes: { energy: 'low', brightness: 'high' } },
  { text: 'playful and whimsical', axes: { energy: 'low', brightness: 'high' } },
  { text: 'moody and atmospheric', axes: { energy: 'low', brightness: 'low' } },
  { text: 'serene and peaceful', axes: { energy: 'low' } },
  { text: 'chaotic and energetic', axes: { energy: 'high' } },
  { text: 'haunting and melancholic', axes: { brightness: 'low', energy: 'low' } },
  { text: 'luxurious and opulent', axes: { complexity: 'high', color_warmth: 'high' } },
  { text: 'nostalgic and warm', axes: { color_warmth: 'high', energy: 'low' } },
  { text: 'surreal and otherworldly', axes: { energy: 'high' } },
  { text: 'tender and gentle', axes: { energy: 'low', brightness: 'high' } },
  { text: 'mischievous and sneaky', axes: { energy: 'high', brightness: 'low' } },
  { text: 'triumphant and heroic', axes: { energy: 'high', brightness: 'high' } },
  { text: 'mysterious and suspenseful', axes: { energy: 'high', brightness: 'low' } },
  { text: 'silly and absurd', axes: { energy: 'high', brightness: 'high' } },
  { text: 'magical and enchanted', axes: { energy: 'low', brightness: 'high' } },
  { text: 'spooky but cute', axes: { brightness: 'low', energy: 'low' } },
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
  { text: 'laser light show, colorful beams cutting through haze', axes: { energy: 'high', brightness: 'high' } },
  { text: 'underwater caustics, rippling light patterns on surfaces', axes: { color_warmth: 'low', energy: 'low' } },
  { text: 'lava glow, deep red-orange light from below', axes: { color_warmth: 'high', energy: 'high' } },
  { text: 'christmas lights bokeh, warm multicolor twinkle', axes: { color_warmth: 'high', brightness: 'high' } },
  { text: 'black light UV glow, neon colors popping against darkness', axes: { brightness: 'low', energy: 'high' } },
  { text: 'sunrise through stained glass, colored light beams', axes: { color_warmth: 'high', brightness: 'high' } },
];

// ── WORLD: Era keywords ─────────────────────────────────────────────────────

const ERA_KEYWORDS: Record<string, string> = {
  ancient: 'ancient civilization, stone and bronze, weathered ruins',
  medieval: 'medieval fantasy, stone castles, candlelit, hand-forged',
  victorian: 'Victorian era, ornate brass and dark wood, gas lamps, lace',
  retro: 'retro 1950s-70s, mid-century modern, vintage colors, analog',
  modern: 'contemporary modern, clean lines, current day',
  far_future: 'far future sci-fi, holographic, chrome and glass, alien tech',
};

// Bonus era vibes mixed in randomly
const BONUS_ERAS = [
  '1920s art deco, jazz age, gold and black, Great Gatsby glamour',
  '1980s synthwave, VHS tracking lines, palm trees, sunset gradient',
  'wild west frontier, dusty saloons, tumbleweeds, golden desert light',
  'roaring 1960s space age, atomic design, googie architecture',
  'Y2K aesthetic, frosted glass, metallic textures, butterfly clips',
  'prehistoric, cave paintings, volcanoes, giant creatures',
  'steampunk Victorian, brass gears, airships, clockwork',
];

// ── WORLD: Setting keywords ─────────────────────────────────────────────────

const SETTING_KEYWORDS: Record<string, string> = {
  cozy_indoors: 'cozy interior, warm room, furniture, shelves, windows',
  wild_outdoors: 'outdoor wilderness, forests, mountains, open sky, natural landscape',
  city_streets: 'urban cityscape, streets, buildings, signs, architecture',
  otherworldly: 'otherworldly realm, floating islands, impossible geometry, alien landscape',
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
  // Hobbies & lifestyle
  'classic muscle car in a neon-lit garage, chrome gleaming',
  'monster truck rally, dirt flying, stadium lights, crowd roaring',
  'fishing boat at dawn, misty lake, rod bending with a catch',
  'campfire in the woods, sparks rising, tent in background',
  'hunting cabin at dawn, frost on windows, rifle rack, antlers on wall',
  'motorcycle on an open highway, desert stretching to horizon',
  'hot rod drag strip, burnout smoke, checkered flag',
  'jeep on a mountain trail, mud splashing, adventure',
  'woodworking shop, handmade furniture, sawdust, warm light',
  'shooting range, brass casings, bullseye target',
  'fly fishing in a mountain river, golden light, waders',
  'lifted truck mudding through a creek, water spray',
  'drift racing, tire smoke, Japanese street racing',
  'vintage VW van at the beach, surfboards on top',
  'rock climbing gym, colorful holds, chalk bag',
  'pottery wheel, hands shaping clay, peaceful studio',
  'home garden, raised beds, tomatoes, sunlight',
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
  'extreme macro close-up, tiny details filling the frame', // 0-0.2
  'intimate close-up, shallow depth of field', // 0.2-0.4
  'medium shot, subject fills most of frame', // 0.4-0.6
  'wide shot, subject in environment, context visible', // 0.6-0.8
  'epic vast panoramic vista, tiny subject in enormous landscape', // 0.8-1.0
];

// ── SUBJECT: Actions ────────────────────────────────────────────────────────

const ACTIONS = [
  'tumbling', 'sneaking', 'leaping', 'balancing precariously',
  'wrestling over', 'tiptoeing', 'diving headfirst into',
  'stacking things into a wobbly tower', 'chasing each other',
  'hiding behind', 'dangling upside down from', 'squeezing through a tiny gap',
  'sliding down', 'bouncing off', 'carrying something absurdly oversized',
  'peeking around a corner at', 'caught mid-sneeze near',
  'building a fort out of', 'surfing on top of',
  'having a tug-of-war over', 'catching something falling from above',
  'being startled by a butterfly', 'whispering a secret about',
  'painting a tiny masterpiece of', 'reading a tiny book together',
  'conducting a tiny orchestra', 'trying to open a jar',
  'posing dramatically for no reason', 'napping peacefully on',
  'exploring a hidden passage in',
  'riding a skateboard off a ramp made of books',
  'having a tea party with unexpected guests',
  'discovering a glowing portal in a wall',
  'photobombing a dramatic scene',
  'trying to catch fireflies in a jar',
  'assembling a tiny robot from spare parts',
  'riding a paper airplane through a canyon',
  'playing a guitar made of clouds',
  'teaching a group of ducklings to march',
  'launching off a catapult into the sky',
  'melting into a puddle of colors',
  'inflating a balloon that lifts them off the ground',
  'running from an adorable tiny avalanche',
  'befriending a creature twice their size',
  'hatching from a giant egg',
  'sword-fighting with breadsticks',
  'planting a flag on a mountain of pillows',
  'parachuting with an umbrella',
  'racing snails and losing',
  'doing a dramatic slow-motion walk',
  'stacking themselves into a totem pole',
  'fishing in a puddle and catching something huge',
  'walking a cloud like a dog on a leash',
  'accidentally summoning something magical',
  'arm-wrestling a much bigger opponent',
];

// ── SUBJECT: Scene types ────────────────────────────────────────────────────

const SCENE_TYPES = [
  'unexpected discovery', 'playful chaos', 'cozy comfort',
  'tiny adventure', 'dramatic moment', 'silly mishap',
  'tender moment', 'creative activity', 'celebration',
  'sneaky heist', 'friendly competition', 'rescue mission',
  'quiet contemplation', 'first encounter', 'magical transformation',
  'boss battle', 'training montage', 'unboxing surprise',
  'cooking disaster', 'dance-off', 'time travel mishap',
  'shrunk to tiny size', 'giant among miniatures', 'dream within a dream',
  'power-up moment', 'plot twist reveal', 'secret level discovered',
  'leveling up', 'treasure hunt', 'building something impossible',
];

// ── SUBJECT: Interest flavor expansions ─────────────────────────────────────
// When an interest is sampled, sometimes replace it with a specific pop culture flavor
const INTEREST_FLAVORS: Record<string, string[]> = {
  gaming: [
    'Pokémon-style', 'Minecraft blocky', 'retro arcade', 'Nintendo',
    'Zelda-inspired', 'Mario world', 'Final Fantasy', 'Sonic the Hedgehog',
    'Animal Crossing', 'Pac-Man ghost', 'Tetris block', 'Kirby',
  ],
  movies: [
    'Star Wars', 'Lord of the Rings', 'Jurassic Park', 'The Matrix',
    'Princess Bride', 'Spirited Away', 'The Dark Crystal', 'NeverEnding Story',
    'Harry Potter', 'Indiana Jones', 'E.T.', 'Ghostbusters',
    'Willy Wonka', 'Back to the Future', 'Labyrinth', 'Coraline',
    'SpongeBob SquarePants', 'LEGO Batman', 'Despicable Me Minions',
    'Nightmare Before Christmas', 'Monsters Inc', 'Inside Out emotions',
    'Avatar Pandora', 'Blade Runner', 'Mad Max wasteland',
    'Shrek fairy tale', 'Wall-E post-apocalyptic', 'Ratatouille kitchen',
    'Toy Story', 'Finding Nemo underwater', 'Up floating house with balloons',
    'Howl\'s Moving Castle', 'Akira neon Tokyo', 'Ghost in the Shell',
    // Marvel & Comics
    'Marvel superhero landing pose', 'Spider-Man swinging between buildings',
    'Avengers assembled, dramatic skyline', 'Wakanda forever, vibranium tech',
    'Gotham rooftop, bat signal', 'X-Men danger room training',
    'comic book POW ZAP action panel', 'graphic novel noir detective',
    'Día de los Muertos sugar skull celebration, marigolds, candles',
    'Stranger Things upside-down, vines, flickering lights',
    'Game of Thrones iron throne room', 'Squid Game playground',
    'Wednesday Addams gothic school', 'Mandalorian desert walk',
    'Bridgerton Regency ballroom', 'Black Mirror dystopia',
  ],
  music: [
    'rock concert', 'jazz club', 'vinyl record', 'synthwave DJ',
    'orchestra pit', 'punk rock', 'hip hop graffiti', 'music festival',
    'karaoke night', 'street musician', 'opera house', 'music box',
    'electric guitar solo, spotlight, smoke machine', 'grand piano in moonlight',
    'drums mid-solo, sticks blurred, cymbals ringing', 'DJ turntables, crowd going wild',
    'acoustic campfire guitar, stars above', 'cello in an empty cathedral',
    'Coachella festival at sunset, ferris wheel, crowd', 'Woodstock vibes, peace signs, mud',
    'Nashville honky-tonk bar, neon signs, cowboy boots', 'underground rave, laser grid, bass drop',
    'mariachi band in a plaza', 'bluegrass porch jam, banjo, rocking chairs',
    'Broadway stage, spotlight, showtime', 'reggae beach bar, Bob Marley vibes',
    'EDM festival main stage, pyrotechnics, LED wall', 'classical string quartet in a garden',
    'beatboxer on a subway platform', 'vinyl record shop, crate digging',
  ],
  geek: [
    'comic book superhero', 'robot workshop', 'mad scientist lab',
    'spaceship bridge', 'wizard library', 'steampunk inventor',
    'hacker terminal', 'alien autopsy', 'mech suit cockpit',
    'TRON light cycle grid', 'holodeck', 'time machine interior',
    'anime mech battle', 'Dragon Ball energy blast', 'Naruto ninja village',
    'Attack on Titan wall', 'Death Note dramatic', 'One Piece pirate ship',
    'Evangelion cockpit', 'K-pop stage with lightsticks', 'Korean street food market at night',
    'Tokyo Akihabara neon signs', 'Japanese konbini at 3am', 'anime rooftop confession scene',
    'manga panel layout', 'Sailor Moon transformation', 'Pokémon gym battle',
    'Studio Ghibli countryside', 'Jujutsu Kaisen cursed energy',
    'Demon Slayer water breathing', 'My Hero Academia hero pose',
  ],
  fantasy: [
    'dragon lair', 'enchanted forest', 'fairy ring', 'wizard tower',
    'elven kingdom', 'dwarf forge', 'magical potion shop', 'floating castle',
    'phoenix nest', 'crystal cave', 'goblin market',
  ],
  sci_fi: [
    'cyberpunk neon city', 'space station', 'alien marketplace',
    'terraformed Mars colony', 'mech hangar', 'hyperspace tunnel',
    'holographic city', 'android assembly line', 'warp gate',
  ],
  cute: [
    'kawaii', 'chibi', 'plushie', 'baby animal',
    'tiny fairy', 'miniature', 'squishy', 'sparkly',
  ],
  dark: [
    'gothic cathedral', 'haunted forest', 'abandoned asylum',
    'vampire castle', 'deep sea abyss', 'necromancer crypt',
    'shadow realm', 'cursed ruins', 'dark fairy tale',
  ],
  animals: [
    'safari wildlife', 'deep ocean creatures', 'arctic penguin colony',
    'butterfly garden', 'dinosaur', 'mythical beast', 'forest critters',
    'baby fox in wildflowers', 'owl in moonlight', 'hummingbird mid-hover',
    'wolf pack howling at aurora', 'sea turtle gliding through kelp',
    'tiny frog on a lily pad', 'majestic eagle soaring over canyon',
    'koi fish in a crystal pond', 'deer in misty morning meadow',
    'polar bear on ice at sunset', 'chameleon in a rainbow of flowers',
    'octopus in a coral garden', 'fireflies in a jar at dusk',
  ],
  nature: [
    'enchanted garden', 'bioluminescent cave', 'volcanic island',
    'ancient redwood forest', 'coral reef', 'aurora-lit tundra',
    'beach at sunset, golden sand, turquoise waves', 'palm trees swaying, hammock, coconuts',
    'tropical flowers, hibiscus, plumeria, jungle color', 'crystal clear mountain spring, moss-covered rocks',
    'standing at the edge of Yosemite valley, vast granite cliffs', 'forest trail with dappled sunlight, ferns and mushrooms',
    'lavender field in Provence, purple rows to the horizon', 'cherry blossom canopy, petals falling like pink snow',
    'waterfall hidden in jungle, mist rainbow, vines', 'desert sand dunes at golden hour, ripple patterns',
    'autumn forest, fiery red orange and gold leaves', 'tide pools, starfish, anemones, tiny crabs',
    'glacier lake, impossibly blue water, snow peaks', 'meadow of wildflowers, butterflies, warm breeze',
    'lightning over open prairie, dramatic storm clouds', 'moss-covered stone bridge over a brook',
    'cave opening looking out at sunlit valley', 'giant sequoia trunk, person for scale, ancient',
    'cliff edge with ocean crashing below, sea spray', 'sunrise from a mountain summit, clouds below',
    'bioluminescent beach at night, glowing waves', 'bamboo forest, green light filtering through',
  ],
  ocean: [
    'deep sea submarine', 'mermaid kingdom', 'shipwreck dive',
    'bioluminescent jellyfish', 'pirate treasure', 'kraken encounter',
    'surfing inside a barrel wave, crystal water', 'whale breaching at sunset',
    'underwater coral city, fish everywhere', 'lighthouse in a storm, waves crashing',
    'sailboat on glass-calm sea, stars reflecting', 'tropical reef snorkeling, clownfish',
    'deep ocean trench, anglerfish glow, darkness', 'beach bonfire, waves lapping, stars above',
  ],
  space: [
    'asteroid mining', 'nebula nursery', 'moon base', 'comet surfing',
    'black hole edge', 'space whale', 'satellite repair', 'alien first contact',
  ],
  sports: [
    'championship arena', 'extreme skateboarding', 'underwater racing',
    'zero-gravity sport', 'dragon boat race', 'robot boxing ring',
    // Extreme sports
    'surfing a massive wave, barrel view, spray and sun', 'skateboard halfpipe trick, graffiti ramp',
    'snowboarding powder run, mountain peak, fresh tracks', 'skiing down alpine slope, trees blurring',
    'BMX dirt jump, mid-air trick, dust cloud', 'rock climbing sheer cliff face, chalk hands',
    'paragliding over valley, tiny world below', 'mountain biking forest trail, leaves flying',
    'bungee jumping off a bridge, freefall moment', 'wakeboarding behind a boat, sunset spray',
    // Traditional sports
    'NFL football stadium, crowd roaring, Friday night lights', 'NBA basketball court, slam dunk mid-air',
    'baseball diamond, pitcher mound, stadium lights', 'soccer pitch, bicycle kick, packed stadium',
    'hockey rink, slapshot, ice spray', 'tennis grand slam court, serve in motion',
    'boxing ring, spotlight, dramatic corner', 'MMA octagon, dramatic face-off',
    'Olympic podium, gold medal moment, flags flying', 'golf course at sunrise, dew on green',
    // Gym & fitness
    'gym weight room, iron plates, chalk dust, determination', 'yoga pose on a cliff at sunrise',
    'CrossFit box, tire flips, ropes, gritty', 'running track, sprint finish, motion blur',
  ],
  travel: [
    'Eiffel Tower at midnight', 'cherry blossom temple in Kyoto',
    'Venetian gondola canal', 'Machu Picchu sunrise', 'Northern Lights Iceland',
    'hot air balloon over Cappadocia', 'Great Wall misty morning',
    'Santorini sunset', 'safari savanna', 'bamboo forest path',
    'Hawaiian beach at sunset', 'Disneyland Main Street USA',
    'Grand Canyon overlook', 'Yellowstone geyser',
    'Swiss Alps chalet', 'Bali temple', 'New York skyline at dusk',
    'Caribbean island paradise', 'Maldives overwater villa',
    'Redwood forest trail', 'Niagara Falls mist',
    'Amalfi Coast road', 'Petra rose-red canyon',
    'Banff turquoise lake', 'Angkor Wat at dawn',
    'Paris cafe with croissants', 'London double-decker bus in rain',
    'Tokyo Tower neon night', 'Dubai skyline futuristic',
  ],
  food: [
    'tiny bakery', 'ramen shop at midnight', 'candy factory',
    'giant fruit landscape', 'sushi conveyor belt', 'pizza planet',
  ],
  abstract: [
    'impossible geometry', 'fractal dimension', 'color explosion',
    'optical illusion world', 'sacred geometry', 'glitch reality',
  ],
  whimsical: [
    'upside-down world', 'cloud kingdom', 'inside a snowglobe',
    'tiny world in a bottle', 'music box interior', 'kaleidoscope dimension',
  ],
  architecture: [
    'impossible Escher staircase', 'art deco skyscraper', 'treehouse city',
    'ice palace', 'underground bunker', 'futuristic greenhouse',
  ],
  fashion: [
    'haute couture runway', 'cyberpunk streetwear', 'fairy tale ballgown',
    'space suit fashion', 'steampunk accessories', 'neon rave outfit',
  ],
  pride: [
    'rainbow flag colors flowing through the sky', 'pride parade confetti and joy',
    'love-is-love neon sign glowing', 'rainbow crosswalk in a city',
    'colorful celebration with rainbow balloons', 'pride festival with glitter and color',
    'rainbow aurora in the night sky', 'hearts and rainbows everywhere',
    'chosen-family gathering under string lights', 'rainbow paint splashes on everything',
  ],
};

// Interests that are too vague on their own — always expand to a specific flavor
const ALWAYS_EXPAND = new Set(['gaming', 'movies', 'music', 'geek', 'sports', 'travel', 'pride']);

function expandInterest(interest: string): string {
  const flavors = INTEREST_FLAVORS[interest];
  if (!flavors) return interest;
  // Always expand vague interests; 40% chance for concrete ones
  if (ALWAYS_EXPAND.has(interest) || Math.random() < 0.4) {
    return pick(flavors);
  }
  return interest;
}

// ── Engine Utilities ────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWithChaos<T>(preferred: T[], allOptions: T[], chaos: number): T {
  // chaos 0 = always pick from preferred; chaos 1 = 50/50 preferred vs random
  if (preferred.length === 0 || Math.random() < chaos * 0.5) {
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

function filterPool(pool: TaggedOption[], rolledAxes: Record<string, 'high' | 'low'>): string {
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
  const top = scored.slice(0, 5);
  return pick(top).text;
}

// ── Public Interface ────────────────────────────────────────────────────────

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
  // WORLD layer
  eraKeywords: string;
  settingKeywords: string;
  // ATMOSPHERE layer
  mood: string;
  lighting: string;
  personalityTags: string[];
  sceneAtmosphere: string;
}

export function buildPromptInput(recipe: Recipe): PromptInput {
  // Defensive defaults for recipes saved before new fields were added
  const interests = recipe.interests ?? [];
  const colorPalettes = recipe.color_palettes ?? [];
  const personalityTags = recipe.personality_tags ?? [];
  const eras = recipe.eras ?? [];
  const settings = recipe.settings ?? [];
  const sceneAtmospheres = recipe.scene_atmospheres ?? [];
  const spiritCompanion = recipe.spirit_companion ?? null;
  const axes = { ...DEFAULT_RECIPE.axes, ...recipe.axes };
  const chaos = axes.chaos;

  // Roll dice on each axis
  const rolled = {
    realism: rollAxis(axes.realism),
    complexity: rollAxis(axes.complexity),
    energy: rollAxis(axes.energy),
    color_warmth: rollAxis(axes.color_warmth),
    brightness: rollAxis(axes.brightness),
  };

  // TECHNIQUE layer
  const medium = filterPool(MEDIUM_POOL, rolled);
  const paletteKey = colorPalettes.length > 0 ? pick(colorPalettes) : 'everything';
  const colorKeywordsStr = PALETTE_KEYWORDS[paletteKey] || '';
  const weirdnessModifier = getModifierByValue(WEIRDNESS_MODIFIERS, axes.weirdness);
  const scaleModifier = getModifierByValue(SCALE_MODIFIERS, axes.scale);

  // SUBJECT layer
  const sampleCount = Math.min(2, interests.length);
  const shuffledInterests = [...interests].sort(() => Math.random() - 0.5);
  const sampledInterests = shuffledInterests.slice(0, Math.max(1, sampleCount));
  const action = pick(ACTIONS);
  const sceneType = pick(SCENE_TYPES);
  const spiritAppears = spiritCompanion !== null && Math.random() < 0.3;

  // WORLD layer — sometimes swap in a wild bonus location/era for variety
  let eraKeywordsStr: string;
  if (Math.random() < chaos * 0.4) {
    // Bonus era — chaos-gated so adventurous users get more surprises
    eraKeywordsStr = pick(BONUS_ERAS);
  } else {
    const allEras = Object.keys(ERA_KEYWORDS);
    const eraKey = eras.length > 0
      ? pickWithChaos(eras, allEras, chaos)
      : pick(allEras);
    eraKeywordsStr = ERA_KEYWORDS[eraKey] || '';
  }

  let settingKeywordsStr: string;
  if (Math.random() < chaos * 0.3) {
    // Bonus setting — pop culture / iconic locations
    settingKeywordsStr = pick(BONUS_SETTINGS);
  } else {
    const allSettings = Object.keys(SETTING_KEYWORDS);
    const settingKey = settings.length > 0
      ? pickWithChaos(settings, allSettings, chaos)
      : pick(allSettings);
    settingKeywordsStr = SETTING_KEYWORDS[settingKey] || '';
  }

  // ATMOSPHERE layer
  const mood = filterPool(MOOD_POOL, rolled);
  const lighting = filterPool(LIGHTING_POOL, rolled);

  const tagCount = Math.min(3, personalityTags.length);
  const shuffledTags = [...personalityTags].sort(() => Math.random() - 0.5);
  const sampledTags = shuffledTags.slice(0, Math.max(1, tagCount));

  const allAtmospheres = Object.keys(SCENE_ATMOSPHERE_KEYWORDS);
  const atmosphereKey = sceneAtmospheres.length > 0
    ? pickWithChaos(sceneAtmospheres, allAtmospheres, chaos)
    : pick(allAtmospheres);
  const sceneAtmosphere = SCENE_ATMOSPHERE_KEYWORDS[atmosphereKey] || '';

  return {
    medium, colorKeywords: colorKeywordsStr, weirdnessModifier, scaleModifier,
    interests: sampledInterests, action, sceneType, spiritCompanion, spiritAppears,
    eraKeywords: eraKeywordsStr, settingKeywords: settingKeywordsStr,
    mood, lighting, personalityTags: sampledTags, sceneAtmosphere,
  };
}

/**
 * Build a raw prompt string from all layers (used when Haiku is unavailable).
 */
export function buildRawPrompt(input: PromptInput): string {
  const parts: string[] = [];

  // TECHNIQUE first — medium MUST lead
  parts.push(`${input.medium}:`);

  // SUBJECT
  parts.push(`${input.interests.map(expandInterest).join(' and ')} scene`);
  parts.push(input.action);

  // WORLD
  if (input.eraKeywords) parts.push(input.eraKeywords);
  if (input.settingKeywords) parts.push(input.settingKeywords);

  // ATMOSPHERE
  parts.push(input.mood);
  parts.push(input.lighting);
  if (input.sceneAtmosphere) parts.push(input.sceneAtmosphere);
  if (input.personalityTags.length > 0) parts.push(input.personalityTags.join(', '));

  // TECHNIQUE modifiers
  if (input.colorKeywords) parts.push(input.colorKeywords);
  if (input.weirdnessModifier) parts.push(input.weirdnessModifier);
  parts.push(input.scaleModifier);

  // SIGNATURE — spirit companion cameo
  if (input.spiritAppears && input.spiritCompanion) {
    const companion = input.spiritCompanion.replace(/_/g, ' ');
    parts.push(`a small ${companion} visible somewhere in the scene`);
  }

  parts.push('portrait orientation 9:16 ratio');

  return parts.join(', ');
}

/**
 * Build the system prompt for Haiku to enhance into a Flux prompt.
 */
export function buildHaikuPrompt(input: PromptInput): string {
  return `Write a Flux image generation prompt. Be BRIEF and DIRECT — Flux ignores flowery language.

TECHNIQUE: ${input.medium}
${input.colorKeywords ? `Colors: ${input.colorKeywords}` : ''}
${input.weirdnessModifier ? `Surrealism: ${input.weirdnessModifier}` : ''}
Framing: ${input.scaleModifier}

SUBJECT: ${input.interests.join(' and ')} themed scene
Action: the subject is ${input.action}
Scene type: ${input.sceneType}
${input.spiritAppears && input.spiritCompanion ? `Include a small ${input.spiritCompanion.replace(/_/g, ' ')} somewhere in the background as a recurring motif.` : ''}

WORLD: ${input.eraKeywords}. ${input.settingKeywords}

ATMOSPHERE: ${input.mood}. ${input.lighting}. ${input.sceneAtmosphere}
Personality: ${input.personalityTags.join(', ')}

RULES:
- Start with the medium name. The medium MUST dominate the visual style.
- ONE sentence for the scene with a specific subject and action.
- ONE sentence for environment, lighting, and technical details.
- Max 80 words total. Portrait 9:16 orientation.
- NO poetic language. Direct visual instructions only.

Output ONLY the prompt.`;
}
