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
const PROTECTED_EMAILS = ['konakevin@gmail.com', 'sunnysteph@gmail.com'];

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
  { key: 'memes',   queries: ['funny meme', 'internet humor', 'reaction face'] },
  { key: 'beauty',  queries: ['makeup look', 'skincare routine', 'beauty aesthetic'] },
  { key: 'quotes',  queries: ['motivational quote', 'typography poster', 'inspirational text'] },
  { key: 'cute',    queries: ['baby animals cute', 'adorable kitten', 'cute puppy sleeping'] },
  { key: 'science', queries: ['space nebula', 'microscope close up', 'chemistry lab aesthetic'] },
];

const CAPTIONS = {
  people: [
    'caught this one by accident lol', 'idk why this pic goes so hard', 'me pretending im a model',
    'the sun was hitting different today', 'ok but look at this lighting??', 'no im not ok',
    'fit check nobody asked for', 'tuesday energy', 'living my best life or whatever',
    'someone come get their mans', 'just vibes honestly', 'this is my good side apparently',
    'pov: you actually left the house', 'my therapist would be proud', 'main character moment fr',
    'im never taking a pic this good again', 'not pictured: the 47 bad takes before this',
  ],
  animals: [
    'tell me this isnt the cutest thing ever', 'he has no idea how famous hes about to be',
    'would literally die for this animal', 'look at this dumdum', 'shes judging you rn',
    'rent free in my head since forever', 'the face when you hear the treat bag',
    'hes doing his best ok', 'chaotic energy', 'this ones got the whole neighborhood fooled',
    'adopted him 3 years ago best decision ever', 'proof that dogs are better than people',
    'she literally posed for this', 'how is this real', 'the audacity of this cat',
  ],
  food: [
    'ate this 2 hours ago still thinking about it', 'is it normal to photograph your food this much',
    'the first bite was spiritual', 'found this spot on accident and wow', 'brunch was a personality trait today',
    'i made this and honestly shocked', 'if youre not eating this what are you doing',
    'this taco changed my life not even joking', 'calories dont count on vacation right',
    'my kitchen my rules', 'street food > fancy restaurants every time', 'the cheese pull tho',
    'idk who needs to hear this but go eat something good today', 'im not a chef but',
  ],
  nature: [
    'phone doesnt do it justice tbh', 'i just stood here for like 20 minutes',
    'ok earth you didnt have to go that hard', 'sometimes you just gotta stop and look up',
    'no filter i swear', 'woke up at 5am for this and zero regrets', 'places like this actually exist??',
    'this is why i hike', 'the clouds were showing off today', 'im moving here bye',
    'peaceful af', 'how does this not have more likes come on', 'currently offline from life',
    'put the phone down and just breathe', 'the universe said here you go',
  ],
  funny: [
    'im crying actual tears', 'why is this so accurate', 'showed this to everyone at work',
    'me at 3am for no reason', 'the way i just screamed', 'im sending this to everyone i know',
    'this should not be this funny', 'pov me trying to adult', 'how do i unsee this',
    'i have watched this 400 times', 'whoever made this deserves an award',
    'my sense of humor is broken and i dont care', 'this is peak internet', 'help',
  ],
  music: [
    'this song has been on repeat all week', 'goosebumps every single time',
    'the bass hit my chest and i felt alive', 'best night of my life no cap',
    'if you know you know', 'this set was unreal', 'my ears are still ringing worth it',
    'music is literally therapy', 'the crowd energy was insane', 'vinyl sounds hit different',
    'found this artist last week and im obsessed', 'the drop tho', 'need to go back immediately',
  ],
  sports: [
    'absolutely filthy move', 'how do you even do that', 'the reaction from the crowd says it all',
    'been rewatching this nonstop', 'clean af', 'this is what happens when you dont give up',
    'physics said no and they said watch me', 'the commitment is insane',
    'my jaw literally dropped', 'years of practice in one clip', 'thats going on the highlight reel',
    'someone call the police this was a robbery', 'im just a spectator and im exhausted',
  ],
  art: [
    'walked past this three times before i actually looked', 'ok this is actually incredible',
    'the detail up close is wild', 'art that makes you feel something >>> ',
    'i want this on my wall', 'took me a sec to realize this was painted not a photo',
    'the colors are even crazier in person', 'support your local artists seriously',
    'i dont know art but i know what i like', 'the texture on this', 'someone put their whole soul into this',
    'gallery hopping is my new personality', 'stared at this for way too long',
  ],
  memes: [
    'this is too real', 'im in this photo and i dont like it', 'sent this to my group chat immediately',
    'why is this so accurate', 'the internet remains undefeated', 'tell me im wrong',
    'this lives rent free in my head', 'me every single morning', 'the accuracy is concerning',
    'i feel personally attacked', 'this is peak content', 'whoever made this gets it',
  ],
  beauty: [
    'the blend tho', 'glass skin era', 'this look took me 2 hours and worth every minute',
    'new routine and my skin is thriving', 'the glow up is real', 'soft glam always wins',
    'finally nailed this look', 'skincare is self care', 'obsessed with this shade',
    'tutorial coming soon maybe', 'the lashes are doing the heavy lifting', 'clean girl aesthetic',
  ],
  quotes: [
    'needed to hear this today', 'screenshot worthy', 'this hit different at 2am',
    'putting this on my wall', 'say it louder for the people in the back',
    'felt that', 'no lies detected', 'this is the one', 'read that again',
    'saving this forever', 'the truth hurts sometimes', 'manifesting this energy',
  ],
  cute: [
    'i literally cannot', 'my heart just exploded', 'this is illegal levels of cute',
    'how are you even real', 'the tiniest beans', 'im not crying youre crying',
    'protect at all costs', 'this made my whole week', 'the little face omg',
    'i need twelve of these immediately', 'cuteness overload', 'this healed me',
  ],
  science: [
    'the universe is insane', 'this blew my mind', 'how is this even real',
    'science is beautiful and terrifying', 'zoom in more', 'the detail at this scale is wild',
    'we are so small', 'this is what peak nerd looks like', 'my new wallpaper tbh',
    'the colors under a microscope tho', 'space never gets old', 'chemistry is art',
  ],
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
  // Try to create — if already exists, find and reuse
  const { data, error } = await supabase.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    user_metadata: { username },
  });
  if (error) {
    if (error.message.includes('already been registered')) {
      // User exists in auth — find them and ensure public.users row exists
      const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
      if (existing) {
        if (avatar) await supabase.from('users').update({ avatar_url: avatar, username }).eq('id', existing.id);
        return { id: existing.id, username, email };
      }
      // Auth user exists but no public.users row — list auth users to find the ID
      let page = 1;
      while (true) {
        const { data: users } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        const found = users?.users?.find(u => u.email === email);
        if (found) {
          // Delete and recreate to get a clean state
          await supabase.auth.admin.deleteUser(found.id);
          const { data: retry } = await supabase.auth.admin.createUser({
            email, password: PASSWORD, email_confirm: true,
            user_metadata: { username },
          });
          if (retry?.user) {
            if (avatar) await supabase.from('users').update({ avatar_url: avatar }).eq('id', retry.user.id);
            return { id: retry.user.id, username, email };
          }
        }
        if (!users?.users?.length || users.users.length < 1000) break;
        page++;
      }
      console.error(`  Failed ${username}: could not resolve existing user`);
      return null;
    }
    console.error(`  Failed ${username}: ${error.message}`);
    return null;
  }
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
      if (PROTECTED_EMAILS.includes(u.email)) continue;
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

  // Get protected user IDs to preserve their data
  const { data: protectedUsers } = await supabase.from('users').select('id').in('email', PROTECTED_EMAILS);
  const protectedIds = (protectedUsers ?? []).map(u => u.id);

  // Delete data but preserve protected users' content
  if (protectedIds.length > 0) {
    const pIds = `(${protectedIds.join(',')})`;
    await supabase.from('notifications').delete().not('recipient_id', 'in', pIds);
    await supabase.from('comment_likes').delete().not('user_id', 'in', pIds);
    await supabase.from('comments').delete().not('user_id', 'in', pIds);
    await supabase.from('post_shares').delete().not('sender_id', 'in', pIds).not('receiver_id', 'in', pIds);
    await supabase.from('vote_streaks').delete().not('user_a', 'in', pIds).not('user_b', 'in', pIds);
    await supabase.from('friendships').delete().not('user_a', 'in', pIds).not('user_b', 'in', pIds);
  } else {
    await supabase.from('notifications').delete().not('id', 'is', null);
    await supabase.from('comment_likes').delete().not('user_id', 'is', null);
    await supabase.from('comments').delete().not('id', 'is', null);
    await supabase.from('post_shares').delete().not('id', 'is', null);
    await supabase.from('vote_streaks').delete().not('user_a', 'is', null);
    await supabase.from('friendships').delete().not('user_a', 'is', null);
  }
  await supabase.from('streak_cron_state').update({ last_processed_at: '2000-01-01T00:00:00Z' }).eq('id', 1);
  log('Cleared data (preserved protected users)');

  // ── 2. Find Kevin (protected users' data is preserved) ───────────────────
  const { data: kevin } = await supabase.from('users').select('id').eq('email', KEVIN_EMAIL).single();
  if (!kevin) { console.error('Kevin not found!'); process.exit(1); }
  console.log(`\n👤 Kevin ID: ${kevin.id}`);
  log('Protected users preserved: ' + PROTECTED_EMAILS.join(', '));

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

  // ── 5b. Upload local quote images to Supabase storage ────────────────────
  console.log('\n📝 Uploading quote images...');
  const quotesDir = path.join(__dirname, '..', 'assets', 'seed-quotes');
  const quoteFiles = fs.readdirSync(quotesDir).filter(f => f.endsWith('.jpg'));
  const quoteUrls = [];
  for (const file of quoteFiles) {
    const filePath = path.join(quotesDir, file);
    const fileData = fs.readFileSync(filePath);
    const storagePath = `seed-quotes/${file}`;
    await supabase.storage.from('uploads').upload(storagePath, fileData, { contentType: 'image/jpeg', upsert: true });
    const { data } = supabase.storage.from('uploads').getPublicUrl(storagePath);
    quoteUrls.push(data.publicUrl);
  }
  // Override quotes photo pool with our custom images
  photoPool['quotes'] = quoteUrls.map(url => ({ url, width: 1080, height: 1350, alt: '' }));
  log(`${quoteUrls.length} quote images uploaded`);

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
        const caption = pick(CAPTIONS[catKey]);
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

        const caption = pick(CAPTIONS[catKey]);
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

  // ── 12. Post shares (inbox messages) ──────────────────────────────────────
  console.log('\n📩 Generating post shares...');
  const shareRows = [];

  // Friends share posts with Kevin (varying frequency — simulates frequent vs rare sharers)
  const shareFrequency = { sarah: 8, bill: 5, maya: 3, jake: 6, luna: 2, alex: 4, nova: 7, finn: 1, zoe: 3, omar: 5 };
  for (const friend of friends) {
    const count = shareFrequency[friend.username] || 3;
    // Pick random posts NOT by Kevin and NOT by this friend
    const shareable = shuffle(allPosts.filter(p => p.user_id !== kevin.id && p.user_id !== friend.id));
    for (let i = 0; i < Math.min(count, shareable.length); i++) {
      // Stagger timestamps so they're not all at the same time
      const hoursAgo = Math.floor(Math.random() * 72); // within last 3 days
      const createdAt = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
      shareRows.push({
        sender_id: friend.id,
        receiver_id: kevin.id,
        upload_id: shareable[i].id,
        created_at: createdAt,
        seen_at: Math.random() < 0.4 ? createdAt : null, // 40% already seen
      });
    }
  }

  // Kevin shares some posts with friends
  const kevinShareable = shuffle(allPosts.filter(p => p.user_id !== kevin.id));
  for (let i = 0; i < Math.min(12, kevinShareable.length, friends.length * 2); i++) {
    const recipient = friends[i % friends.length];
    const hoursAgo = Math.floor(Math.random() * 48);
    shareRows.push({
      sender_id: kevin.id,
      receiver_id: recipient.id,
      upload_id: kevinShareable[i].id,
      created_at: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
      seen_at: null,
    });
  }

  // Friends share with each other (cross-chatter)
  for (let i = 0; i < friends.length - 1; i++) {
    const sender = friends[i];
    const receiver = friends[i + 1];
    const shareable = shuffle(allPosts.filter(p => p.user_id !== sender.id && p.user_id !== receiver.id));
    const count = 2 + Math.floor(Math.random() * 4);
    for (let j = 0; j < Math.min(count, shareable.length); j++) {
      const hoursAgo = Math.floor(Math.random() * 96);
      shareRows.push({
        sender_id: sender.id,
        receiver_id: receiver.id,
        upload_id: shareable[j].id,
        created_at: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
        seen_at: Math.random() < 0.6 ? new Date(Date.now() - (hoursAgo - 1) * 3600 * 1000).toISOString() : null,
      });
    }
  }

  // Regular batch insert (no upsert — each share is unique)
  for (let i = 0; i < shareRows.length; i += BATCH_SIZE) {
    const chunk = shareRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('post_shares').insert(chunk);
    if (error) console.error('  Batch insert error (post_shares):', error.message);
  }
  const kevinInbox = shareRows.filter(r => r.receiver_id === kevin.id);
  const kevinUnseen = kevinInbox.filter(r => !r.seen_at);
  log(`${shareRows.length} shares total (${kevinInbox.length} to Kevin, ${kevinUnseen.length} unseen)`);

  // ── 13. Comments (top-level + replies) ────────────────────────────────────
  console.log('\n💬 Generating comments...');

  const COMMENT_TEMPLATES = [
    'oh wow', 'yooo', 'this is crazy', 'nah', 'wait what', 'lol',
    'bro', 'im weak', 'ok this is actually sick', 'not bad ngl',
    'hard pass', 'lets goooo', 'idk about this one', 'hmm',
    'the more i look at it the better it gets', 'this aint it',
    'genuinely cant tell if this is rad or bad', 'respectfully no',
    'ok i see you', 'sleeper hit', 'how is nobody talking about this',
    'showed my roommate and they said bad but theyre wrong',
    'this deserves more love', 'im torn on this one honestly',
    'the lighting carries this hard', 'clean', 'mid', 'elite',
    'whoever posted this has taste', 'instant rad from me',
    'voting bad and i dont feel bad about it', 'rad all day',
    'wait is this edited or real', 'this photo has a vibe idk',
    'straight heat', 'this pic goes crazy actually',
    'the composition tho', 'top 5 post ive seen this week',
    'love this', 'terrible lol', 'vibes', 'not my thing but respect',
    'i keep coming back to this one', 'this shouldnt work but it does',
    'bruh who uploaded this 💀', 'obsessed', 'meh',
    'lowkey fire', 'highkey fire', 'criminally underrated',
    'the people need to see this', 'why does this have so few votes',
    'im voting rad just for the audacity', 'bold choice posting this',
  ];

  const REPLY_TEMPLATES = [
    'fr', 'nah fr', 'exactly', 'wrong', 'how', 'literally',
    'this', 'say less', 'w', 'huge L', 'based',
    'you spitting', 'nah you trippin', 'facts tho', 'cope',
    'agree to disagree', 'bro what are you looking at',
    'i thought the same thing lmao', 'huh??', 'real',
    'no way you actually think that', 'respect the take',
    'finally someone with taste', 'youre seeing things',
    'hard agree', 'couldn\'t disagree more', 'ok fair point',
    'lol what', 'i mean youre not wrong', 'youre not wrong but',
    'delete this comment', 'best comment here', 'underrated reply',
    'came here to say this', 'honestly yeah', 'wait actually true',
  ];

  const commentRows = [];
  const replyRows = [];

  // Pick ~60% of posts to have comments
  const postsWithComments = shuffle(allPosts).slice(0, Math.floor(allPosts.length * 0.6));

  for (const post of postsWithComments) {
    // 2-8 top-level comments per post
    const numComments = 2 + Math.floor(Math.random() * 7);
    const commenters = shuffle(allUsers.filter(u => u.id !== post.user_id)).slice(0, numComments);

    for (const commenter of commenters) {
      const hoursAgo = Math.floor(Math.random() * 120); // within last 5 days
      commentRows.push({
        upload_id: post.id,
        user_id: commenter.id,
        body: pick(COMMENT_TEMPLATES),
        created_at: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
      });
    }
  }

  // Batch insert top-level comments
  const insertedComments = [];
  for (let i = 0; i < commentRows.length; i += BATCH_SIZE) {
    const chunk = commentRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('comments').insert(chunk).select('id, upload_id, user_id');
    if (error) console.error('  Comment insert error:', error.message);
    else if (data) insertedComments.push(...data);
    process.stdout.write('.');
  }
  console.log(`\n  ${insertedComments.length} top-level comments`);

  // Add replies to ~40% of top-level comments
  const commentsWithReplies = shuffle(insertedComments).slice(0, Math.floor(insertedComments.length * 0.4));

  for (const parent of commentsWithReplies) {
    const numReplies = 1 + Math.floor(Math.random() * 4);
    const repliers = shuffle(allUsers.filter(u => u.id !== parent.user_id)).slice(0, numReplies);

    for (const replier of repliers) {
      // Find the parent commenter's username for @mention
      const parentUser = allUsers.find(u => u.id === parent.user_id);
      const mentionPrefix = parentUser && Math.random() > 0.4 ? `@${parentUser.username} ` : '';
      const hoursAgo = Math.floor(Math.random() * 48);
      replyRows.push({
        upload_id: parent.upload_id,
        user_id: replier.id,
        parent_id: parent.id,
        body: mentionPrefix + pick(REPLY_TEMPLATES),
        created_at: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
      });
    }
  }

  // Batch insert replies
  let replyCount = 0;
  for (let i = 0; i < replyRows.length; i += BATCH_SIZE) {
    const chunk = replyRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('comments').insert(chunk).select('id');
    if (error) console.error('  Reply insert error:', error.message);
    else if (data) replyCount += data.length;
    process.stdout.write('.');
  }
  console.log(`\n  ${replyCount} replies`);

  // Like some comments (friends like ~30% of comments on posts they voted on)
  const commentLikeRows = [];
  for (const friend of friends) {
    const friendComments = shuffle(insertedComments).slice(0, Math.floor(insertedComments.length * 0.3));
    for (const comment of friendComments) {
      if (comment.user_id === friend.id) continue;
      commentLikeRows.push({ user_id: friend.id, comment_id: comment.id });
    }
  }
  await batchUpsert('comment_likes', commentLikeRows, 'user_id,comment_id');
  log(`${commentLikeRows.length} comment likes`);

  // ── 14. Refresh streaks ──────────────────────────────────────────────────
  console.log('\n⚡ Refreshing streaks...');
  await supabase.rpc('refresh_vote_streaks');
  log('Streaks computed');

  // ── 14b. Clear auto-generated notifications (triggers fired during seeding)
  // Preserve notifications for protected users
  console.log('\n🧹 Clearing seed-generated notifications...');
  if (protectedIds.length > 0) {
    await supabase.from('notifications').delete().not('recipient_id', 'in', `(${protectedIds.join(',')})`);
  } else {
    await supabase.from('notifications').delete().not('id', 'is', null);
  }
  log('Cleared notifications (preserved protected users)');

  // ── 15. Verify ───────────────────────────────────────────────────────────
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
  const { data: uc } = await supabase.rpc('get_unread_notification_count', { p_user_id: kevin.id });
  log(`Inbox unread: ${uc ?? 0}`);

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║              ALL DONE!               ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  ${friends.length} friends + ${strangers.length} strangers`);
  console.log(`  ${allPosts.length} posts, ${voteRows.length} votes`);
  console.log(`  ${insertedComments.length} comments + ${replyCount} replies + ${commentLikeRows.length} likes`);
  console.log(`  ${shareRows.length} post shares (${kevinUnseen.length} unread for Kevin)`);
  console.log(`  ~5% milestone posts (every 20th)`);
  console.log(`  3 pending friend requests`);
}

main().catch((err) => { console.error(err); process.exit(1); });
