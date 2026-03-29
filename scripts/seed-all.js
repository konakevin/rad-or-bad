#!/usr/bin/env node
'use strict';

/**
 * seed-all.js — The single source of truth for populating mock data.
 *
 * Wipes all test data, resets Kevin, then creates:
 * - Named friends (accepted friendships + mutual follows with Kevin)
 * - Stranger accounts with realistic usernames + Pexels avatars
 * - High-quality Pexels photos as posts (deduplicated)
 * - Varied voting patterns (hash-based per user personality)
 * - Follow relationships between all users
 * - Pending friend requests to Kevin
 * - Refreshes streaks
 *
 * Usage:
 *   node scripts/seed-all.js
 *   node scripts/seed-all.js --strangers 30   # number of stranger accounts (default 20)
 *   node scripts/seed-all.js --posts 8        # posts per stranger (default 5)
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
const PEXELS_KEY   = process.env.PEXELS_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE env vars.'); process.exit(1); }
if (!PEXELS_KEY) { console.error('Missing PEXELS_API_KEY in .env.local'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? parseInt(args[idx + 1], 10) : fallback;
}
const NUM_STRANGERS = getArg('strangers', 40);
const POSTS_PER_STRANGER = getArg('posts', 10);

const PASSWORD = 'Testpass123!';
const KEVIN_EMAIL = 'konakevin@gmail.com';

// ── Named friends (Kevin's inner circle) ─────────────────────────────────────
const FRIENDS = [
  { username: 'sarah',  avatar: 'https://i.pravatar.cc/150?u=sarah' },
  { username: 'bill',   avatar: 'https://i.pravatar.cc/150?u=bill' },
  { username: 'maya',   avatar: 'https://i.pravatar.cc/150?u=maya' },
  { username: 'jake',   avatar: 'https://i.pravatar.cc/150?u=jake' },
  { username: 'luna',   avatar: 'https://i.pravatar.cc/150?u=luna' },
  { username: 'alex',   avatar: 'https://i.pravatar.cc/150?u=alex' },
  { username: 'nova',   avatar: 'https://i.pravatar.cc/150?u=nova' },
  { username: 'finn',   avatar: 'https://i.pravatar.cc/150?u=finn' },
  { username: 'zoe',    avatar: 'https://i.pravatar.cc/150?u=zoe' },
  { username: 'omar',   avatar: 'https://i.pravatar.cc/150?u=omar' },
];

// Voting personality per friend (0 = always bad, 1 = always rad, 0.5 = coin flip)
const FRIEND_BIAS = {
  sarah: 0.65, bill: 0.55, maya: 0.50, jake: 0.35, luna: 0.40,
  alex: 0.50,  nova: 0.60, finn: 0.35, zoe: 0.45,  omar: 0.55,
};

// ── Stranger username generation ─────────────────────────────────────────────
const PREFIXES = ['vibe','pixel','neon','solar','lunar','cosmic','zen','retro','drift','echo','nova','blaze','frost','wave','spark','storm','chill','hype','mood','glow','flash','rush','flow','pulse'];
const SUFFIXES = ['kid','fox','cat','wolf','bear','owl','jay','ray','ace','max','kai','rio','sky','ash','lee','rex','jo','sam','lou','mae','rae','quinn','drew','sage'];
const STYLES = [
  (p,s,n) => `${p}${s}${n}`, (p,s) => `${p}_${s}`, (p,s,n) => `${p}.${s}${n}`,
  (p,s) => `the${p}${s}`, (p,s,n) => `${s}_${p}${n}`, (p,s) => `x${p}${s}x`,
];

function generateUsername(index) {
  const p = PREFIXES[index % PREFIXES.length];
  const s = SUFFIXES[Math.floor(index / PREFIXES.length) % SUFFIXES.length];
  const n = index > PREFIXES.length ? Math.floor(Math.random() * 99) : '';
  return STYLES[index % STYLES.length](p, s, n).toLowerCase().replace(/[^a-z0-9_.]/g, '');
}

// ── Pexels API ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'people',  queries: ['portrait golden hour', 'street style fashion', 'candid lifestyle'] },
  { key: 'animals', queries: ['cute puppy', 'kitten playing', 'wildlife close up'] },
  { key: 'food',    queries: ['gourmet plating', 'street food colorful', 'coffee art latte'] },
  { key: 'nature',  queries: ['dramatic sunset', 'mountain landscape', 'ocean waves aerial'] },
  { key: 'funny',   queries: ['funny cat', 'dogs being silly', 'humor animals'] },
  { key: 'music',   queries: ['concert crowd lights', 'vinyl records aesthetic', 'guitar close up'] },
  { key: 'sports',  queries: ['surfing wave', 'skateboard trick', 'basketball slam dunk'] },
  { key: 'art',     queries: ['street mural colorful', 'abstract painting', 'neon lights art'] },
];

const CAPTIONS = {
  people:  ['golden hour was insane today', 'candid > posed', 'this light tho', 'main character energy', 'no filter needed'],
  animals: ['this face right here', 'peak adorable', 'my whole heart', 'chaos goblin behavior', 'rescue life is the best life'],
  food:    ['worth every calorie', 'this slaps different', 'chef kiss', 'brunch goals achieved', 'street food never misses'],
  nature:  ['earth is showing off', 'no caption needed', 'golden hour magic', 'nature doing its thing', 'chasing light'],
  funny:   ['I cant stop watching this', 'send help', 'the timing', 'absolutely unhinged', 'no thoughts just vibes'],
  music:   ['front row was worth it', 'the crowd knew every word', 'beats hit different live', 'studio session was fire', 'pure sound'],
  sports:  ['what a play', 'the send was clean', 'pure adrenaline', 'nothing but net', 'commit or eat it'],
  art:     ['stopped me in my tracks', 'the colors in person were insane', 'gallery day well spent', 'art is everywhere', 'the process is the point'],
};

const pexelsCache = {};
async function fetchPexelsPhotos(query, count = 80) {
  if (pexelsCache[query]) return pexelsCache[query];
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=portrait`,
    { headers: { Authorization: PEXELS_KEY } }
  );
  if (!res.ok) { console.error(`  Pexels error for "${query}": ${res.status}`); return []; }
  const data = await res.json();
  const photos = (data.photos ?? []).map((p) => ({
    url: p.src.large2x, width: p.width, height: p.height,
    alt: p.alt || '',
  }));
  pexelsCache[query] = photos;
  return photos;
}

const MAX_VIDEO_DURATION = 10; // seconds
const VIDEO_RATE = 0.25; // 25% of posts will be videos

const videoPexelsCache = {};
async function fetchPexelsVideos(query, count = 40) {
  if (videoPexelsCache[query]) return videoPexelsCache[query];
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=80&orientation=portrait&max_duration=${MAX_VIDEO_DURATION}`,
    { headers: { Authorization: PEXELS_KEY } }
  );
  if (!res.ok) { console.error(`  Pexels video error for "${query}": ${res.status}`); return []; }
  const data = await res.json();
  const videos = (data.videos ?? [])
    .filter((v) => v.duration <= MAX_VIDEO_DURATION)
    .slice(0, count)
    .map((v) => {
      const files = v.video_files ?? [];
      const file = files.find((f) => f.quality === 'hd' && f.height >= f.width)
        ?? files.find((f) => f.quality === 'hd') ?? files[0];
      if (!file?.link) return null;
      return {
        url: file.link,
        width: file.width ?? 1080,
        height: file.height ?? 1920,
        thumbnail: v.image ?? null,
        alt: '',
        isVideo: true,
      };
    }).filter(Boolean);
  videoPexelsCache[query] = videos;
  return videos;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function log(msg) { console.log(`  ${msg}`); }
function hash(a, b) { const x = Math.sin(a * 127 + b * 311) * 43758.5453; return x - Math.floor(x); }

const BATCH_SIZE = 500; // Supabase supports up to ~1000 rows per insert
async function batchUpsert(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) console.error(`  Batch upsert error (${table}):`, error.message);
  }
}

function casualize(alt) {
  if (!alt || alt.length < 5) return null;
  let text = alt.slice(0, 180);
  text = text.charAt(0).toLowerCase() + text.slice(1).replace(/\.$/, '');
  return text;
}

async function createUser(email, username, avatar) {
  const { data, error } = await supabase.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    user_metadata: { username },
  });
  if (error) { console.error(`  Failed ${username}: ${error.message}`); return null; }
  if (avatar) await supabase.from('users').update({ avatar_url: avatar }).eq('id', data.user.id);
  return { id: data.user.id, username, email };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║         RAD OR BAD — SEED ALL        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  Friends: ${FRIENDS.length}`);
  console.log(`  Strangers: ${NUM_STRANGERS}`);
  console.log(`  Posts per stranger: ${POSTS_PER_STRANGER}`);
  console.log(`  Friend posts: ${FRIENDS.length * 15}`);

  // ── 1. Cleanup ───────────────────────────────────────────────────────────
  console.log('\n🧹 Cleaning up...');
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
  log('Cleared streaks, friendships, watermark');

  // ── 2. Reset Kevin ───────────────────────────────────────────────────────
  const { data: kevin } = await supabase.from('users').select('id').eq('email', KEVIN_EMAIL).single();
  if (!kevin) { console.error('Kevin not found!'); process.exit(1); }
  console.log(`\n👤 Kevin ID: ${kevin.id}`);

  await supabase.from('votes').delete().eq('voter_id', kevin.id);
  await supabase.from('uploads').delete().eq('user_id', kevin.id);
  await supabase.from('users').update({
    total_ratings_given: 0, critic_level: 1,
    rad_score: null, user_rank: null, needs_rank_recalc: false,
  }).eq('id', kevin.id);
  log('Kevin reset to clean state');

  // ── 3. Create friends ────────────────────────────────────────────────────
  console.log(`\n👥 Creating ${FRIENDS.length} friends...`);
  const friends = [];
  for (const f of FRIENDS) {
    const user = await createUser(`${f.username}@radorbad.dev`, f.username, f.avatar);
    if (user) friends.push(user);
    process.stdout.write('.');
  }
  console.log(`\n  ${friends.map(f => '@' + f.username).join(', ')}`);

  // Accepted friendships + mutual follows with Kevin
  for (const f of friends) {
    const a = kevin.id < f.id ? kevin.id : f.id;
    const b = kevin.id < f.id ? f.id : kevin.id;
    await supabase.from('friendships').upsert({ user_a: a, user_b: b, status: 'accepted', requester: f.id }, { onConflict: 'user_a,user_b' });
    await supabase.from('follows').upsert([
      { follower_id: kevin.id, following_id: f.id },
      { follower_id: f.id, following_id: kevin.id },
    ], { onConflict: 'follower_id,following_id' });
  }
  log('Friendships + mutual follows created');

  // Inter-friend friendships
  for (let i = 0; i < friends.length - 1; i++) {
    const a = friends[i].id < friends[i + 1].id ? friends[i].id : friends[i + 1].id;
    const b = friends[i].id < friends[i + 1].id ? friends[i + 1].id : friends[i].id;
    await supabase.from('friendships').upsert({ user_a: a, user_b: b, status: 'accepted', requester: a }, { onConflict: 'user_a,user_b' });
    await supabase.from('follows').upsert([
      { follower_id: friends[i].id, following_id: friends[i + 1].id },
      { follower_id: friends[i + 1].id, following_id: friends[i].id },
    ], { onConflict: 'follower_id,following_id' });
  }

  // ── 4. Create strangers ──────────────────────────────────────────────────
  console.log(`\n🌍 Creating ${NUM_STRANGERS} strangers...`);
  const strangers = [];
  const batch = Date.now().toString(36);
  for (let i = 0; i < NUM_STRANGERS; i++) {
    const username = generateUsername(i + Math.floor(Math.random() * 50));
    const user = await createUser(
      `bot_${batch}_${i}@radorbad.dev`,
      username,
      `https://i.pravatar.cc/150?u=${username}${batch}`
    );
    if (user) strangers.push(user);
    process.stdout.write('.');
  }
  console.log(`\n  Created ${strangers.length} strangers`);

  const allUsers = [...friends, ...strangers];

  // ── 5. Fetch photos ──────────────────────────────────────────────────────
  console.log('\n📷 Fetching Pexels photos + videos...');
  const photoPool = {};
  const videoPool = {};
  for (const cat of CATEGORIES) {
    const query = pick(cat.queries);
    photoPool[cat.key] = await fetchPexelsPhotos(query, 80);
    videoPool[cat.key] = await fetchPexelsVideos(query, 30);
    log(`${cat.key}: ${photoPool[cat.key].length} photos, ${videoPool[cat.key].length} videos`);
  }

  // ── 6. Create friend posts (8 each) ──────────────────────────────────────
  console.log('\n📸 Creating friend posts...');
  const friendPosts = [];
  const catKeys = CATEGORIES.map(c => c.key);
  let friendVideoIdx = {};
  catKeys.forEach(k => friendVideoIdx[k] = 0);

  for (const friend of friends) {
    for (let j = 0; j < 15; j++) {
      const catKey = catKeys[j % catKeys.length];
      const useVideo = Math.random() < VIDEO_RATE && videoPool[catKey].length > 0;

      if (useVideo) {
        const videos = videoPool[catKey];
        const video = videos[friendVideoIdx[catKey] % videos.length];
        friendVideoIdx[catKey]++;
        const caption = pick(CAPTIONS[catKey]);
        const { data, error } = await supabase.from('uploads').insert({
          user_id: friend.id, categories: [catKey],
          image_url: video.url, media_type: 'video',
          thumbnail_url: video.thumbnail,
          width: video.width, height: video.height,
          caption, is_approved: true,
        }).select('id, user_id').single();
        if (!error) friendPosts.push(data);
      } else {
        const photos = photoPool[catKey];
        if (!photos.length) continue;
        const photo = photos[(friends.indexOf(friend) * 15 + j) % photos.length];
        const caption = casualize(photo.alt) || pick(CAPTIONS[catKey]);
        const { data, error } = await supabase.from('uploads').insert({
          user_id: friend.id, categories: [catKey],
          image_url: photo.url, media_type: 'image',
          width: photo.width, height: photo.height,
          caption, is_approved: true,
        }).select('id, user_id').single();
        if (!error) friendPosts.push(data);
      }
    }
    process.stdout.write('.');
  }
  console.log(`\n  ${friendPosts.length} friend posts`);

  // ── 7. Create stranger posts ─────────────────────────────────────────────
  console.log('\n📸 Creating stranger posts...');
  const strangerPosts = [];
  const usedUrls = new Set();
  let photoIdx = {};
  let videoIdx = {};
  catKeys.forEach(k => { photoIdx[k] = 0; videoIdx[k] = 0; });

  for (const stranger of strangers) {
    const numCats = 1 + Math.floor(Math.random() * 3);
    const userCats = shuffle(catKeys).slice(0, numCats);

    for (let p = 0; p < POSTS_PER_STRANGER; p++) {
      const catKey = userCats[p % userCats.length];
      const useVideo = Math.random() < VIDEO_RATE && videoPool[catKey].length > 0;

      if (useVideo) {
        const videos = videoPool[catKey].filter(v => !usedUrls.has(v.url));
        if (!videos.length) continue;
        const video = videos[videoIdx[catKey] % videos.length];
        videoIdx[catKey]++;
        usedUrls.add(video.url);

        const caption = pick(CAPTIONS[catKey]);
        const categories = [catKey];
        if (Math.random() > 0.7) categories.push(pick(catKeys.filter(k => k !== catKey)));

        const { data, error } = await supabase.from('uploads').insert({
          user_id: stranger.id, categories,
          image_url: video.url, media_type: 'video',
          thumbnail_url: video.thumbnail,
          width: video.width, height: video.height,
          caption, is_approved: true,
        }).select('id, user_id').single();
        if (!error) strangerPosts.push(data);
      } else {
        const photos = photoPool[catKey].filter(ph => !usedUrls.has(ph.url));
        if (!photos.length) continue;
        const photo = photos[photoIdx[catKey] % photos.length];
        photoIdx[catKey]++;
        usedUrls.add(photo.url);

        const caption = casualize(photo.alt) || pick(CAPTIONS[catKey]);
        const categories = [catKey];
        if (Math.random() > 0.7) categories.push(pick(catKeys.filter(k => k !== catKey)));

        const { data, error } = await supabase.from('uploads').insert({
          user_id: stranger.id, categories,
          image_url: photo.url, media_type: 'image',
          width: photo.width, height: photo.height,
          caption, is_approved: true,
        }).select('id, user_id').single();
        if (!error) strangerPosts.push(data);
      }
    }
    process.stdout.write('.');
  }
  console.log(`\n  ${strangerPosts.length} stranger posts`);

  const allPosts = [...friendPosts, ...strangerPosts];

  // ── 8. Generate follows (batched) ─────────────────────────────────────────
  console.log('\n🔗 Generating follow relationships...');
  const followRows = [];
  for (const user of strangers) {
    const toFollow = shuffle(allUsers.filter(u => u.id !== user.id))
      .slice(0, Math.floor(allUsers.length * (0.2 + Math.random() * 0.3)));
    for (const target of toFollow) {
      followRows.push({ follower_id: user.id, following_id: target.id });
    }
  }
  await batchUpsert('follows', followRows, 'follower_id,following_id');
  log(`${followRows.length} follows`);

  // ── 9. Generate votes (batched) ───────────────────────────────────────────
  console.log('\n🗳️  Generating votes...');
  const voteRows = [];

  // Friends vote on all posts with personality-based bias
  for (let p = 0; p < allPosts.length; p++) {
    const post = allPosts[p];
    const isMilestonePost = p % 20 === 0;
    for (let i = 0; i < friends.length; i++) {
      if (friends[i].id === post.user_id) continue;
      const vote = isMilestonePost
        ? (i < 9 ? 'rad' : 'bad')
        : hash(p, i) < (FRIEND_BIAS[friends[i].username] ?? 0.5) ? 'rad' : 'bad';
      voteRows.push({ voter_id: friends[i].id, upload_id: post.id, vote });
    }
  }

  // Strangers vote on random posts
  for (const user of strangers) {
    const radBias = 0.3 + Math.random() * 0.5;
    const postsToVote = shuffle(allPosts)
      .filter(p => p.user_id !== user.id)
      .slice(0, Math.floor(allPosts.length * (0.2 + Math.random() * 0.4)));
    for (const post of postsToVote) {
      voteRows.push({ voter_id: user.id, upload_id: post.id, vote: Math.random() < radBias ? 'rad' : 'bad' });
    }
  }

  await batchUpsert('votes', voteRows, 'voter_id,upload_id');
  log(`${voteRows.length} votes`);

  // ── 10. Update vote counts (computed from memory, batched updates) ────────
  console.log('\n📊 Updating vote counts...');
  const voteCounts = {};
  for (const v of voteRows) {
    if (!voteCounts[v.upload_id]) voteCounts[v.upload_id] = { rad: 0, bad: 0 };
    voteCounts[v.upload_id][v.vote]++;
  }
  const updatePromises = Object.entries(voteCounts).map(([uploadId, counts]) =>
    supabase.from('uploads').update({
      total_votes: counts.rad + counts.bad, rad_votes: counts.rad, bad_votes: counts.bad,
    }).eq('id', uploadId)
  );
  // Run updates in parallel batches of 50
  for (let i = 0; i < updatePromises.length; i += 50) {
    await Promise.all(updatePromises.slice(i, i + 50));
  }
  log('Done');

  // ── 11. Pending friend requests to Kevin ─────────────────────────────────
  console.log('\n📨 Sending friend requests to Kevin...');
  const requesters = shuffle(strangers).slice(0, 3);
  for (const user of requesters) {
    const a = kevin.id < user.id ? kevin.id : user.id;
    const b = kevin.id < user.id ? user.id : kevin.id;
    await supabase.from('friendships').upsert({
      user_a: a, user_b: b, status: 'pending', requester: user.id,
    }, { onConflict: 'user_a,user_b' });
    log(`@${user.username} sent a friend request`);
  }

  // ── 12. Refresh streaks ──────────────────────────────────────────────────
  console.log('\n⚡ Refreshing streaks...');
  await supabase.rpc('refresh_vote_streaks');
  log('Streaks computed');

  // ── 13. Verify ───────────────────────────────────────────────────────────
  console.log('\n✅ Verifying...');
  const { data: d1 } = await supabase.rpc('get_feed', { p_user_id: kevin.id, p_limit: 50 });
  log(`Explore feed: ${d1?.length ?? 0} posts`);
  const { data: d2 } = await supabase.rpc('get_following_feed', { p_user_id: kevin.id, p_limit: 50 });
  log(`Following feed: ${d2?.length ?? 0} posts`);
  const { data: d3 } = await supabase.rpc('get_friends_feed', { p_user_id: kevin.id, p_limit: 50 });
  log(`Streak feed: ${d3?.length ?? 0} posts`);
  const { data: fc } = await supabase.rpc('get_friend_count', { p_user_id: kevin.id });
  log(`Friends: ${fc}`);
  const { data: pr } = await supabase.rpc('get_pending_requests', { p_user_id: kevin.id });
  log(`Pending requests: ${pr?.length ?? 0}`);

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║              ALL DONE!               ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  ${friends.length} friends + ${strangers.length} strangers`);
  console.log(`  ${allPosts.length} posts, ${voteRows.length} votes`);
  console.log(`  ~5% milestone posts (every 20th)`);
  console.log(`  3 pending friend requests`);
}

main().catch((err) => { console.error(err); process.exit(1); });
