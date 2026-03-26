#!/usr/bin/env node
'use strict';

/**
 * Seed script — creates 100 test users, ~200 posts across all categories,
 * random follow relationships, and vote counts spread across the full score range.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed.js
 *
 * EXPO_PUBLIC_SUPABASE_URL is read from .env.local automatically.
 * The service role key is in your Supabase dashboard → Settings → API.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Load .env.local ───────────────────────────────────────────────────────────
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
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Config ────────────────────────────────────────────────────────────────────
const NUM_USERS = 100;
const PASSWORD  = 'Testpass123!';

// Each user follows this many random others (min/max)
const FOLLOWS_MIN = 5;
const FOLLOWS_MAX = 25;

// ── Users ─────────────────────────────────────────────────────────────────────
const USERS = Array.from({ length: NUM_USERS }, (_, i) => ({
  email:    `testuser${i + 1}@radorbad.dev`,
  password: PASSWORD,
  username: `testuser${i + 1}`,
}));

// ── Post content pools ────────────────────────────────────────────────────────
const img = (seed) => `https://picsum.photos/seed/${seed}/800/1000`;

const CONTENT = {
  people: {
    seeds: ['portrait1','portrait2','portrait3','portrait4','portrait5','portrait6','portrait7','portrait8','portrait9','portrait10'],
    captions: [
      'Golden hour just hit different today, I cannot believe this came out of my phone camera',
      'Caught this one mid-laugh on the street, didn\'t even ask, just fired the shot',
      'Quick selfie',
      'Blue hour was insane last night, stood out there for two hours waiting for this exact moment',
      'The lighting in this alley was too good to pass up, had to stop mid-walk',
      'Candid on the subway, she had no idea I was shooting and it came out perfect',
      'Self portrait after a long week, sometimes the tired look hits',
      'Rooftop at sunset with the whole city behind me, this one goes in the hall of fame',
      'Studio lighting session finally paid off, been practicing this setup for months',
      'Street style spotted downtown, asked for a photo and they absolutely delivered',
    ],
  },
  animals: {
    seeds: ['goldenlab1','chaoscat1','zoomcat1','derpdog1','animals2','animals3','animals4','animals5','animals6','animals7'],
    captions: [
      'Best boy ever, no notes, absolute perfection, I will not be taking questions at this time',
      'Chaos goblin discovered the Christmas tree and honestly I respect it',
      'Zoom zoom',
      'Caught him mid-derp and he knew it, we made eye contact and both agreed to never speak of it',
      'She found the one sunny spot in the entire apartment and claimed it as her throne',
      'He learned to open the fridge last Tuesday and things have not been the same since',
      'First time seeing snow and the reaction was everything I hoped for',
      'This cat has the same energy as a coworker who schedules 8am meetings',
      'Rescued him three weeks ago and he has already taken over the entire couch',
      'The audacity of this dog thinking he fits on this tiny dog bed is inspiring',
    ],
  },
  food: {
    seeds: ['brunch1','tacos1','datenight1','ramen1','food2','food3','food4','food5','food6','food7'],
    captions: [
      'Sunday brunch spread took three hours to make and was gone in eleven minutes flat',
      'Street tacos at 2am after the show, this is what peak performance looks like',
      'Date night',
      'Homemade ramen took six hours of broth simmering and yes it was absolutely worth every second',
      'This farmer\'s market haul is going to become something incredible by Sunday',
      'Carbonara that actually emulsified on the first try, this might be my greatest achievement',
      'Birthday cake attempt number three finally came out looking like it belongs on a table',
      'Dumpling folding party with the family, nobody agreed on the right way to fold them',
      'The charcuterie board I assembled before realizing nobody was coming over for two hours',
      'Cast iron pizza at home hits different than anything I\'ve ordered in years',
    ],
  },
  nature: {
    seeds: ['grad-hot1','grad-hot2','grad-hot3','grad-hot5','beach1','nature2','nature3','nature4','nature5','nature6'],
    captions: [
      'Golden hour hits different when you hiked four miles uphill to get the shot',
      'Pacific coast highway on a Tuesday, no traffic, windows down, this is the one',
      'Morning fog rolling in',
      'Midday light',
      'Low tide at 5am before anyone else showed up, the beach belongs to you at that hour',
      'The mountains don\'t care about your schedule, they just sit there being incredible',
      'Wildflower season is peaking right now and I will not stop posting about it',
      'Found this trail completely by accident and now I have to go back every weekend',
      'Storm rolling in from the west, had about three minutes to get this before the rain hit',
      'Desert at sunrise is something everyone should experience at least once in their life',
    ],
  },
  memes: {
    seeds: ['meme1','meme2','meme3','meme4','meme5','meme6','meme7','meme8','meme9','meme10'],
    captions: [
      'Too real, sent this to my entire family group chat and now nobody is texting me back',
      'Every time without fail, I don\'t know why I keep expecting a different outcome',
      'Send help',
      'No notes',
      'This is the most accurate thing I have ever seen and I am not okay about it',
      'Showed this to my therapist and she said we need to talk about it next session',
      'The person who made this has clearly been inside my head and I have questions',
      'My group chat when I sent this: radio silence for six hours then seventeen crying emojis',
      'Cannot stop thinking about this one, it got me at 2am and I\'m still not over it',
      'Perfectly describes every Sunday evening I have ever experienced in my adult life',
    ],
  },
};

const CATEGORIES = Object.keys(CONTENT);

// Vote count presets — mix of tiny, mid, large, massive
function randomVotes() {
  const r = Math.random();
  if (r < 0.05) {
    // Massive: 500k–2M total
    const total = Math.floor(500_000 + Math.random() * 1_500_000);
    const pct   = 0.6 + Math.random() * 0.38;
    return { rad: Math.round(total * pct), bad: Math.round(total * (1 - pct)) };
  }
  if (r < 0.15) {
    // Large: 50k–500k
    const total = Math.floor(50_000 + Math.random() * 450_000);
    const pct   = 0.4 + Math.random() * 0.55;
    return { rad: Math.round(total * pct), bad: Math.round(total * (1 - pct)) };
  }
  if (r < 0.35) {
    // Mid: 5k–50k
    const total = Math.floor(5_000 + Math.random() * 45_000);
    const pct   = 0.3 + Math.random() * 0.65;
    return { rad: Math.round(total * pct), bad: Math.round(total * (1 - pct)) };
  }
  if (r < 0.55) {
    // Small: 100–5k
    const total = Math.floor(100 + Math.random() * 4_900);
    const pct   = 0.2 + Math.random() * 0.75;
    return { rad: Math.round(total * pct), bad: Math.round(total * (1 - pct)) };
  }
  // Tiny: 0–99 (some unvoted)
  const total = Math.floor(Math.random() * 100);
  if (total === 0) return { rad: 0, bad: 0 };
  const pct = Math.random();
  return { rad: Math.round(total * pct), bad: Math.round(total * (1 - pct)) };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg)  { console.log(`  ${msg}`); }
function fail(msg) { console.error(`  ❌ ${msg}`); }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n) {
  return shuffle(arr).slice(0, n);
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('🧹 Cleaning up existing test users...');
  const usernames = USERS.map((u) => u.username);

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .in('username', usernames);

  let removed = 0;
  for (const { id } of existing ?? []) {
    await supabase.auth.admin.deleteUser(id);
    removed++;
  }
  if ((existing ?? []).length) {
    const ids = (existing ?? []).map((u) => u.id);
    await supabase.from('uploads').delete().in('user_id', ids);
  }
  log(removed ? `Removed ${removed} existing test user(s).` : 'Nothing to clean up.');
}

// ── Create users ──────────────────────────────────────────────────────────────
async function createUsers() {
  console.log(`\n👤 Creating ${NUM_USERS} users...`);
  const created = [];
  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email:         u.email,
      password:      u.password,
      email_confirm: true,
      user_metadata: { username: u.username },
    });
    if (error) { fail(`${u.username}: ${error.message}`); continue; }
    created.push({ ...u, id: data.user.id });
    process.stdout.write('.');
  }
  console.log(`\n  ✓ Created ${created.length} users`);
  return created;
}

// ── Create uploads ────────────────────────────────────────────────────────────
async function createUploads(users) {
  console.log('\n📸 Creating posts...');
  const categoryCounters = {};

  // 2 posts per user, cycling through categories
  const posts = users.flatMap((user, ui) => {
    return [0, 1].map((pi) => {
      const cat = CATEGORIES[(ui * 2 + pi) % CATEGORIES.length];
      const pool = CONTENT[cat];
      const idx = (categoryCounters[cat] = (categoryCounters[cat] ?? 0));
      categoryCounters[cat]++;
      return {
        user,
        category: cat,
        image:    img(pool.seeds[idx % pool.seeds.length]),
        caption:  pool.captions[idx % pool.captions.length],
        ...randomVotes(),
      };
    });
  });

  let count = 0;
  for (const post of posts) {
    const { data, error } = await supabase
      .from('uploads')
      .insert({ user_id: post.user.id, category: post.category, image_url: post.image, caption: post.caption })
      .select('id')
      .single();

    if (error) { fail(`Upload for @${post.user.username}: ${error.message}`); continue; }

    const total = post.rad + post.bad;
    if (total > 0) {
      await supabase
        .from('uploads')
        .update({ rad_votes: post.rad, bad_votes: post.bad, total_votes: total })
        .eq('id', data.id);
    }
    count++;
    process.stdout.write('.');
  }
  console.log(`\n  ✓ Created ${count} posts`);
}

// ── Create follows ────────────────────────────────────────────────────────────
async function createFollows(users) {
  console.log('\n👥 Creating follow relationships...');
  const ids = users.map((u) => u.id);
  const pairs = [];
  const seen  = new Set();

  for (const user of users) {
    const count   = FOLLOWS_MIN + Math.floor(Math.random() * (FOLLOWS_MAX - FOLLOWS_MIN + 1));
    const targets = pick(ids.filter((id) => id !== user.id), count);
    for (const targetId of targets) {
      const key = `${user.id}:${targetId}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ follower_id: user.id, following_id: targetId });
      }
    }
  }

  // Batch insert in chunks of 100
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < pairs.length; i += CHUNK) {
    const chunk = pairs.slice(i, i + CHUNK);
    const { error } = await supabase.from('follows').insert(chunk);
    if (error) { fail(`Follow batch ${i / CHUNK}: ${error.message}`); continue; }
    inserted += chunk.length;
    process.stdout.write('.');
  }
  console.log(`\n  ✓ Created ${inserted} follow relationships`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Rad or Bad — Seed Script\n');

  await cleanup();

  const users = await createUsers();
  if (!users.length) {
    console.error('\n❌ No users created — aborting.');
    process.exit(1);
  }

  // Let DB trigger create public.users rows
  console.log('\n⏳ Waiting for DB trigger...');
  await new Promise((r) => setTimeout(r, 2000));

  await createUploads(users);
  await createFollows(users);

  console.log(`
✅ Seed complete!

  ${NUM_USERS} users  |  ~${NUM_USERS * 2} posts  |  ~${NUM_USERS * Math.round((FOLLOWS_MIN + FOLLOWS_MAX) / 2)} follows

Login with any test account:
  Email:    testuser1@radorbad.dev … testuser${NUM_USERS}@radorbad.dev
  Password: ${PASSWORD}

Re-run this script at any time to reset all test data.
`);
}

main().catch((err) => { console.error('\n❌', err.message); process.exit(1); });
