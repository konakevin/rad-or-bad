#!/usr/bin/env node
'use strict';

/**
 * seed.js — Clean seed for the dream app.
 *
 * Wipes all posts and generates fresh AI images for the @radorbad house account.
 *
 * Usage:
 *   node scripts/seed.js              # clear + generate 10 images
 *   node scripts/seed.js --count 20   # clear + generate 20 images
 *   node scripts/seed.js --no-clear   # generate without clearing
 */

const { createClient } = require('@supabase/supabase-js');
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

if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE env vars.'); process.exit(1); }
if (!FAL_API_KEY) { console.error('Missing FAL_API_KEY.'); process.exit(1); }

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
const NO_CLEAR = args.includes('--no-clear');

// ── House Account ────────────────────────────────────────────────────────────
const HOUSE_EMAIL = 'ai@radorbad.dev';
const HOUSE_USERNAME = 'radorbad';
const HOUSE_PASSWORD = 'AiHouseAccount!2024';

async function findOrCreateHouseAccount() {
  const { data: existing } = await supabase.from('users').select('id').eq('email', HOUSE_EMAIL).single();
  if (existing) return existing.id;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: HOUSE_EMAIL, password: HOUSE_PASSWORD, email_confirm: true,
    user_metadata: { username: HOUSE_USERNAME },
  });

  if (authError) {
    const { data: listData } = await supabase.auth.admin.listUsers();
    const authUser = listData?.users?.find((u) => u.email === HOUSE_EMAIL);
    if (authUser) {
      await supabase.from('users').upsert({ id: authUser.id, email: HOUSE_EMAIL, username: HOUSE_USERNAME }, { onConflict: 'id' });
      return authUser.id;
    }
    throw new Error(`Failed to create house account: ${authError.message}`);
  }

  await supabase.from('users').upsert({ id: authData.user.id, email: HOUSE_EMAIL, username: HOUSE_USERNAME }, { onConflict: 'id' });
  return authData.user.id;
}

// ── Prompt Engine (same as generate-ai-content.js) ──────────────────────────

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
];

const SETTINGS = [
  'inside a volcano', 'on the back of a sea turtle', 'growing out of an old piano',
  'at the bottom of the ocean', 'on a cloud island', 'inside a snow globe',
  'at a midnight carnival', 'in an abandoned greenhouse', 'floating above a canyon',
  'inside a giant seashell', 'on a frozen lake at dawn', 'in a field of crystal flowers',
  'beneath a waterfall', 'inside a hollow tree', 'on the edge of a black hole',
  'in a sunken cathedral', 'on a rooftop in the rain', 'inside a kaleidoscope',
  'on a bridge between mountains', 'in a bioluminescent cave', 'at the top of a lighthouse',
  'inside a music box', 'in an infinite library', 'beneath northern lights',
];

const STYLES = [
  'Studio Ghibli watercolor', 'cyberpunk noir', '35mm film grain',
  'baroque oil painting', 'vaporwave pastel', 'dark fantasy',
  'golden hour hyperreal', 'macro photography', 'art nouveau illustration',
  'ukiyo-e woodblock', 'stained glass', 'chalk pastel on black paper',
  'double exposure photography', 'isometric pixel art', 'neon-lit cinematic',
  'dreamlike surrealism', 'botanical illustration', 'Pixar 3D render',
  'claymation stop-motion', 'retro sci-fi poster',
];

const TWISTS = [
  'being reclaimed by nature', 'made entirely of candy', 'during a thunderstorm',
  'with bioluminescent glow', 'miniature tilt-shift', 'reflected in a puddle',
  'half-submerged in fog', 'dissolving into butterflies', 'frozen mid-explosion',
  'viewed through a raindrop', 'covered in morning frost', 'tangled in fairy lights',
  'emerging from smoke', 'split between two seasons', 'glowing from within',
  'wrapped in vines and flowers', 'crumbling into sand', 'made of stained glass',
  'floating in zero gravity', 'painted on an ancient wall',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generatePrompt() {
  return `${pick(SUBJECTS)} ${pick(SETTINGS)}, ${pick(STYLES)} style, ${pick(TWISTS)}`;
}

function makeCaption(prompt) {
  const techTerms = /,\s*(shot on|cinematic|depth of field|8K|hyperrealistic|Kodak|Fujifilm|Hasselblad|macro \d+mm|fisheye|tilt-shift)/i;
  const match = prompt.match(techTerms);
  const cleaned = match ? prompt.slice(0, match.index) : prompt;
  const trimmed = cleaned.trim().replace(/,\s*$/, '');
  return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed;
}

const CATEGORY_KEYWORDS = {
  animals: ['fox', 'whale', 'cat', 'wolf', 'deer', 'owl', 'spider', 'dragon', 'jellyfish', 'octopus', 'butterfly', 'moth', 'beetle', 'elk', 'tortoise', 'serpent', 'fish', 'phoenix'],
  nature: ['forest', 'mountain', 'ocean', 'lake', 'waterfall', 'volcano', 'garden', 'cave', 'moon', 'aurora', 'bioluminescent', 'coral', 'flower', 'tree', 'frost', 'snow'],
  art: ['neon', 'sculpture', 'painting', 'stained glass', 'origami', 'mosaic', 'baroque', 'art nouveau', 'cathedral', 'library', 'temple'],
  cute: ['tiny', 'baby', 'miniature', 'fairy', 'candy', 'music box', 'snow globe'],
};

function pickCategory(prompt) {
  const lower = prompt.toLowerCase();
  let best = 'art', bestScore = 0;
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = kws.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best;
}

// ── Generation ───────────────────────────────────────────────────────────────

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
  if (!result.data?.images?.[0]?.url) throw new Error('No image URL');
  return result.data.images[0].url;
}

async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function uploadToSupabase(imageBuffer, filename) {
  const storagePath = `ai/${filename}`;
  const { error } = await supabase.storage.from('uploads').upload(storagePath, imageBuffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from('uploads').getPublicUrl(storagePath);
  return data.publicUrl;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌙 Dream Seed');
  console.log('════════════════════════════\n');

  if (!NO_CLEAR) {
    console.log('Clearing all posts...');
    const tables = ['comment_likes', 'comments', 'votes', 'post_shares', 'notifications', 'ai_generation_log', 'uploads'];
    for (const table of tables) {
      await supabase.from(table).delete().gte('created_at', '1970-01-01');
    }
    const { count } = await supabase.from('uploads').select('*', { count: 'exact', head: true });
    console.log(`  Cleared. ${count} posts remaining.\n`);
  }

  const { fal } = await import('@fal-ai/client');
  fal.config({ credentials: FAL_API_KEY });

  const userId = await findOrCreateHouseAccount();
  console.log(`House account: ${userId}\n`);
  console.log(`Generating ${COUNT} dream images...\n`);

  let succeeded = 0;
  for (let i = 0; i < COUNT; i++) {
    const prompt = generatePrompt();
    const category = pickCategory(prompt);
    const num = String(i + 1).padStart(2);
    process.stdout.write(`  ${num}/${COUNT} [${category.padEnd(7)}] ${prompt.slice(0, 60)}...`);

    try {
      const falUrl = await generateImage(fal, prompt);
      const buffer = await downloadImage(falUrl);
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const publicUrl = await uploadToSupabase(buffer, filename);

      await supabase.from('uploads').insert({
        user_id: userId,
        image_url: publicUrl,
        media_type: 'image',
        categories: [category],
        caption: makeCaption(prompt),
        is_active: true,
        is_approved: true,
        is_moderated: true,
        is_ai_generated: true,
        ai_prompt: prompt,
        total_votes: 0, rad_votes: 0, bad_votes: 0,
        width: 768, height: 1664,
      });

      console.log(' ✓');
      succeeded++;
    } catch (err) {
      console.log(` ✗ ${err.message}`);
    }

    if (i < COUNT - 1) await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n  Done! ${succeeded}/${COUNT} images generated.\n`);
}

main().catch(console.error);
