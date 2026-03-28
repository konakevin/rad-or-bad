#!/usr/bin/env node
'use strict';

/**
 * Seed script for vote streaks.
 * Creates 10 test users, mutual follows between pairs, uploads, and
 * matching votes so that streak data is generated when the cron runs.
 *
 * Clears all test users (testuser*@radorbad.dev) but leaves real accounts.
 * Then calls refresh_vote_streaks() to compute streaks immediately.
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
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing env vars.'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = 'Testpass123!';
const NUM_USERS = 10;
const PROTECTED_EMAIL = 'konakevin@gmail.com';

// Simple placeholder image URLs (colored rectangles from placeholder services)
const PLACEHOLDER_IMAGES = [
  'https://picsum.photos/seed/streak1/600/800',
  'https://picsum.photos/seed/streak2/600/800',
  'https://picsum.photos/seed/streak3/600/800',
  'https://picsum.photos/seed/streak4/600/800',
  'https://picsum.photos/seed/streak5/600/800',
  'https://picsum.photos/seed/streak6/600/800',
  'https://picsum.photos/seed/streak7/600/800',
  'https://picsum.photos/seed/streak8/600/800',
  'https://picsum.photos/seed/streak9/600/800',
  'https://picsum.photos/seed/streak10/600/800',
  'https://picsum.photos/seed/streak11/600/800',
  'https://picsum.photos/seed/streak12/600/800',
  'https://picsum.photos/seed/streak13/600/800',
  'https://picsum.photos/seed/streak14/600/800',
  'https://picsum.photos/seed/streak15/600/800',
  'https://picsum.photos/seed/streak16/600/800',
  'https://picsum.photos/seed/streak17/600/800',
  'https://picsum.photos/seed/streak18/600/800',
  'https://picsum.photos/seed/streak19/600/800',
  'https://picsum.photos/seed/streak20/600/800',
];

function log(msg) { console.log(`  ${msg}`); }

// ── Cleanup test users ───────────────────────────────────────────────────────
async function cleanup() {
  console.log('Cleaning up test users...');

  // Find and delete test auth users, skip Kevin's account
  let deleted = 0;
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (u.email === PROTECTED_EMAIL) continue;
      if (u.email && u.email.endsWith('@radorbad.dev')) {
        await supabase.auth.admin.deleteUser(u.id);
        deleted++;
        process.stdout.write('.');
      }
    }
    if (data.users.length < 1000) break;
    page++;
  }
  if (deleted) console.log(`\n  Removed ${deleted} test user(s)`);

  // Clear streaks table
  const { error: streakErr } = await supabase.from('vote_streaks').delete().not('user_a', 'is', null);
  if (!streakErr) log('Cleared vote_streaks');

  // Reset watermark so refresh picks up everything
  await supabase.from('streak_cron_state').update({ last_processed_at: '2000-01-01T00:00:00Z' }).eq('id', 1);
  log('Reset streak watermark');
}

// ── Create users ─────────────────────────────────────────────────────────────
async function createUsers() {
  console.log(`\nCreating ${NUM_USERS} test users...`);
  const users = [];
  for (let i = 1; i <= NUM_USERS; i++) {
    const email = `testuser${i}@radorbad.dev`;
    const username = `streakuser${i}`;
    const { data, error } = await supabase.auth.admin.createUser({
      email, password: PASSWORD, email_confirm: true,
      user_metadata: { username },
    });
    if (error) { console.error(`  Failed ${username}: ${error.message}`); continue; }
    users.push({ id: data.user.id, email, username });
    process.stdout.write('.');
  }
  console.log(`\n  Created ${users.length} users`);
  return users;
}

// ── Create mutual follows ────────────────────────────────────────────────────
async function createMutualFollows(users) {
  console.log('\nCreating mutual follows...');

  // Create overlapping pairs so users share multiple mutual friends:
  // Pair up: (0,1), (1,2), (2,3), (3,4), (4,5), (5,6), (6,7), (7,8), (8,9), (0,9)
  // Plus some cross-links: (0,5), (1,6), (2,7), (3,8), (4,9)
  const pairs = [];
  for (let i = 0; i < users.length; i++) {
    pairs.push([i, (i + 1) % users.length]); // ring
  }
  // Cross-links
  for (let i = 0; i < 5; i++) {
    pairs.push([i, i + 5]);
  }

  let count = 0;
  for (const [a, b] of pairs) {
    // Both directions for mutual follow
    await supabase.from('follows').upsert([
      { follower_id: users[a].id, following_id: users[b].id },
      { follower_id: users[b].id, following_id: users[a].id },
    ], { onConflict: 'follower_id,following_id' });
    count++;
  }

  // Also make Kevin's account mutual with user 0 and user 1 if Kevin exists
  const { data: kevin } = await supabase.from('users').select('id').eq('email', PROTECTED_EMAIL).single();
  if (kevin) {
    for (const i of [0, 1]) {
      await supabase.from('follows').upsert([
        { follower_id: kevin.id, following_id: users[i].id },
        { follower_id: users[i].id, following_id: kevin.id },
      ], { onConflict: 'follower_id,following_id' });
    }
    log(`Mutual follows with Kevin's account and ${users[0].username}, ${users[1].username}`);
  }

  log(`Created ${count} mutual follow pairs`);
}

// ── Create uploads ───────────────────────────────────────────────────────────
async function createUploads(users) {
  console.log('\nCreating uploads...');
  const uploads = [];

  // Each user creates 3 posts
  let imgIdx = 0;
  for (const user of users) {
    for (let p = 0; p < 3; p++) {
      const { data, error } = await supabase.from('uploads').insert({
        user_id: user.id,
        categories: ['funny'],
        image_url: PLACEHOLDER_IMAGES[imgIdx % PLACEHOLDER_IMAGES.length],
        media_type: 'image',
        width: 600,
        height: 800,
        caption: `Streak test post ${p + 1} by ${user.username}`,
        is_approved: true,
      }).select('id, user_id').single();

      if (error) { console.error(`  Upload failed: ${error.message}`); continue; }
      uploads.push(data);
      imgIdx++;
    }
    process.stdout.write('.');
  }
  console.log(`\n  Created ${uploads.length} uploads`);
  return uploads;
}

// ── Create votes that produce streaks ────────────────────────────────────────
async function createVotes(users, uploads) {
  console.log('\nCreating votes to produce streaks...');

  // Group uploads by user
  const uploadsByUser = {};
  for (const u of uploads) {
    if (!uploadsByUser[u.user_id]) uploadsByUser[u.user_id] = [];
    uploadsByUser[u.user_id].push(u.id);
  }

  // For each mutual pair, have both users vote the same way on several shared posts
  // This creates streaks of varying lengths

  const streakScenarios = [
    // Users 0 and 1: 7-post rad streak (strong streak)
    { a: 0, b: 1, votes: ['rad','rad','rad','rad','rad','rad','rad'] },
    // Users 1 and 2: 5-post rad streak
    { a: 1, b: 2, votes: ['rad','rad','rad','rad','rad'] },
    // Users 2 and 3: 4-post bad streak
    { a: 2, b: 3, votes: ['bad','bad','bad','bad'] },
    // Users 3 and 4: 3-post rad streak then mismatch (streak = 0 after reset)
    { a: 3, b: 4, votes: ['rad','rad','rad','rad','bad'] }, // last pair is mismatch, but user4 votes bad while user3 votes rad
    // Users 4 and 5: 6-post rad streak
    { a: 4, b: 5, votes: ['rad','rad','rad','rad','rad','rad'] },
    // Users 0 and 5: 3-post bad streak (cross-link)
    { a: 0, b: 5, votes: ['bad','bad','bad'] },
    // Users 5 and 6: 2-post rad streak
    { a: 5, b: 6, votes: ['rad','rad'] },
    // Users 6 and 7: 4-post rad streak
    { a: 6, b: 7, votes: ['rad','rad','rad','rad'] },
    // Users 8 and 9: 5-post bad streak
    { a: 8, b: 9, votes: ['bad','bad','bad','bad','bad'] },
    // Users 0 and 9: 3-post rad streak (ring connection)
    { a: 0, b: 9, votes: ['rad','rad','rad'] },
  ];

  // Collect all uploads not owned by either user in the pair to vote on
  const allUploadIds = uploads.map(u => u.id);
  let voteCount = 0;
  let baseTime = Date.now() - 3600000; // start 1 hour ago

  for (const scenario of streakScenarios) {
    const userA = users[scenario.a];
    const userB = users[scenario.b];

    // Find uploads NOT by userA or userB to vote on
    const votableUploads = uploads.filter(u => u.user_id !== userA.id && u.user_id !== userB.id);

    for (let v = 0; v < scenario.votes.length && v < votableUploads.length; v++) {
      const vote = scenario.votes[v];
      const uploadId = votableUploads[v].id;

      // For the mismatch case (user 3 & 4, last vote), make them disagree
      const isLastMismatch = scenario.a === 3 && scenario.b === 4 && v === scenario.votes.length - 1;

      // User A votes
      const { error: e1 } = await supabase.from('votes').upsert({
        voter_id: userA.id,
        upload_id: uploadId,
        vote: vote,
      }, { onConflict: 'voter_id,upload_id' });

      // User B votes — same unless mismatch
      const { error: e2 } = await supabase.from('votes').upsert({
        voter_id: userB.id,
        upload_id: uploadId,
        vote: isLastMismatch ? (vote === 'rad' ? 'bad' : 'rad') : vote,
      }, { onConflict: 'voter_id,upload_id' });

      if (!e1 && !e2) voteCount += 2;
    }
    process.stdout.write('.');
  }

  console.log(`\n  Created ${voteCount} votes across ${streakScenarios.length} streak scenarios`);
}

// ── Update upload vote counts ────────────────────────────────────────────────
async function updateVoteCounts() {
  console.log('\nUpdating upload vote counts...');

  // Get all uploads and recalculate their vote counts
  const { data: allUploads } = await supabase.from('uploads').select('id');
  if (!allUploads) return;

  for (const upload of allUploads) {
    const { data: votes } = await supabase.from('votes')
      .select('vote')
      .eq('upload_id', upload.id);

    if (!votes) continue;
    const rad = votes.filter(v => v.vote === 'rad').length;
    const bad = votes.filter(v => v.vote === 'bad').length;
    const total = rad + bad;

    await supabase.from('uploads').update({
      total_votes: total,
      rad_votes: rad,
      bad_votes: bad,
    }).eq('id', upload.id);
  }
  log('Vote counts updated');
}

// ── Run streak cron ──────────────────────────────────────────────────────────
async function runStreakCron() {
  console.log('\nRunning refresh_vote_streaks()...');
  const { error } = await supabase.rpc('refresh_vote_streaks');
  if (error) {
    console.error(`  Failed: ${error.message}`);
    return;
  }
  log('Streaks computed');

  // Show results
  const { data: streaks } = await supabase.from('vote_streaks')
    .select('user_a, user_b, current_streak, best_streak, streak_type')
    .gt('current_streak', 0)
    .order('current_streak', { ascending: false });

  if (streaks && streaks.length > 0) {
    console.log(`\n  Active streaks:`);
    for (const s of streaks) {
      console.log(`    ${s.user_a.slice(0,8)}... <> ${s.user_b.slice(0,8)}... = ${s.current_streak} (${s.streak_type}) [best: ${s.best_streak}]`);
    }
  } else {
    console.log('  No streaks found — check if migration 024 has been applied.');
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Streak Seed Script ===\n');

  await cleanup();
  const users = await createUsers();
  if (users.length < NUM_USERS) {
    console.error('Not enough users created, aborting.');
    process.exit(1);
  }

  await createMutualFollows(users);
  const uploads = await createUploads(users);
  await createVotes(users, uploads);
  await updateVoteCounts();
  await runStreakCron();

  console.log('\nDone! Check the Streaks tab on profiles.');
}

main().catch((err) => { console.error(err); process.exit(1); });
