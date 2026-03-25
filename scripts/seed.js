#!/usr/bin/env node
'use strict';

/**
 * Seed script — creates 10 test users with 2 posts each and
 * votes designed to hit every rating tier.
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
  console.error('    EXPO_PUBLIC_SUPABASE_URL  — read from .env.local');
  console.error('    SUPABASE_SERVICE_ROLE_KEY — pass on the command line');
  console.error('\n    Example:');
  console.error('    SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed.js\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Test users ────────────────────────────────────────────────────────────────

const PASSWORD = 'Testpass123!';

const USERS = Array.from({ length: 10 }, (_, i) => ({
  email:    `testuser${i + 1}@radorbad.dev`,
  password: PASSWORD,
  username: `testuser${i + 1}`,
}));

// ── Posts (2 per user) ────────────────────────────────────────────────────────
// picsum.photos gives a consistent image per seed string
const img = (seed) => `https://picsum.photos/seed/${seed}/800/1000`;

// ── Gradient preview posts ────────────────────────────────────────────────────
// 8 posts calibrated so adding ONE Gas vote hits each rating tier exactly.
// Vote counts are set via direct UPDATE (triggers wilson_score recalc).
// Wilson score decreases from top to bottom → algorithm naturally surfaces
// them hottest-first. Each post owned by a different user so diversity cap
// never blocks them.
//
//  Pre-loaded    After your Gas   Tier   Gradient shown
//  18g / 1p /19  19/20 = 95%      ≥90   red → orange
//  16g / 3p /19  17/20 = 85%      ≥80   orange → amber
//  14g / 5p /19  15/20 = 75%      ≥70   amber → yellow
//  12g / 7p /19  13/20 = 65%      ≥60   yellow → lime
//  10g / 9p /19  11/20 = 55%      ≥50   lime → green
//   8g /11p /19   9/20 = 45%      ≥40   cyan → teal
//   6g /13p /19   7/20 = 35%      ≥30   sky blue → deep blue
//   3g /16p /19   4/20 = 20%      <30   lavender → purple
//
const GRADIENT_POSTS = [
  { userIdx: 0, category: 'nature',  image: img('grad-hot1'),   caption: null, rad: 18, bad:  1 },
  { userIdx: 1, category: 'nature',  image: img('grad-hot2'),   caption: null, rad: 16, bad:  3 },
  { userIdx: 2, category: 'nature',  image: img('grad-hot3'),   caption: null, rad: 14, bad:  5 },
  { userIdx: 3, category: 'nature',  image: img('grad-hot4'),   caption: null, rad: 12, bad:  7 },
  { userIdx: 4, category: 'nature',  image: img('grad-hot5'),   caption: null, rad: 10, bad:  9 },
  { userIdx: 5, category: 'nature',  image: img('grad-hot6'),   caption: null, rad:  8, bad: 11 },
  { userIdx: 6, category: 'nature',  image: img('grad-hot7'),   caption: null, rad:  6, bad: 13 },
  { userIdx: 7, category: 'nature',  image: img('grad-hot8'),   caption: null, rad:  3, bad: 16 },
];

const POSTS = [
  { userIdx: 0, category: 'people',  image: img('portrait1'),    caption: 'Golden hour'     },
  { userIdx: 0, category: 'animals', image: img('goldenlab1'),   caption: 'Best boy'        },
  { userIdx: 1, category: 'food',    image: img('brunch1'),      caption: 'Sunday brunch'   },
  { userIdx: 1, category: 'nature',  image: img('forest1'),      caption: 'Morning hike'    },
  { userIdx: 2, category: 'memes',   image: img('meme1'),        caption: 'Too real'        },
  { userIdx: 2, category: 'people',  image: img('portrait2'),    caption: 'Candid shot'     },
  { userIdx: 3, category: 'animals', image: img('chaoscat1'),    caption: 'Chaos goblin'    },
  { userIdx: 3, category: 'food',    image: img('ramen1'),       caption: 'Homemade ramen'  },
  { userIdx: 4, category: 'nature',  image: img('sunset1'),      caption: 'Last light'      },
  { userIdx: 4, category: 'memes',   image: img('meme2'),        caption: 'Every time'      },
  { userIdx: 5, category: 'people',  image: img('portrait3'),    caption: 'Street photo'    },
  { userIdx: 5, category: 'animals', image: img('derpdog1'),     caption: 'Derp mode'       },
  { userIdx: 6, category: 'food',    image: img('tacos1'),       caption: 'Street tacos'    },
  { userIdx: 6, category: 'nature',  image: img('mountains1'),   caption: 'Above the clouds'},
  { userIdx: 7, category: 'memes',   image: img('meme3'),        caption: 'Send help'       },
  { userIdx: 7, category: 'people',  image: img('portrait4'),    caption: 'Blue hour'       },
  { userIdx: 8, category: 'animals', image: img('zoomcat1'),     caption: 'Zoom zoom'       },
  { userIdx: 8, category: 'food',    image: img('datenight1'),   caption: 'Date night'      },
  { userIdx: 9, category: 'nature',  image: img('beach1'),       caption: 'Low tide'        },
  { userIdx: 9, category: 'memes',   image: img('meme4'),        caption: 'No notes'        },
];

// ── Vote plans ────────────────────────────────────────────────────────────────
// Each entry: [postIndex, gasVoterIndices[], passVoterIndices[]]
//
// With 9 available voters per post (owner can't self-vote), possible tiers:
//   9/9  = 100% → Untouchable
//   8/9  ≈  89% → Heat        (Elite needs 10+ voters — not achievable here)
//   7/9  ≈  78% → Solid
//   6/9  ≈  67% → Mid
//   4/9  ≈  44% → Fumble
//   0/0         → no score (unvoted)
//
const VOTE_PLANS = [
  // post 0  — 9 gas / 0 pass = 100% Untouchable
  [0,  [1,2,3,4,5,6,7,8,9], []],
  // post 1  — 8 gas / 1 pass = 89% Heat
  [1,  [1,2,3,4,5,6,7,8], [9]],
  // post 2  — 7 gas / 2 pass = 78% Solid
  [2,  [0,2,3,4,5,6,7], [8,9]],
  // post 3  — 6 gas / 3 pass = 67% Mid
  [3,  [0,2,3,4,5,6], [7,8,9]],
  // post 4  — 4 gas / 5 pass = 44% Fumble
  [4,  [0,1,3,4], [5,6,7,8,9]],
  // post 5  — 9 gas / 0 pass = 100% Untouchable (second example)
  [5,  [0,1,3,4,5,6,7,8,9], []],
  // post 10 — 8 gas / 1 pass = 89% Heat
  [10, [0,1,2,3,4,6,7,8], [9]],
  // post 14 — 3 gas / 5 pass = 38% Fumble
  [14, [0,1,2], [3,4,5,6,7]],
  // posts 6,7,8,9,11,12,13,15,16,17,18,19 → no votes (tests unscored state)
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg)  { console.log(`  ${msg}`); }
function fail(msg) { console.error(`  ❌ ${msg}`); }

async function cleanup() {
  console.log('🧹 Cleaning up existing test users...');
  const emails = USERS.map((u) => u.email);
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .in('email', emails);

  if (!existing?.length) { log('Nothing to clean up.'); return; }

  for (const { id } of existing) {
    await supabase.auth.admin.deleteUser(id);
  }
  log(`Removed ${existing.length} existing test user(s).`);
}

async function createUsers() {
  console.log('\n👤 Creating users...');
  const created = [];
  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email:         u.email,
      password:      u.password,
      email_confirm: true,                    // skip confirmation email
      user_metadata: { username: u.username },
    });
    if (error) { fail(`${u.username}: ${error.message}`); continue; }
    created.push({ ...u, id: data.user.id });
    log(`✓ ${u.username}`);
  }
  return created;
}

async function createUploads(users) {
  console.log('\n📸 Creating uploads...');
  const created = [];
  for (const post of POSTS) {
    const user = users[post.userIdx];
    if (!user) { fail(`No user at index ${post.userIdx}`); continue; }

    const { data, error } = await supabase
      .from('uploads')
      .insert({
        user_id:   user.id,
        category:  post.category,
        image_url: post.image,
        caption:   post.caption,
      })
      .select('id')
      .single();

    if (error) { fail(`Upload "${post.caption}": ${error.message}`); continue; }
    created.push({ ...post, id: data.id });
    log(`✓ @${user.username} → [${post.category}] "${post.caption}"`);
  }
  return created;
}

async function createVotes(users, uploads) {
  console.log('\n🗳️  Creating votes...');
  let count = 0;

  for (const [postIdx, radVoterIdxs, badVoterIdxs] of VOTE_PLANS) {
    const upload = uploads[postIdx];
    if (!upload) { fail(`No upload at index ${postIdx}`); continue; }

    const ownerIdx = upload.userIdx;

    const insertVote = async (voterIdx, vote) => {
      const voter = users[voterIdx];
      if (!voter || voterIdx === ownerIdx) return; // skip self-votes
      const { error } = await supabase.from('votes').insert({
        voter_id:  voter.id,
        upload_id: upload.id,
        vote,
      });
      if (!error) count++;
    };

    for (const vi of radVoterIdxs)  await insertVote(vi, 'rad');
    for (const vi of badVoterIdxs) await insertVote(vi, 'bad');

    const rad   = radVoterIdxs.length;
    const total = radVoterIdxs.length + badVoterIdxs.length;
    const pct   = total ? Math.round((rad / total) * 100) : 0;
    log(`Post ${postIdx}: ${rad}/${total} rad = ${pct}%`);
  }

  log(`\nTotal votes inserted: ${count}`);
}

async function createGradientPosts(users) {
  console.log('\n🌈 Creating gradient preview posts...');
  for (const p of GRADIENT_POSTS) {
    const user = users[p.userIdx];
    if (!user) { fail(`No user at index ${p.userIdx}`); continue; }

    const { data, error } = await supabase
      .from('uploads')
      .insert({ user_id: user.id, category: p.category, image_url: p.image, caption: p.caption })
      .select('id')
      .single();

    if (error) { fail(`Gradient post "${p.caption}": ${error.message}`); continue; }

    // Set vote counts directly — triggers wilson_score recalc via DB trigger
    const total = p.rad + p.bad;
    const { error: ve } = await supabase
      .from('uploads')
      .update({ rad_votes: p.rad, bad_votes: p.bad, total_votes: total })
      .eq('id', data.id);

    if (ve) { fail(`Vote counts for "${p.caption}": ${ve.message}`); continue; }

    const afterRad = Math.round(((p.rad + 1) / (total + 1)) * 100);
    log(`✓ ${p.caption} → ${p.rad}/${total} pre-loaded → ${afterRad}% after your Rad`);
  }
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

  // Small delay to let the DB trigger create public.users rows
  await new Promise((r) => setTimeout(r, 1500));

  const uploads = await createUploads(users);
  await createVotes(users, uploads);
  await createGradientPosts(users);

  console.log(`
✅ Seed complete!

Login with any test account:
  Email:    testuser1@radorbad.dev … testuser10@radorbad.dev
  Password: ${PASSWORD}

Rating tiers in the feed:
  100% Untouchable  → posts by testuser1, testuser3
  ~89% Heat         → posts by testuser1, testuser6
  ~78% Solid        → post by testuser2
  ~67% Mid          → post by testuser2
  ~38–44% Fumble    → posts by testuser3, testuser8
  No score (unvoted) → remaining posts

Note: Elite (90–99%) can't be demonstrated with only 9 voters per post.
Re-run this script at any time to reset all test data.
`);
}

main().catch((err) => { console.error('\n❌', err.message); process.exit(1); });
