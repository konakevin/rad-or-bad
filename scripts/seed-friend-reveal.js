#!/usr/bin/env node
'use strict';

/**
 * Seed script for testing the friend vote reveal modal.
 *
 * Creates 5 test users, makes them mutual follows with Kevin,
 * creates posts by OTHER users (not Kevin, not the friends),
 * then has the friends vote on those posts — mix of rad and bad.
 *
 * Kevin has NOT voted on any of these posts, so they'll appear
 * in his Everyone feed. After Kevin votes, the "N friends voted"
 * pill should appear, and tapping it opens the reveal modal.
 *
 * Expected results when Kevin votes RAD:
 *   - frienduser1, frienduser2, frienduser3 voted RAD → match
 *   - frienduser4, frienduser5 voted BAD → mismatch
 *
 * Expected results when Kevin votes BAD:
 *   - frienduser4, frienduser5 voted BAD → match
 *   - frienduser1, frienduser2, frienduser3 voted RAD → mismatch
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
const KEVIN_EMAIL = 'konakevin@gmail.com';

const FRIEND_USERS = [
  { email: 'frienduser1@radorbad.dev', username: 'frienduser1' },
  { email: 'frienduser2@radorbad.dev', username: 'frienduser2' },
  { email: 'frienduser3@radorbad.dev', username: 'frienduser3' },
  { email: 'frienduser4@radorbad.dev', username: 'frienduser4' },
  { email: 'frienduser5@radorbad.dev', username: 'frienduser5' },
];

// Extra users who create posts (not friends with Kevin, just content creators)
const POSTER_USERS = [
  { email: 'poster1@radorbad.dev', username: 'poster1' },
  { email: 'poster2@radorbad.dev', username: 'poster2' },
  { email: 'poster3@radorbad.dev', username: 'poster3' },
];

const PLACEHOLDER_IMAGES = Array.from({ length: 50 }, (_, i) =>
  `https://picsum.photos/seed/reveal${i + 1}/600/800`
);

function log(msg) { console.log(`  ${msg}`); }

async function cleanup() {
  console.log('Cleaning up test users...');
  let deleted = 0;
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (u.email === KEVIN_EMAIL) continue;
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

  // Clear streaks
  await supabase.from('vote_streaks').delete().not('user_a', 'is', null);
  await supabase.from('streak_cron_state').update({ last_processed_at: '2000-01-01T00:00:00Z' }).eq('id', 1);
  log('Cleared streaks + reset watermark');
}

async function createUser(email, username) {
  const { data, error } = await supabase.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    user_metadata: { username },
  });
  if (error) { console.error(`  Failed ${username}: ${error.message}`); return null; }
  return { id: data.user.id, email, username };
}

async function main() {
  console.log('=== Friend Reveal Seed Script ===\n');

  await cleanup();

  // Get Kevin's ID
  const { data: kevin } = await supabase.from('users').select('id').eq('email', KEVIN_EMAIL).single();
  if (!kevin) { console.error('Kevin not found!'); process.exit(1); }
  console.log(`\nKevin ID: ${kevin.id}`);

  // Create friend users
  console.log('\nCreating friend users...');
  const friends = [];
  for (const f of FRIEND_USERS) {
    const user = await createUser(f.email, f.username);
    if (user) friends.push(user);
    process.stdout.write('.');
  }
  console.log(`\n  Created ${friends.length} friends`);

  // Create poster users (content creators)
  console.log('\nCreating poster users...');
  const posters = [];
  for (const p of POSTER_USERS) {
    const user = await createUser(p.email, p.username);
    if (user) posters.push(user);
    process.stdout.write('.');
  }
  console.log(`\n  Created ${posters.length} posters`);

  // Make all friends mutual follows with Kevin
  console.log('\nCreating mutual follows with Kevin...');
  for (const f of friends) {
    await supabase.from('follows').upsert([
      { follower_id: kevin.id, following_id: f.id },
      { follower_id: f.id, following_id: kevin.id },
    ], { onConflict: 'follower_id,following_id' });
  }
  log(`Kevin is now mutual friends with ${friends.length} users`);

  // Create posts by poster users (for Everyone feed — strangers' posts)
  console.log('\nCreating stranger posts (Everyone feed)...');
  const strangerPosts = [];
  for (let i = 0; i < 20; i++) {
    const poster = posters[i % posters.length];
    const { data, error } = await supabase.from('uploads').insert({
      user_id: poster.id,
      categories: ['funny', 'people'],
      image_url: PLACEHOLDER_IMAGES[i],
      media_type: 'image',
      width: 600,
      height: 800,
      caption: `Everyone feed post ${i + 1}`,
      is_approved: true,
    }).select('id, user_id').single();
    if (error) { console.error(`  Upload failed: ${error.message}`); continue; }
    strangerPosts.push(data);
  }
  log(`Created ${strangerPosts.length} stranger posts`);

  // Create posts by friend users (for Following feed — friends' own posts)
  console.log('\nCreating friend posts (Following feed)...');
  const friendPosts = [];
  for (let i = 0; i < 20; i++) {
    const friend = friends[i % friends.length];
    const { data, error } = await supabase.from('uploads').insert({
      user_id: friend.id,
      categories: ['animals', 'nature'],
      image_url: PLACEHOLDER_IMAGES[20 + i],
      media_type: 'image',
      width: 600,
      height: 800,
      caption: `${friend.username}'s post ${Math.floor(i / friends.length) + 1}`,
      is_approved: true,
    }).select('id, user_id').single();
    if (error) { console.error(`  Upload failed: ${error.message}`); continue; }
    friendPosts.push(data);
  }
  log(`Created ${friendPosts.length} friend posts`);

  const allPosts = [...strangerPosts, ...friendPosts];

  // Have friends vote on stranger posts (for Streak feed + Everyone feed friend reveal)
  // friends 1-3 vote RAD, friends 4-5 vote BAD
  console.log('\nFriends voting on stranger posts...');
  let voteCount = 0;
  for (const post of strangerPosts) {
    for (let i = 0; i < friends.length; i++) {
      const vote = i < 3 ? 'rad' : 'bad';
      const { error } = await supabase.from('votes').upsert({
        voter_id: friends[i].id,
        upload_id: post.id,
        vote,
      }, { onConflict: 'voter_id,upload_id' });
      if (!error) voteCount++;
    }
  }

  // Also have friends cross-vote on each other's posts (for Following feed friend reveal)
  for (const post of friendPosts) {
    for (let i = 0; i < friends.length; i++) {
      if (friends[i].id === post.user_id) continue; // can't vote on own post
      const vote = i < 3 ? 'rad' : 'bad';
      const { error } = await supabase.from('votes').upsert({
        voter_id: friends[i].id,
        upload_id: post.id,
        vote,
      }, { onConflict: 'voter_id,upload_id' });
      if (!error) voteCount++;
    }
  }
  log(`Created ${voteCount} votes`);

  // Update vote counts on posts
  console.log('\nUpdating vote counts...');
  for (const post of allPosts) {
    const { data: votes } = await supabase.from('votes').select('vote').eq('upload_id', post.id);
    if (!votes) continue;
    const rad = votes.filter(v => v.vote === 'rad').length;
    const bad = votes.filter(v => v.vote === 'bad').length;
    await supabase.from('uploads').update({
      total_votes: rad + bad,
      rad_votes: rad,
      bad_votes: bad,
    }).eq('id', post.id);
  }
  log('Vote counts updated');

  // Verify all three feeds
  console.log('\nVerifying feeds...');
  const { data: mainData } = await supabase.rpc('get_feed', { p_user_id: kevin.id, p_limit: 50 });
  log(`Everyone feed: ${mainData?.length ?? 0} posts`);

  const { data: followData } = await supabase.rpc('get_following_feed', { p_user_id: kevin.id, p_limit: 50 });
  log(`Following feed: ${followData?.length ?? 0} posts`);

  const { data: streakData } = await supabase.rpc('get_friends_feed', { p_user_id: kevin.id, p_limit: 50 });
  log(`Streak feed: ${streakData?.length ?? 0} posts`);

  // Verify friend votes on first stranger post
  const { data: friendVotes } = await supabase.rpc('get_friend_votes_on_post', {
    p_user_id: kevin.id,
    p_upload_id: strangerPosts[0].id,
  });
  log(`Friend votes on first post: ${friendVotes?.length ?? 0}`);

  console.log('\n=== Done! ===');
  console.log('\nHow to test:');
  console.log('  1. Open the app as Kevin');
  console.log('  2. You should see posts in the Everyone feed');
  console.log('  3. Vote RAD on a post → "5 friends voted" pill should appear');
  console.log('  4. Tap the pill → Friend Reveal modal opens');
  console.log('  5. frienduser1-3 should show as RAD (match if you voted RAD)');
  console.log('  6. frienduser4-5 should show as BAD (mismatch if you voted RAD)');
  console.log('  7. Try voting BAD on another post to see the reverse');
}

main().catch((err) => { console.error(err); process.exit(1); });
