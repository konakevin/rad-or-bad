#!/usr/bin/env node
'use strict';

/**
 * seed-dreamers.js — 10 dreamers × 10 dreams with FORCED visual variety.
 * Each dreamer has a locked medium + color palette so images are visually distinct.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('='); if (eq === -1) continue;
    if (!process.env[t.slice(0, eq).trim()]) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
}

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const FAL_API_KEY = process.env.FAL_API_KEY;
const PASSWORD = 'Dreampass123!';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Each dreamer has a LOCKED medium, color direction, and subject pool.
// This guarantees visual variety across accounts.
const DREAMERS = [
  {
    username: 'luna_glow', email: 'luna@dream.dev',
    medium: 'Studio Ghibli anime watercolor, hand-painted cel animation, soft edges',
    colorDir: 'warm pastel pink, cream, soft gold, lavender tones',
    subjects: ['tiny rabbit reading a book by candlelight', 'cat sleeping on a stack of quilts', 'cottage with smoke from chimney in a flower meadow', 'girl in a sunhat picking wildflowers', 'teapot pouring into a cup surrounded by butterflies', 'baby deer napping under a cherry blossom tree', 'cozy attic room with rain on the window', 'bunny family having a picnic on a hill', 'mushroom house with a tiny door and lantern', 'owl perched on a mossy branch at golden hour'],
    categories: ['cute', 'nature'],
    tags: ['gentle', 'dreamy', 'cozy'],
  },
  {
    username: 'neon_wraith', email: 'wraith@dream.dev',
    medium: 'ultra-realistic photograph, DSLR, 8K detail, cinematic anamorphic',
    colorDir: 'neon cyan, electric blue, hot pink, deep black, rain reflections',
    subjects: ['cyberpunk alley at 3am with holographic signs and steam', 'chrome robot standing in rain on a rooftop', 'neon-lit subway tunnel with sparks flying', 'figure in a glowing helmet walking through fog', 'futuristic motorcycle parked under a flickering sign', 'abandoned factory with laser grid security system', 'drone swarm forming a shape above a dark city', 'hacker den with multiple screens and neon wires', 'android face half-exposed revealing circuitry', 'space station corridor with emergency red lighting'],
    categories: ['sci_fi', 'dark'],
    tags: ['fierce', 'edgy', 'mysterious'],
  },
  {
    username: 'moss_witch', email: 'moss@dream.dev',
    medium: 'oil painting on canvas, visible impressionist brushstrokes, thick impasto texture',
    colorDir: 'deep forest green, mossy brown, amber, foggy grey, muted gold',
    subjects: ['ancient tree with a door in its trunk', 'fox walking through foggy ruins at dawn', 'witch garden with hanging herbs and crystal bottles', 'stone bridge over a misty stream in autumn', 'medieval cottage overgrown with ivy and ferns', 'crow perched on a gnarled staff in a clearing', 'cauldron bubbling near a campfire in the woods', 'mushroom ring in a moonlit forest floor', 'hermit reading scrolls in a moss-covered cave', 'deer with antlers draped in vines and flowers'],
    categories: ['nature', 'fantasy'],
    tags: ['mysterious', 'wild', 'nostalgic'],
  },
  {
    username: 'stardust_kid', email: 'stardust@dream.dev',
    medium: 'dreamlike surrealism, melting forms, impossible geometry, Salvador Dali inspired',
    colorDir: 'deep purple, cosmic blue, starfield white, nebula pink, void black',
    subjects: ['clock melting off the edge of a floating island', 'staircase spiraling into a galaxy', 'eye made of planets and rings', 'hand reaching out of a mirror into starlight', 'desert where the sand is made of tiny stars', 'tree growing upside down from a cloud', 'door standing alone in an empty cosmos', 'fish swimming through the sky between buildings', 'person walking on water that reflects a different world', 'mountain that is actually a sleeping giant'],
    categories: ['abstract', 'space'],
    tags: ['chaotic', 'futuristic', 'bold'],
  },
  {
    username: 'velvet_cafe', email: 'velvet@dream.dev',
    medium: 'retro 1950s illustration, mid-century modern, flat color, clean lines',
    colorDir: 'warm mustard yellow, burnt orange, teal, cream, cherry red',
    subjects: ['espresso machine on a tiled counter with pastries', 'couple sharing a milkshake in a diner booth', 'jukebox glowing in a cozy record shop', 'vintage bicycle with a basket of baguettes', 'cat lounging on a velvet armchair by a fireplace', 'bookshop window display with stacked novels and a lamp', 'rainy Paris street with a red awning cafe', 'kitchen shelf with copper pots and herbs', 'old radio playing on a wooden side table', 'afternoon tea setup with tiered cake stand'],
    categories: ['food', 'architecture'],
    tags: ['cozy', 'elegant', 'romantic'],
  },
  {
    username: 'glitch_oracle', email: 'glitch@dream.dev',
    medium: 'vaporwave digital collage, glitch art, scanlines, chromatic aberration',
    colorDir: 'hot pink, electric cyan, marble white, chrome silver, grid purple',
    subjects: ['greek bust statue with glitch artifacts and neon eyes', 'palm trees on a grid plane stretching to infinity', 'VHS television showing a sunset inside a dark room', 'windows 95 desktop floating in a void of stars', 'dolphin jumping through a holographic ring', 'shopping mall escalator in an empty pastel void', 'roman column wrapped in ethernet cables', 'cassette tape unspooling into a digital stream', 'sunset reflecting in mirrored sunglasses on marble', 'pixelated waterfall flowing into a chrome pool'],
    categories: ['abstract', 'sci_fi'],
    tags: ['chaotic', 'raw', 'edgy'],
  },
  {
    username: 'petal_dreams', email: 'petal@dream.dev',
    medium: 'botanical scientific illustration, detailed ink linework with watercolor washes',
    colorDir: 'sage green, blush pink, ivory, soft lavender, honey gold',
    subjects: ['butterfly landing on a peony in full bloom', 'pressed flower arrangement on aged paper', 'hummingbird hovering near trumpet vine flowers', 'terrarium with tiny ferns and moss and dewdrops', 'wisteria archway over a garden path', 'seeds sprouting in a cracked clay pot', 'dragonfly with iridescent wings on a reed', 'wildflower field with bees and ladybugs', 'vine growing up an old stone wall with tiny flowers', 'botanical cross-section of a fantastical plant'],
    categories: ['nature', 'cute'],
    tags: ['gentle', 'romantic', 'whimsical'],
  },
  {
    username: 'iron_tide', email: 'iron@dream.dev',
    medium: 'dark fantasy book cover illustration, dramatic lighting, lush hyper-detail',
    colorDir: 'stormy grey, ocean teal, blood red, iron black, lightning white',
    subjects: ['viking longship crashing through giant waves in a storm', 'kraken tentacle wrapping around a lighthouse', 'warrior standing on a cliff overlooking a burning sea', 'ancient sea fortress carved into a cliff face', 'wolf pack running across a frozen tundra at night', 'shipwreck on a reef with bioluminescent creatures', 'forge inside a volcano with sparks and molten metal', 'dragon skeleton embedded in a glacier', 'samurai in full armor standing in falling snow', 'siege tower approaching a massive stone wall at dawn'],
    categories: ['dark', 'fantasy'],
    tags: ['fierce', 'adventurous', 'bold'],
  },
  {
    username: 'pixel_fawn', email: 'pixel@dream.dev',
    medium: 'Pixar-style 3D render, soft rounded shapes, subsurface scattering, vibrant colors',
    colorDir: 'candy pink, sky blue, sunshine yellow, mint green, fluffy white',
    subjects: ['baby deer with big sparkly eyes in a meadow', 'tiny robot and a kitten becoming friends', 'mushroom village with tiny creatures having a feast', 'baby penguin sliding down an ice slide', 'puppy tangled in Christmas lights', 'hedgehog carrying a strawberry twice its size', 'hamster piloting a tiny hot air balloon', 'baby dragon trying to blow fire but making bubbles', 'duckling wearing rain boots splashing in puddles', 'caterpillar on a leaf looking up at a huge butterfly'],
    categories: ['cute', 'whimsical'],
    tags: ['playful', 'gentle', 'cozy'],
  },
  {
    username: 'void_architect', email: 'void@dream.dev',
    medium: 'chalk pastel on black paper, soft edges, dramatic contrast, no outlines',
    colorDir: 'silver white, deep indigo, pale blue glow, obsidian black, faint gold',
    subjects: ['impossible building with stairs going in all directions', 'cathedral floating in the void with a single beam of light', 'geometric crystal formation in a dark cavern', 'portal made of concentric rings hovering over water', 'lone figure standing before an enormous ancient gate', 'library where the bookshelves extend infinitely upward', 'bridge made of light spanning a bottomless chasm', 'clockwork mechanism the size of a city', 'observatory dome open to a sky full of galaxies', 'temple submerged halfway in perfectly still water'],
    categories: ['architecture', 'dark'],
    tags: ['mysterious', 'elegant', 'futuristic'],
  },
];

function buildPrompt(dreamer) {
  const subject = pick(dreamer.subjects);
  const tag = pick(dreamer.tags);
  return `${dreamer.medium}: ${subject}. ${dreamer.colorDir}. ${tag} atmosphere. Portrait 9:16 ratio.`;
}

function makeCaption(prompt) {
  return prompt.length > 200 ? prompt.slice(0, 197) + '...' : prompt;
}

async function main() {
  console.log('\n🌙 Dream Seeder — 10 Dreamers × 10 Dreams (forced variety)');
  console.log('══════════════════════════════════════════════════════════\n');

  const { fal } = await import('@fal-ai/client');
  fal.config({ credentials: FAL_API_KEY });

  const POSTS_PER_USER = 10;
  let total = 0;

  for (const dreamer of DREAMERS) {
    let userId;
    const { data: existing } = await supabase.from('users').select('id').eq('email', dreamer.email).single();
    if (existing) {
      userId = existing.id;
    } else {
      const { data: authData, error } = await supabase.auth.admin.createUser({
        email: dreamer.email, password: PASSWORD, email_confirm: true,
        user_metadata: { username: dreamer.username },
      });
      if (error) { console.log(`  ✗ ${dreamer.username}: ${error.message}`); continue; }
      userId = authData.user.id;
      await supabase.from('users').upsert({ id: userId, email: dreamer.email, username: dreamer.username, has_ai_recipe: true }, { onConflict: 'id' });
    }

    console.log(`👤 @${dreamer.username} [${dreamer.medium.split(',')[0]}]`);

    for (let i = 0; i < POSTS_PER_USER; i++) {
      const prompt = buildPrompt(dreamer);
      process.stdout.write(`  ${String(i+1).padStart(2)}/${POSTS_PER_USER} `);

      try {
        const result = await fal.subscribe('fal-ai/flux/dev', {
          input: { prompt, image_size: { width: 768, height: 1664 }, num_images: 1, output_format: 'jpeg', safety_tolerance: '2' },
          logs: false,
        });
        const falUrl = result.data?.images?.[0]?.url;
        if (!falUrl) throw new Error('No URL');

        const buf = Buffer.from(await (await fetch(falUrl)).arrayBuffer());
        const fname = `ai/${Date.now()}_${Math.random().toString(36).slice(2,6)}.jpg`;
        const { error: upErr } = await supabase.storage.from('uploads').upload(fname, buf, { contentType: 'image/jpeg' });
        if (upErr) throw new Error(upErr.message);
        const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fname);

        await supabase.from('uploads').insert({
          user_id: userId, image_url: urlData.publicUrl, media_type: 'image',
          categories: [pick(dreamer.categories)], caption: makeCaption(prompt),
          is_active: true, is_approved: true, is_moderated: true,
          is_ai_generated: true, ai_prompt: prompt,
          total_votes: 0, rad_votes: 0, bad_votes: 0, width: 768, height: 1664,
        });
        console.log('✓');
        total++;
      } catch (err) {
        console.log(`✗ ${err.message}`);
      }
      if (i < POSTS_PER_USER - 1) await new Promise(r => setTimeout(r, 1000));
    }
    console.log('');
  }

  console.log(`✅ Done! ${total}/100 dreams.\n`);
}

main().catch(console.error);
