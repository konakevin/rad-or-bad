#!/usr/bin/env node
'use strict';

/**
 * prompt-lab.js — Test the prompt enhancer algorithm.
 *
 * Takes a simple idea prompt, generates 3 wildly different enhanced versions
 * using randomized style axes, then generates all 3 via Flux Pro and uploads
 * them to Kevin's account for easy comparison.
 *
 * Usage:
 *   node scripts/prompt-lab.js "cute cats"
 *   node scripts/prompt-lab.js "abandoned castle" --dry-run
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

// ── Load .env.local ──────────────────────────────────────────────────────────
const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FAL_API_KEY = process.env.FAL_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const KEVIN_EMAIL = 'konakevin@gmail.com';

if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE env vars.'); process.exit(1); }
if (!FAL_API_KEY) { console.error('Missing FAL_API_KEY in .env.local'); process.exit(1); }
if (!ANTHROPIC_API_KEY) { console.error('Missing ANTHROPIC_API_KEY in .env.local'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── CLI ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ideaPrompt = args.filter(a => !a.startsWith('--')).join(' ');

if (!ideaPrompt) {
  console.error('Usage: node scripts/prompt-lab.js "your idea here"');
  process.exit(1);
}

// ── Randomized Style Axes ───────────────────────────────────────────────────

// The MEDIUM axis is the most important — it determines whether the image
// looks like a photo, a cartoon, a painting, etc. This is the #1 driver of variety.
const MEDIUM = [
  'ultra-realistic photograph, DSLR, 8K detail',
  'Pixar-style 3D render, soft rounded shapes, vibrant colors, subsurface scattering',
  'Studio Ghibli anime watercolor, hand-painted cel animation style',
  'adorable chibi kawaii illustration, big sparkly eyes, pastel colors, sticker art',
  'oil painting on canvas, visible brushstrokes, impressionist',
  'papercraft diorama, handmade paper cutouts with subtle shadows, miniature',
  'vintage Disney animation cel, 1950s hand-drawn character design',
  'ukiyo-e Japanese woodblock print, flat color, bold outlines',
  'chalk pastel on black paper, soft edges, dramatic contrast',
  'claymation stop-motion style, visible fingerprint textures in clay',
  'retro 1980s airbrush illustration, chrome and gradients',
  'botanical scientific illustration, detailed ink linework with watercolor washes',
  'vaporwave digital collage, glitch art, pink and cyan, marble busts',
  'stained glass window, bold black leading lines, jewel-tone translucent color',
  'cross-stitch embroidery pattern, fabric texture, pixel grid',
  'neon sign art, glowing tube lights on dark brick wall',
  'low-poly geometric 3D render, faceted surfaces, soft gradient background',
  'pencil sketch with watercolor splashes, loose expressive linework',
  'isometric pixel art, retro game aesthetic, crisp edges',
  'fantasy book cover illustration, lush detail, dramatic lighting',
];

const LIGHTING = [
  'warm candlelight', 'golden hour sunlight', 'soft overcast diffused light',
  'neon city glow', 'cool blue moonlight', 'dramatic backlight silhouette',
  'studio Rembrandt lighting', 'dappled light through leaves',
  'firelight with dancing shadows', 'bioluminescent ambient glow',
  'aurora borealis light', 'foggy diffused streetlight',
];

const MOOD = [
  'cozy and intimate', 'epic and grandiose', 'ethereal and dreamlike',
  'playful and whimsical', 'moody and atmospheric', 'serene and peaceful',
  'chaotic and energetic', 'haunting and melancholic', 'luxurious and opulent',
  'nostalgic and warm', 'surreal and otherworldly', 'tender and gentle',
];

const SETTING = [
  'spring morning with dew drops', 'summer golden hour in a meadow',
  'autumn twilight with falling leaves', 'winter scene with fresh snow',
  'rainy day with reflections in puddles', 'foggy dawn just before sunrise',
  'in a cozy cafe by a window', 'on a mossy log in an enchanted forest',
  'in a sun-dappled garden', 'on a rooftop overlooking a city at night',
  'beside a babbling brook', 'in a field of wildflowers',
  'inside a greenhouse full of tropical plants', 'on a windowsill during a thunderstorm',
];

const DETAIL = [
  'intricate feather detail', 'glistening dewdrops', 'soft bokeh background',
  'volumetric light rays', 'tiny sparkles and glitter particles',
  'shallow depth of field', 'rich saturated colors', 'delicate texture detail',
  'warm color palette', 'cool blue-purple color harmony', 'iridescent shimmer',
  'dramatic shadows', 'soft diffused glow', 'ultra-sharp crisp detail',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Pick a unique set — no axis repeats between the 3 variants
function pickUniqueSet(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function generateThreeEnhancedPrompts(anthropic, idea) {
  const mediums = pickUniqueSet(MEDIUM, 3);
  const moods = pickUniqueSet(MOOD, 3);
  const lightings = pickUniqueSet(LIGHTING, 3);

  const SCENE_TYPES = [
    'unexpected discovery', 'playful chaos', 'cozy comfort',
    'tiny adventure', 'dramatic moment', 'silly mishap',
    'tender moment', 'creative activity', 'celebration',
    'sneaky heist', 'friendly competition', 'rescue mission',
  ];
  const sceneTypes = pickUniqueSet(SCENE_TYPES, 3);

  const ACTIONS = [
    'tumbling', 'sneaking', 'leaping', 'balancing precariously',
    'wrestling over', 'tiptoeing', 'diving headfirst into',
    'stacking things into a wobbly tower', 'chasing each other around',
    'hiding behind', 'dangling upside down from', 'squeezing through a tiny gap',
    'launching off like a catapult', 'sliding down', 'bouncing off',
    'carrying something absurdly oversized', 'doing a dramatic slow-motion dodge',
    'peeking around a corner at', 'caught mid-sneeze near',
    'high-fiving with tiny hands/wings/paws', 'photobombing',
    'building a fort out of', 'surfing on top of',
    'conducting an orchestra of', 'painting a tiny masterpiece of',
    'having a tug-of-war over', 'catching something falling from above',
    'being startled by a butterfly', 'whispering a secret about',
    'doing synchronized swimming in', 'riding on the back of something bigger',
  ];
  const actions = pickUniqueSet(ACTIONS, 3);

  const prompts = [];
  for (let i = 0; i < 3; i++) {
    process.stdout.write(`  Enhancing variant ${i + 1} via Haiku...`);

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Write a Flux image generation prompt. Be BRIEF and DIRECT — Flux ignores flowery language.

Subject: ${idea}
Medium: ${mediums[i]}
Mood: ${moods[i]}
Lighting: ${lightings[i]}
Scene type: ${sceneTypes[i]}
The subject must be: ${actions[i]}

RULES:
- Start with the medium name. Example: "Claymation stop-motion:" or "Watercolor painting:" or "Pixel art:"
- The medium MUST dominate the look. If it says claymation, it must look like clay. If watercolor, visible paper texture and paint bleeds.
- ONE sentence for the scene. Be hyper-specific about what's happening.
- ONE sentence for technical details (textures, colors, composition).
- NO poetic language. NO "bathed in" or "ethereal" or "luminous". Just direct visual instructions.
- Max 80 words total.
- Portrait 9:16 orientation.

Output ONLY the prompt.`,
      }],
    });

    const enhanced = response.content[0].text.trim();
    prompts.push(enhanced);
    console.log(' done');
  }
  return prompts;
}

// ── Caption ─────────────────────────────────────────────────────────────────

function makeCaption(prompt) {
  const techTerms = /,\s*(shot on|cinematic|depth of field|8K|hyperrealistic|anamorphic|Kodak|Fujifilm|Cinestill|Ilford|Hasselblad|macro \d+mm|fisheye|tilt-shift|wide angle|medium format|drone|pinhole|infrared|long exposure|double exposure|split diopter|Lomography|Technicolor|Ektar|expired film|digital clean)/i;
  const match = prompt.match(techTerms);
  const cleaned = match ? prompt.slice(0, match.index) : prompt;
  const trimmed = cleaned.trim().replace(/,\s*$/, '');
  return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed;
}

// ── Category ────────────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  animals: ['cat', 'dog', 'fox', 'whale', 'bird', 'fish', 'deer', 'owl', 'bear', 'wolf', 'kitten', 'puppy', 'bunny', 'panda', 'otter', 'elephant', 'parrot', 'jellyfish', 'octopus', 'butterfly', 'spider', 'moth', 'beetle', 'elk', 'tortoise', 'serpent', 'duckling', 'hedgehog', 'raccoon', 'fawn'],
  nature: ['forest', 'mountain', 'ocean', 'lake', 'waterfall', 'aurora', 'volcano', 'desert', 'garden', 'cave', 'moon', 'stars', 'sunset', 'sunrise', 'storm', 'snow', 'rain', 'flower', 'tree', 'river', 'island', 'cliff', 'canyon', 'nebula', 'bioluminescent', 'coral'],
  art: ['neon', 'graffiti', 'sculpture', 'painting', 'tattoo', 'mural', 'ceramic', 'stained glass', 'origami', 'calligraphy', 'mosaic', 'fresco', 'art deco', 'art nouveau', 'baroque', 'renaissance'],
  cute: ['tiny', 'baby', 'miniature', 'cozy', 'soft', 'fluffy', 'adorable', 'sweet', 'little', 'snuggle', 'kawaii', 'precious'],
  funny: ['silly', 'confused', 'surprised', 'costume', 'weird', 'absurd', 'ridiculous', 'goofy'],
};

function pickCategory(prompt) {
  const lower = prompt.toLowerCase();
  const scores = {};
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[category]++;
    }
  }
  let best = 'art';
  let bestScore = 0;
  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; best = category; }
  }
  return best;
}

// ── Image Gen + Upload ──────────────────────────────────────────────────────

async function generateImage(fal, prompt) {
  const result = await fal.subscribe('fal-ai/flux/dev', {
    input: {
      prompt,
      image_size: { width: 768, height: 1664 },
      num_images: 1,
      output_format: 'jpeg',
      safety_tolerance: '2',
    },
    logs: false,
  });
  if (!result.data?.images?.[0]?.url) throw new Error('No image URL in response');
  return result.data.images[0].url;
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToSupabase(imageBuffer, filename) {
  const storagePath = `ai/${filename}`;
  const { error } = await supabase.storage.from('uploads').upload(storagePath, imageBuffer, {
    contentType: 'image/jpeg', upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from('uploads').getPublicUrl(storagePath);
  return data.publicUrl;
}

async function createPost(userId, imageUrl, prompt, category) {
  const { data, error } = await supabase.from('uploads').insert({
    user_id: userId, image_url: imageUrl, media_type: 'image',
    categories: [category], caption: makeCaption(prompt),
    is_active: true, is_approved: true, is_moderated: true,
    total_votes: 0, rad_votes: 0, bad_votes: 0, width: 768, height: 1664,
  }).select('id').single();
  if (error) throw new Error(`Post failed: ${error.message}`);
  return data.id;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🧪 Prompt Lab — 3 Variants from 1 Idea (Haiku-enhanced)');
  console.log('════════════════════════════════════════════════════════\n');
  console.log(`  Idea: "${ideaPrompt}"\n`);

  // Initialize Anthropic
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const prompts = await generateThreeEnhancedPrompts(anthropic, ideaPrompt);

  console.log('');
  for (let i = 0; i < 3; i++) {
    console.log(`  Variant ${i + 1}:`);
    console.log(`    ${prompts[i]}\n`);
  }

  if (DRY_RUN) {
    console.log('Done (dry run — no images generated).\n');
    return;
  }

  // Load fal
  const { fal } = await import('@fal-ai/client');
  fal.config({ credentials: FAL_API_KEY });

  // Find Kevin
  const { data: kevin } = await supabase.from('users').select('id').eq('email', KEVIN_EMAIL).single();
  if (!kevin) { console.error('Kevin not found!'); process.exit(1); }
  console.log(`  Posting to: ${KEVIN_EMAIL} (${kevin.id})\n`);

  for (let i = 0; i < 3; i++) {
    const prompt = prompts[i];
    const category = pickCategory(prompt);
    process.stdout.write(`  Variant ${i + 1}: Generating...`);

    try {
      const falUrl = await generateImage(fal, prompt);
      process.stdout.write(' done. Downloading...');

      const buffer = await downloadImage(falUrl);
      process.stdout.write(` (${Math.round(buffer.length / 1024)}KB) Uploading...`);

      const filename = `${randomUUID()}.jpg`;
      const publicUrl = await uploadToSupabase(buffer, filename);
      process.stdout.write(' done. Creating post...');

      const postId = await createPost(kevin.id, publicUrl, prompt, category);
      console.log(` done! (${postId.slice(0, 8)})`);
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
    }
  }

  console.log('\n  ✅ Check your profile to compare all 3!\n');
}

main().catch(console.error);
