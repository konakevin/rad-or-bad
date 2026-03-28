#!/usr/bin/env node
'use strict';

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

// Real names + avatar photos from randomuser.me-style placeholder URLs
const FRIEND_USERS = [
  { email: 'sarah@radorbad.dev',   username: 'sarah',   avatar: 'https://i.pravatar.cc/150?u=sarah' },
  { email: 'bill@radorbad.dev',    username: 'bill',    avatar: 'https://i.pravatar.cc/150?u=bill' },
  { email: 'maya@radorbad.dev',    username: 'maya',    avatar: 'https://i.pravatar.cc/150?u=maya' },
  { email: 'jake@radorbad.dev',    username: 'jake',    avatar: 'https://i.pravatar.cc/150?u=jake' },
  { email: 'luna@radorbad.dev',    username: 'luna',    avatar: 'https://i.pravatar.cc/150?u=luna' },
  { email: 'alex@radorbad.dev',    username: 'alex',    avatar: 'https://i.pravatar.cc/150?u=alex' },
  { email: 'nova@radorbad.dev',    username: 'nova',    avatar: 'https://i.pravatar.cc/150?u=nova' },
  { email: 'finn@radorbad.dev',    username: 'finn',    avatar: 'https://i.pravatar.cc/150?u=finn' },
  { email: 'zoe@radorbad.dev',     username: 'zoe',     avatar: 'https://i.pravatar.cc/150?u=zoe' },
  { email: 'omar@radorbad.dev',    username: 'omar',    avatar: 'https://i.pravatar.cc/150?u=omar' },
  { email: 'iris@radorbad.dev',    username: 'iris',    avatar: 'https://i.pravatar.cc/150?u=iris' },
  { email: 'kai@radorbad.dev',     username: 'kai',     avatar: 'https://i.pravatar.cc/150?u=kai' },
  { email: 'ruby@radorbad.dev',    username: 'ruby',    avatar: 'https://i.pravatar.cc/150?u=ruby' },
  { email: 'cole@radorbad.dev',    username: 'cole',    avatar: 'https://i.pravatar.cc/150?u=cole' },
  { email: 'jada@radorbad.dev',    username: 'jada',    avatar: 'https://i.pravatar.cc/150?u=jada' },
  { email: 'milo@radorbad.dev',    username: 'milo',    avatar: 'https://i.pravatar.cc/150?u=milo' },
  { email: 'eden@radorbad.dev',    username: 'eden',    avatar: 'https://i.pravatar.cc/150?u=eden' },
  { email: 'theo@radorbad.dev',    username: 'theo',    avatar: 'https://i.pravatar.cc/150?u=theo' },
];

const POSTER_USERS = [
  { email: 'poster1@radorbad.dev', username: 'dj_wave',  avatar: 'https://i.pravatar.cc/150?u=djwave' },
  { email: 'poster2@radorbad.dev', username: 'neoncat',  avatar: 'https://i.pravatar.cc/150?u=neoncat' },
  { email: 'poster3@radorbad.dev', username: 'pixel99',  avatar: 'https://i.pravatar.cc/150?u=pixel99' },
];

const PLACEHOLDER_IMAGES = Array.from({ length: 50 }, (_, i) =>
  `https://picsum.photos/seed/fp${i + 1}/600/800`
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

  await supabase.from('vote_streaks').delete().not('user_a', 'is', null);
  await supabase.from('friendships').delete().not('user_a', 'is', null);
  await supabase.from('streak_cron_state').update({ last_processed_at: '2000-01-01T00:00:00Z' }).eq('id', 1);
  log('Cleared streaks, friendships, reset watermark');
}

async function createUser(email, username, avatar) {
  const { data, error } = await supabase.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    user_metadata: { username },
  });
  if (error) { console.error(`  Failed ${username}: ${error.message}`); return null; }

  // Set avatar
  if (avatar) {
    await supabase.from('users').update({ avatar_url: avatar }).eq('id', data.user.id);
  }

  return { id: data.user.id, email, username };
}

async function main() {
  console.log('=== Friendship Seed Script ===\n');

  await cleanup();

  const { data: kevin } = await supabase.from('users').select('id').eq('email', KEVIN_EMAIL).single();
  if (!kevin) { console.error('Kevin not found!'); process.exit(1); }
  console.log(`\nKevin ID: ${kevin.id}`);

  // Create friend users with avatars
  console.log('\nCreating friend users...');
  const friends = [];
  for (const f of FRIEND_USERS) {
    const user = await createUser(f.email, f.username, f.avatar);
    if (user) friends.push(user);
    process.stdout.write('.');
  }
  console.log(`\n  Created: ${friends.map(f => f.username).join(', ')}`);

  // Create poster users with avatars
  console.log('\nCreating poster users...');
  const posters = [];
  for (const p of POSTER_USERS) {
    const user = await createUser(p.email, p.username, p.avatar);
    if (user) posters.push(user);
    process.stdout.write('.');
  }
  console.log(`\n  Created: ${posters.map(p => p.username).join(', ')}`);

  // Create accepted friendships + mutual follows
  console.log('\nCreating friendships with Kevin...');
  for (const f of friends) {
    const userA = kevin.id < f.id ? kevin.id : f.id;
    const userB = kevin.id < f.id ? f.id : kevin.id;
    await supabase.from('friendships').upsert({
      user_a: userA, user_b: userB, status: 'accepted', requester: f.id,
    }, { onConflict: 'user_a,user_b' });
    await supabase.from('follows').upsert([
      { follower_id: kevin.id, following_id: f.id },
      { follower_id: f.id, following_id: kevin.id },
    ], { onConflict: 'follower_id,following_id' });
  }
  log(`Friends: ${friends.map(f => '@' + f.username).join(', ')}`);

  // Inter-friend friendships
  for (let i = 0; i < friends.length - 1; i++) {
    const a = friends[i].id < friends[i + 1].id ? friends[i].id : friends[i + 1].id;
    const b = friends[i].id < friends[i + 1].id ? friends[i + 1].id : friends[i].id;
    await supabase.from('friendships').upsert({
      user_a: a, user_b: b, status: 'accepted', requester: a,
    }, { onConflict: 'user_a,user_b' });
    await supabase.from('follows').upsert([
      { follower_id: friends[i].id, following_id: friends[i + 1].id },
      { follower_id: friends[i + 1].id, following_id: friends[i].id },
    ], { onConflict: 'follower_id,following_id' });
  }

  // Pending request
  console.log('\nCreating pending friend request...');
  const pendingUser = await createUser('pending@radorbad.dev', 'riley', 'https://i.pravatar.cc/150?u=riley');
  if (pendingUser) {
    const a = kevin.id < pendingUser.id ? kevin.id : pendingUser.id;
    const b = kevin.id < pendingUser.id ? pendingUser.id : kevin.id;
    await supabase.from('friendships').upsert({
      user_a: a, user_b: b, status: 'pending', requester: pendingUser.id,
    }, { onConflict: 'user_a,user_b' });
    log('Pending request from @riley');
  }

  // Create posts
  console.log('\nCreating stranger posts...');
  const strangerPosts = [];
  for (let i = 0; i < 20; i++) {
    const poster = posters[i % posters.length];
    const { data, error } = await supabase.from('uploads').insert({
      user_id: poster.id,
      categories: ['funny', 'people'],
      image_url: PLACEHOLDER_IMAGES[i],
      media_type: 'image',
      width: 600, height: 800,
      caption: `Check this out #${i + 1}`,
      is_approved: true,
    }).select('id, user_id').single();
    if (!error) strangerPosts.push(data);
  }
  log(`${strangerPosts.length} stranger posts`);

  console.log('\nCreating friend posts...');
  const friendPosts = [];
  for (let i = 0; i < 20; i++) {
    const friend = friends[i % friends.length];
    const { data, error } = await supabase.from('uploads').insert({
      user_id: friend.id,
      categories: ['animals', 'nature'],
      image_url: PLACEHOLDER_IMAGES[20 + i],
      media_type: 'image',
      width: 600, height: 800,
      caption: `${friend.username}'s post`,
      is_approved: true,
    }).select('id, user_id').single();
    if (!error) friendPosts.push(data);
  }
  log(`${friendPosts.length} friend posts`);

  // Voting pattern:
  //   sarah, bill, maya → vote RAD (you'll match these when voting RAD)
  //   jake, luna → vote BAD (you'll mismatch these when voting RAD)
  // Vary rad vote counts so milestones are rare.
  // Most posts get 7-8 or 11-12 rad votes (miss the #10 milestone).
  // Only 2 posts get exactly 9 rad votes (Kevin's vote = #10 = milestone).
  const allPosts = [...strangerPosts, ...friendPosts];
  const milestonePostIndices = new Set([5, 25]); // 2 out of 40

  console.log('\nFriends voting...');
  let voteCount = 0;
  for (let p = 0; p < allPosts.length; p++) {
    const post = allPosts[p];
    const radCount = milestonePostIndices.has(p) ? 9 : [7, 8, 11, 12][p % 4];
    for (let i = 0; i < friends.length; i++) {
      if (friends[i].id === post.user_id) continue;
      const vote = i < radCount ? 'rad' : 'bad';
      const { error } = await supabase.from('votes').upsert({
        voter_id: friends[i].id, upload_id: post.id, vote,
      }, { onConflict: 'voter_id,upload_id' });
      if (!error) voteCount++;
    }
  }
  log(`${voteCount} votes`);

  // Update vote counts
  console.log('\nUpdating vote counts...');
  for (const post of [...strangerPosts, ...friendPosts]) {
    const { data: votes } = await supabase.from('votes').select('vote').eq('upload_id', post.id);
    if (!votes) continue;
    const rad = votes.filter(v => v.vote === 'rad').length;
    const bad = votes.filter(v => v.vote === 'bad').length;
    await supabase.from('uploads').update({
      total_votes: rad + bad, rad_votes: rad, bad_votes: bad,
    }).eq('id', post.id);
  }
  log('Vote counts updated');

  // Refresh streaks
  console.log('\nRefreshing streaks...');
  await supabase.rpc('refresh_vote_streaks');
  log('Streaks computed');

  // Verify
  console.log('\nVerifying...');
  const { data: mainFeed } = await supabase.rpc('get_feed', { p_user_id: kevin.id, p_limit: 50 });
  log(`Everyone: ${mainFeed?.length ?? 0}`);
  const { data: followFeed } = await supabase.rpc('get_following_feed', { p_user_id: kevin.id, p_limit: 50 });
  log(`Following: ${followFeed?.length ?? 0}`);
  const { data: streakFeed } = await supabase.rpc('get_friends_feed', { p_user_id: kevin.id, p_limit: 50 });
  log(`Streak: ${streakFeed?.length ?? 0}`);
  log(`Friend count: ${(await supabase.rpc('get_friend_count', { p_user_id: kevin.id })).data}`);
  log(`Pending: ${((await supabase.rpc('get_pending_requests', { p_user_id: kevin.id })).data ?? []).length}`);

  console.log('\n=== Done! ===');
  console.log('\nFirst 10 friends vote RAD | Last 8 vote BAD');
  console.log('Vote RAD → first 10 get green check, last 8 get red X');
  console.log('18 friends total — should show 15 max (3 rows of 5)');
  console.log('Pending request from @riley');
}

main().catch((err) => { console.error(err); process.exit(1); });
