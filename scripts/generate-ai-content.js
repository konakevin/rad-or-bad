#!/usr/bin/env node
'use strict';

/**
 * generate-ai-content.js — Generates AI images via fal.ai Flux Pro and posts them to Rad or Bad.
 *
 * Uses a house account (ai@radorbad.dev / radorbad) as the poster.
 * Prompts are built by randomly combining subject + setting + style + twist.
 *
 * Usage:
 *   node scripts/generate-ai-content.js                # generate 10 images
 *   node scripts/generate-ai-content.js --count 25     # generate 25 images
 *   node scripts/generate-ai-content.js --dry-run      # just print prompts, no generation
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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE env vars (EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}
if (!FAL_API_KEY) {
  console.error('Missing FAL_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? parseInt(args[idx + 1], 10) : fallback;
}
const COUNT = getArg('count', 10);
const DRY_RUN = args.includes('--dry-run');
function getStringArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args.slice(idx + 1).join(' ') : null;
}
const CUSTOM_PROMPT = getStringArg('prompt');

// ── Prompt Slots ─────────────────────────────────────────────────────────────

const SUBJECTS = [
  'ancient robot', 'glass fox', 'floating city', 'mushroom village', 'samurai cat',
  'crystal whale', 'neon dragon', 'tiny astronaut', 'coral throne', 'ghost ship',
  'clockwork butterfly', 'jade temple', 'mirror wolf', 'paper crane army', 'volcanic garden',
  'ice palace', 'desert lighthouse', 'cloud whale', 'moss golem', 'aurora phoenix',
  'jeweled spider', 'obsidian knight', 'porcelain dragon', 'copper forest', 'silk jellyfish',
  'ember fairy', 'stone giant', 'prism deer', 'nebula fish', 'bamboo mech',
  'pearl octopus', 'thunder elk', 'crystal caves', 'sapphire owl', 'golden tortoise',
  'iron bonsai', 'moonlit ruins', 'diamond beetle', 'chrome serpent', 'velvet moth',
  'amber cathedral', 'frost giant', 'starlight library', 'bone garden', 'mercury river',
  'opal butterfly', 'shadow market', 'lantern forest', 'ceramic warrior', 'hollow mountain',
  'fire salamander', 'silver pegasus', 'rusted automaton', 'crystal treehouse', 'lava kraken',
];

const SETTINGS = [
  'inside a volcano', 'on the back of a sea turtle', 'growing out of an old piano',
  'at the bottom of the ocean', 'on a cloud island', 'inside a snow globe',
  'at a midnight carnival', 'in an abandoned greenhouse', 'floating above a canyon',
  'inside a giant seashell', 'on a frozen lake at dawn', 'in a field of crystal flowers',
  'beneath a waterfall', 'inside a hollow tree', 'on the edge of a black hole',
  'in a sunken cathedral', 'on a rooftop in the rain', 'inside a kaleidoscope',
  'on a bridge between mountains', 'in a bioluminescent cave', 'at the top of a lighthouse',
  'inside a music box', 'on a lily pad the size of a house', 'in an infinite library',
  'beneath northern lights', 'on a volcanic beach', 'inside a clocktower',
  'in a garden on the moon', 'in the heart of a thunderstorm', 'on a floating train platform',
  'inside an ancient pyramid', 'on the rim of a crater lake',
];

const STYLES = [
  'Studio Ghibli watercolor', 'cyberpunk noir', '35mm film grain', 'baroque oil painting',
  'vaporwave pastel', 'dark fantasy', 'golden hour hyperreal', 'macro photography',
  'art nouveau illustration', 'ukiyo-e woodblock', 'retro sci-fi poster', 'stained glass',
  'chalk pastel on black paper', 'double exposure photography', 'isometric pixel art',
  'Renaissance fresco', 'neon-lit cinematic', 'dreamlike surrealism', 'botanical illustration',
  'Polaroid snapshot aesthetic', 'matte painting concept art', 'infrared photography',
];

const TWISTS = [
  'being reclaimed by nature', 'made entirely of candy', 'during a thunderstorm',
  'with bioluminescent glow', 'miniature tilt-shift', 'reflected in a puddle',
  'half-submerged in fog', 'dissolving into butterflies', 'frozen mid-explosion',
  'viewed through a raindrop', 'covered in morning frost', 'tangled in fairy lights',
  'emerging from smoke', 'split between two seasons', 'glowing from within',
  'wrapped in vines and flowers', 'crumbling into sand', 'made of stained glass',
  'floating in zero gravity', 'painted on an ancient wall', 'dripping with liquid gold',
  'surrounded by fireflies',
];

// ── Category Mapping ─────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  animals: [
    'fox', 'whale', 'cat', 'butterfly', 'wolf', 'spider', 'deer', 'fish', 'octopus',
    'elk', 'owl', 'tortoise', 'beetle', 'serpent', 'moth', 'pegasus', 'salamander',
    'kraken', 'dragon', 'phoenix', 'jellyfish',
  ],
  nature: [
    'forest', 'garden', 'volcano', 'ocean', 'waterfall', 'lake', 'canyon', 'mountain',
    'cave', 'beach', 'moon', 'river', 'tree', 'flower', 'mushroom', 'coral', 'moss',
    'bamboo', 'bonsai', 'northern lights', 'thunderstorm', 'crater',
  ],
  art: [
    'watercolor', 'oil painting', 'illustration', 'woodblock', 'fresco', 'pixel art',
    'photography', 'stained glass', 'chalk', 'pastel', 'painting', 'cinematic',
    'surrealism', 'baroque', 'art nouveau', 'Renaissance',
  ],
  cute: [
    'tiny', 'fairy', 'candy', 'snow globe', 'music box', 'fairy lights', 'fireflies',
    'paper crane', 'miniature', 'lily pad', 'jeweled', 'pearl', 'opal', 'porcelain',
    'silk', 'velvet', 'ceramic',
  ],
  funny: [
    'samurai cat', 'tiny astronaut', 'candy', 'tilt-shift', 'zero gravity',
  ],
};

function pickCategory(prompt) {
  const lower = prompt.toLowerCase();
  const scores = {};
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        scores[category]++;
      }
    }
  }
  // Find the category with the highest score
  let best = 'art'; // default fallback
  let bestScore = 0;
  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }
  return best;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePrompt() {
  const subject = pick(SUBJECTS);
  const setting = pick(SETTINGS);
  const style = pick(STYLES);
  const twist = pick(TWISTS);
  return `${subject} ${setting}, ${style} style, ${twist}`;
}

// Extract a clean, short caption from a long prompt
// The full prompt goes to Flux; the caption is what users see
function makeCaption(prompt) {
  // Take everything before the first technical/camera term
  const techTerms = /,\s*(shot on|cinematic|depth of field|8K|hyperrealistic|anamorphic|Kodak|Fujifilm|Hasselblad|Roger Deakins|Greg Rutkowski|macro lens|fisheye|tilt-shift|wide shot|concept art|architectural photography|underwater photography|natural light from)/i;
  const match = prompt.match(techTerms);
  const cleaned = match ? prompt.slice(0, match.index) : prompt;
  // Trim and enforce 200 char limit
  const trimmed = cleaned.trim().replace(/,\s*$/, '');
  return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── House Account ────────────────────────────────────────────────────────────

const HOUSE_EMAIL = 'ai@radorbad.dev';
const HOUSE_USERNAME = 'radorbad';
const HOUSE_PASSWORD = 'AiHouseAccount!2024';

async function findOrCreateHouseAccount() {
  // Check if user already exists in the users table
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', HOUSE_EMAIL)
    .single();

  if (existing) {
    console.log(`  House account found: ${existing.id}`);
    return existing.id;
  }

  // Create auth user via admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: HOUSE_EMAIL,
    password: HOUSE_PASSWORD,
    email_confirm: true,
    user_metadata: { username: HOUSE_USERNAME },
  });

  if (authError) {
    // Maybe the auth user exists but the profile row was deleted — try to get from auth
    const { data: listData } = await supabase.auth.admin.listUsers();
    const authUser = listData?.users?.find((u) => u.email === HOUSE_EMAIL);
    if (authUser) {
      // Ensure profile row exists
      await supabase.from('users').upsert({
        id: authUser.id,
        email: HOUSE_EMAIL,
        username: HOUSE_USERNAME,
      }, { onConflict: 'id' });
      console.log(`  House account recovered from auth: ${authUser.id}`);
      return authUser.id;
    }
    throw new Error(`Failed to create house account: ${authError.message}`);
  }

  const userId = authData.user.id;

  // Ensure profile row exists (trigger may have created it, but be safe)
  await supabase.from('users').upsert({
    id: userId,
    email: HOUSE_EMAIL,
    username: HOUSE_USERNAME,
  }, { onConflict: 'id' });

  console.log(`  House account created: ${userId}`);
  return userId;
}

// ── Image Generation ─────────────────────────────────────────────────────────

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
  if (!result.data?.images?.[0]?.url) {
    throw new Error('No image URL in fal.ai response');
  }
  return result.data.images[0].url;
}

// ── Download & Upload ────────────────────────────────────────────────────────

async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToSupabase(imageBuffer, filename) {
  const storagePath = `ai/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

// ── Create Post ──────────────────────────────────────────────────────────────

async function createPost(userId, imageUrl, prompt, category) {
  const { data, error } = await supabase
    .from('uploads')
    .insert({
      user_id: userId,
      image_url: imageUrl,
      media_type: 'image',
      categories: [category],
      caption: makeCaption(prompt),
      is_active: true,
      is_approved: true,
      is_moderated: true,
      total_votes: 0,
      rad_votes: 0,
      bad_votes: 0,
      width: 768,
      height: 1344,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create post: ${error.message}`);
  }
  return data.id;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🎨 Rad or Bad — AI Content Generator');
  console.log('════════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log(`[DRY RUN] Generating ${COUNT} prompts (no images will be created)\n`);
    for (let i = 0; i < COUNT; i++) {
      const prompt = generatePrompt();
      const category = pickCategory(prompt);
      console.log(`  ${String(i + 1).padStart(3)}. [${category.padEnd(7)}] ${prompt}`);
    }
    console.log('\nDone. No images generated (dry run).\n');
    return;
  }

  // Dynamic import for ESM-only @fal-ai/client
  console.log('Loading fal.ai client...');
  const { fal } = await import('@fal-ai/client');
  fal.config({ credentials: FAL_API_KEY });

  console.log('Finding or creating house account...');
  const userId = await findOrCreateHouseAccount();

  const imageCount = CUSTOM_PROMPT ? 1 : COUNT;
  console.log(`\nGenerating ${imageCount} AI image${imageCount > 1 ? 's' : ''}...\n`);

  let succeeded = 0;
  let failed = 0;
  const results = [];

  for (let i = 0; i < imageCount; i++) {
    const prompt = CUSTOM_PROMPT || generatePrompt();
    const category = pickCategory(prompt);
    const num = String(i + 1).padStart(3);

    console.log(`  ${num}/${COUNT} [${category.padEnd(7)}] ${prompt}`);

    try {
      // Step 1: Generate image via fal.ai
      process.stdout.write('         Generating...');
      const falUrl = await generateImage(fal, prompt);
      process.stdout.write(' done. Downloading...');

      // Step 2: Download the image
      const imageBuffer = await downloadImage(falUrl);
      process.stdout.write(` (${(imageBuffer.length / 1024).toFixed(0)}KB) Uploading...`);

      // Step 3: Upload to Supabase Storage
      const filename = `${randomUUID()}.jpg`;
      const publicUrl = await uploadToSupabase(imageBuffer, filename);
      process.stdout.write(' done. Creating post...');

      // Step 4: Create the post record
      const postId = await createPost(userId, publicUrl, prompt, category);
      console.log(` done! (${postId.slice(0, 8)})`);

      succeeded++;
      results.push({ prompt, category, postId });

      // Small delay between requests to be respectful of rate limits
      if (i < COUNT - 1) {
        await sleep(1000);
      }
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      failed++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('Summary');
  console.log('════════════════════════════════════════');
  console.log(`  Total:     ${COUNT}`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed:    ${failed}`);

  if (results.length > 0) {
    const categoryCounts = {};
    for (const r of results) {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    }
    console.log('\n  Categories:');
    for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${cat.padEnd(10)} ${count}`);
    }
  }

  console.log('\nDone!\n');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
