#!/usr/bin/env node
'use strict';

/**
 * Feed Algorithm Test
 *
 * Creates posts at known timestamps with known vote counts, calls get_feed,
 * then asserts the returned ranking matches expectations.
 *
 * Each test group uses its own author so the author diversity cap (2 per author)
 * never interferes with unrelated assertions.
 *
 * Usage:
 *   node scripts/test-algorithm.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
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
  console.error('❌  Missing env vars. See scripts/seed.js for usage.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const img      = (s) => `https://picsum.photos/seed/algotest-${s}/800/1000`;
const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000).toISOString();

// ── Test users ────────────────────────────────────────────────────────────────
// Each author group has at most 2 posts so the diversity cap (cap=2)
// never hides posts from other test groups.
//
//  viewer        — own-post (excluded from feed)
//  author-a      — followed-mid                     (1 post, followed)
//  author-b      — fresh-high, fresh-mid             (2 posts, ranking)
//  author-c      — old-high, old-mid                 (2 posts, ranking)
//  author-d      — new-novote, already-voted         (new-novote shows; already-voted filtered by votes)
//  author-e      — high-bad, clean-rad               (2 posts, bad penalty)
//  author-f      — decay-5h,  decay-7h               (2 posts, smooth decay)
//  author-g      — decay-23h, decay-25h              (2 posts, smooth decay)
//  author-h      — diversity-1st…diversity-4th       (4 posts, diversity cap test)
//  author-i      — food-mid                          (1 post, affinity: loved)
//  author-j      — meme-high                         (1 post, affinity: disliked)

const PFX      = 'algotest';
const PASSWORD = 'Testpass123!';

const USER_KEYS = ['viewer','a','b','c','d','e','f','g','h','i','j'];

// ── Scenarios ─────────────────────────────────────────────────────────────────
// Scores at query time (decay≈3.42 for 3h-old post, viewer follows author-a → boost 1.6):
//
//  fresh-high     wilson(9/9)≈0.701 × ~2.84                  ≈ 2.40  → rank 1
//  followed-mid   wilson(5/9)≈0.267 × ~2.84 × 0.87 × 1.6    ≈ 1.26  → rank 2
//  old-high       wilson(9/9)≈0.701 × ~1.26(8d)              ≈ 0.88  → rank 3  (high quality beats medium-quality fresh)
//  fresh-mid      wilson(5/9)≈0.267 × ~2.84 × 0.87           ≈ 0.79  → rank 4
//  new-novote     0 × decay + 0.3(discovery)                  ≈ 0.30  → rank 5
//  old-mid        wilson(5/9)≈0.267 × ~1.26                  ≈ 0.29  → rank 6
//
//  Bad penalty:   clean-rad(4/4,no bad)>high-bad(7/12,5bads) after penalty
//  Smooth decay:  5h>7h>23h>25h monotonically, no cliff at 6h or 24h
//  Diversity cap: only diversity-1st and diversity-2nd survive (cap=2)
//  Affinity:      food-mid(7/9, loved category) > meme-high(8/9, hated category)
//                 without affinity meme-high would win; affinity flips it

const SCENARIOS = [
  // ── Ranking (expectedRank = relative order among these 6 only) ───────────
  { label: 'fresh-high',   author: 'b', hoursAgo: 3,      rad:9, total: 9,  cat: 'nature', expectedRank: 1 },
  { label: 'followed-mid', author: 'a', hoursAgo: 3,      rad:5, total: 9,  cat: 'nature', expectedRank: 2 },
  { label: 'old-high',     author: 'c', hoursAgo: 24 * 8, rad:9, total: 9,  cat: 'nature', expectedRank: 3 },
  { label: 'fresh-mid',    author: 'b', hoursAgo: 3,      rad:5, total: 9,  cat: 'nature', expectedRank: 4 },
  { label: 'new-novote',   author: 'd', hoursAgo: 1,      rad:0, total: 0,  cat: 'nature', expectedRank: 5 },
  { label: 'old-mid',      author: 'c', hoursAgo: 24 * 8, rad:5, total: 9,  cat: 'nature', expectedRank: 6 },

  // ── Pass penalty ──────────────────────────────────────────────────────────
  // high-pass has more votes overall but many passes → penalised
  // clean-gas has fewer votes but perfect rate → wins after penalty
  { label: 'high-bad',     author: 'e', hoursAgo: 3, rad: 7, total: 12, cat: 'nature', expectedRank: null },
  { label: 'clean-rad',    author: 'e', hoursAgo: 3, rad: 4, total: 4,  cat: 'nature', expectedRank: null },

  // ── Smooth decay (same quality, different ages — must be monotonically decreasing) ─
  { label: 'decay-5h',     author: 'f', hoursAgo: 5,  rad:6, total: 9, cat: 'nature', expectedRank: null },
  { label: 'decay-7h',     author: 'f', hoursAgo: 7,  rad:6, total: 9, cat: 'nature', expectedRank: null },
  { label: 'decay-23h',    author: 'g', hoursAgo: 23, rad:6, total: 9, cat: 'nature', expectedRank: null },
  { label: 'decay-25h',    author: 'g', hoursAgo: 25, rad:6, total: 9, cat: 'nature', expectedRank: null },

  // ── Author diversity cap (4 posts from same author; only top 2 survive) ──
  { label: 'diversity-1st', author: 'h', hoursAgo: 3, rad:9, total: 9, cat: 'nature', expectedRank: null },
  { label: 'diversity-2nd', author: 'h', hoursAgo: 3, rad:7, total: 9, cat: 'nature', expectedRank: null },
  { label: 'diversity-3rd', author: 'h', hoursAgo: 3, rad:5, total: 9, cat: 'nature', expectedRank: null },
  { label: 'diversity-4th', author: 'h', hoursAgo: 3, rad:3, total: 9, cat: 'nature', expectedRank: null },

  // ── Category affinity ─────────────────────────────────────────────────────
  // Without affinity: meme-high(8/9) wins. With affinity: food-mid(7/9, loved) wins.
  { label: 'food-mid',      author: 'i', hoursAgo: 3, rad:7, total: 9, cat: 'food',  expectedRank: null },
  { label: 'meme-high',     author: 'j', hoursAgo: 3, rad:8, total: 9, cat: 'memes', expectedRank: null },

  // ── Exclusion sanity ──────────────────────────────────────────────────────
  { label: 'already-voted', author: 'd', hoursAgo: 3, rad:9, total: 9,  cat: 'nature', expectedRank: null },
  { label: 'own-post',      author: 'viewer', hoursAgo: 3, rad:9, total: 9, cat: 'nature', expectedRank: null },
];

// ── Assertions ────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
function assert(condition, message) {
  if (condition) { console.log(`  ✅  ${message}`); passed++; }
  else           { console.log(`  ❌  ${message}`); failed++; }
}

// ── Setup ─────────────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('🧹 Cleaning up previous algo-test data...');
  // Search auth directly — avoids missing users whose public.users row wasn't created
  let page = 1;
  while (true) {
    const { data: { users } } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    for (const u of users) {
      if (u.email?.startsWith(`${PFX}-`) && u.email?.endsWith('@radorbad.dev')) {
        await supabase.auth.admin.deleteUser(u.id);
      }
    }
    if (users.length < 100) break;
    page++;
  }
  // Also nuke any orphaned uploads whose caption matches a scenario label
  const labels = SCENARIOS.map(s => s.label);
  await supabase.from('uploads').delete().in('caption', labels);
}

async function createUser(key) {
  const email    = `${PFX}-${key}@radorbad.dev`;
  const username = `${PFX}-${key}`;
  const { data, error } = await supabase.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    user_metadata: { username },
  });
  if (error) throw new Error(`createUser ${username}: ${error.message}`);
  return data.user.id;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🧪 Rad or Bad — Feed Algorithm Test\n');

  await cleanup();
  await new Promise(r => setTimeout(r, 2000)); // let cascade deletes propagate

  console.log('\n👤 Creating test users...');
  const ids = {};
  for (const key of USER_KEYS) {
    ids[key] = await createUser(key);
  }
  await new Promise(r => setTimeout(r, 1500));
  console.log(`  ✓ ${USER_KEYS.length} users created`);

  // Give viewer 100 ratings so following boost (1.6×) kicks in
  await supabase.from('users').update({ total_ratings_given: 100 }).eq('id', ids['viewer']);

  // Viewer follows author-a
  console.log('\n👥 viewer follows author-a');
  await supabase.from('follows').insert({ follower_id: ids['viewer'], following_id: ids['a'] });

  // Create posts
  console.log('\n📸 Creating scenario posts...');
  const uploadIds = {};
  for (const s of SCENARIOS) {
    const authorId = ids[s.author];
    const { data, error } = await supabase
      .from('uploads')
      .insert({ user_id: authorId, category: s.cat, image_url: img(s.label), caption: s.label, created_at: hoursAgo(s.hoursAgo) })
      .select('id').single();
    if (error) throw new Error(`insert ${s.label}: ${error.message}`);
    uploadIds[s.label] = data.id;

    if (s.total > 0) {
      const { error: ve } = await supabase.from('uploads')
        .update({ rad_votes: s.rad, bad_votes: s.total - s.rad, total_votes: s.total })
        .eq('id', data.id);
      if (ve) throw new Error(`votes ${s.label}: ${ve.message}`);
    }
    console.log(`  ✓ ${s.label}`);
  }

  // Viewer votes on already-voted post
  console.log('\n🗳️  Recording viewer vote on already-voted post...');
  const { error: voteErr } = await supabase.from('votes').insert({ voter_id: ids['viewer'], upload_id: uploadIds['already-voted'], vote: 'rad' });
  if (voteErr) throw new Error(`vote insert: ${voteErr.message}`);

  // Seed category affinity directly
  console.log('\n❤️  Seeding category affinity (food=loved, memes=disliked)...');
  await supabase.from('user_category_affinity')
    .upsert({ user_id: ids['viewer'], category: 'food',  rad_count: 20, bad_count: 2 });
  await supabase.from('user_category_affinity')
    .upsert({ user_id: ids['viewer'], category: 'memes', rad_count: 2,  bad_count: 20 });

  // Run feed
  console.log('\n🔍 Running get_feed...');
  const { data: feed, error: feedErr } = await supabase.rpc('get_feed', { p_user_id: ids['viewer'], p_limit: 100 });
  if (feedErr) throw new Error(`get_feed: ${feedErr.message}`);

  const scenarioSet = new Set(SCENARIOS.map(s => s.label));
  const results = feed.filter(r => scenarioSet.has(r.caption));
  const byLabel = Object.fromEntries(results.map(r => [r.caption, r]));

  console.log('\n📊 Scenario posts in feed order:');
  results.forEach((r, i) => {
    const s = SCENARIOS.find(x => x.label === r.caption);
    const ok = s?.expectedRank ? '' : '';
    console.log(`  ${String(i + 1).padStart(2)}. ${r.caption.padEnd(18)} score:${r.feed_score?.toFixed(3)}  [${r.category}]`);
  });

  // ── Original behaviours ───────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────');
  console.log('🧪 Original behaviours');
  console.log('──────────────────────────────────────────');

  const ranked = results.filter(r => SCENARIOS.find(s => s.label === r.caption)?.expectedRank !== null);
  assert(ranked.length === 6, `6 ranked posts in feed (got ${ranked.length})`);
  for (const s of SCENARIOS.filter(s => s.expectedRank !== null)) {
    const actual = ranked.findIndex(r => r.caption === s.label) + 1;
    assert(actual === s.expectedRank, `"${s.label}" → rank ${s.expectedRank} (got ${actual || 'missing'})`);
  }

  const fol = byLabel['followed-mid']?.feed_score;
  const fre = byLabel['fresh-mid']?.feed_score;
  const old = byLabel['old-high']?.feed_score;
  const nov = byLabel['new-novote'];
  assert(fol > fre,  `Following boost: followed-mid (${fol?.toFixed(3)}) > fresh-mid (${fre?.toFixed(3)})`);
  assert(old > fre,  `Quality beats recency: old-high (${old?.toFixed(3)}) > fresh-mid (${fre?.toFixed(3)})`);
  assert(nov !== undefined,          'Discovery bump: zero-vote post appears in feed');
  assert((nov?.feed_score ?? 0) > 0, `Discovery bump score > 0 (${nov?.feed_score?.toFixed(3)})`);
  assert(!byLabel['already-voted'],  'Already-voted post excluded');
  assert(!byLabel['own-post'],       'Own post excluded');

  // ── Pass penalty ──────────────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────');
  console.log('🧪 Pass vote penalty');
  console.log('──────────────────────────────────────────');

  const hp = byLabel['high-bad'];
  const cg = byLabel['clean-rad'];
  assert(hp !== undefined && cg !== undefined, 'Both bad-penalty posts in feed');
  assert(cg?.feed_score > hp?.feed_score,
    `clean-rad (${cg?.feed_score?.toFixed(3)}) > high-bad (${hp?.feed_score?.toFixed(3)}) after penalty`);

  // ── Smooth decay ──────────────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────');
  console.log('🧪 Smooth time decay (no cliff edges)');
  console.log('──────────────────────────────────────────');

  const d5  = byLabel['decay-5h']?.feed_score;
  const d7  = byLabel['decay-7h']?.feed_score;
  const d23 = byLabel['decay-23h']?.feed_score;
  const d25 = byLabel['decay-25h']?.feed_score;
  assert(d5 != null && d7 != null && d23 != null && d25 != null, 'All decay posts in feed');
  assert(d5  > d7,  `Monotonic: 5h  (${d5?.toFixed(3)}) > 7h  (${d7?.toFixed(3)})`);
  assert(d7  > d23, `Monotonic: 7h  (${d7?.toFixed(3)}) > 23h (${d23?.toFixed(3)})`);
  assert(d23 > d25, `Monotonic: 23h (${d23?.toFixed(3)}) > 25h (${d25?.toFixed(3)})`);

  // Old step-function had a 2× jump at the 6h boundary and 1.43× at 24h.
  // Smooth power-law should have much smaller deltas across those edges.
  const ratio6h  = d5  / d7;
  const ratio24h = d23 / d25;
  assert(ratio6h  < 1.3, `No cliff at 6h  boundary (ratio ${ratio6h?.toFixed(3)}, want < 1.30)`);
  assert(ratio24h < 1.1, `No cliff at 24h boundary (ratio ${ratio24h?.toFixed(3)}, want < 1.10)`);

  // ── Author diversity cap ──────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────');
  console.log('🧪 Author diversity cap');
  console.log('──────────────────────────────────────────');

  assert(byLabel['diversity-1st'] !== undefined, 'Author H: 1st post in feed');
  assert(byLabel['diversity-2nd'] !== undefined, 'Author H: 2nd post in feed');
  assert(byLabel['diversity-3rd'] === undefined, 'Author H: 3rd post excluded (cap = 2)');
  assert(byLabel['diversity-4th'] === undefined, 'Author H: 4th post excluded (cap = 2)');

  // ── Category affinity ─────────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────');
  console.log('🧪 Category affinity');
  console.log('──────────────────────────────────────────');

  const fm = byLabel['food-mid'];
  const mh = byLabel['meme-high'];
  assert(fm !== undefined && mh !== undefined, 'Both affinity posts in feed');
  // meme-high has higher wilson (8/9 vs 7/9) so without affinity it would win.
  // With food affinity ×1.2 and meme penalty ×0.8, food-mid should rank higher.
  assert(fm?.feed_score > mh?.feed_score,
    `food-mid (${fm?.feed_score?.toFixed(3)}) > meme-high (${mh?.feed_score?.toFixed(3)}) via affinity`);

  // ── Performance ───────────────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────');
  console.log('🧪 Performance');
  console.log('──────────────────────────────────────────');

  const times = [];
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    await supabase.rpc('get_feed', { p_user_id: ids['viewer'], p_limit: 50 });
    times.push(Date.now() - t0);
  }
  const avg = Math.round(times.reduce((a, b) => a + b) / times.length);
  const max = Math.max(...times);
  console.log(`  ℹ️   3 runs — avg ${avg}ms, max ${max}ms (includes network)`);
  assert(avg < 1500, `Average response < 1500ms (got ${avg}ms)`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${ failed === 0 ? '🎉' : '⚠️ '} ${passed}/${total} passed\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
