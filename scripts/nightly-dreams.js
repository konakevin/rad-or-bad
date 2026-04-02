#!/usr/bin/env node

/**
 * nightly-dreams.js — Generate one dream per eligible user.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx REPLICATE_API_TOKEN=xxx node scripts/nightly-dreams.js
 *
 * Options:
 *   --max-budget <cents>   Stop after spending this much (default: 500 = $5)
 *   --batch-size <n>       Process n users in parallel (default: 5)
 *   --dry-run              Build prompts but don't generate images
 */

const { createClient } = require('@supabase/supabase-js');

// ── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://jimftynwrinwenonjrlj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const MAX_BUDGET_CENTS = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--max-budget') ?? '500', 10);
const BATCH_SIZE = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--batch-size') ?? '5', 10);
const DRY_RUN = process.argv.includes('--dry-run');
const COST_PER_IMAGE_CENTS = 3; // ~$0.03 for Flux Dev on Replicate

if (!SUPABASE_KEY || !REPLICATE_TOKEN) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or REPLICATE_API_TOKEN');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Inline recipe engine (simplified for Node) ─────────────────────────────
// We can't import the TS module directly, so we duplicate the core logic here.

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rollAxis(value) { return Math.random() < value ? 'high' : 'low'; }

function filterPool(pool, rolled) {
  const scored = pool.map((opt) => {
    let score = 0;
    if (opt.axes) {
      for (const [axis, val] of Object.entries(opt.axes)) {
        if (rolled[axis] === val) score += 1;
        else score -= 0.5;
      }
    }
    return { text: opt.text, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return pick(scored.slice(0, 8)).text;
}

// Minimal pools — enough for variety. Full pools are in lib/recipeEngine.ts.
const MEDIUMS = [
  { text: 'Pixar-style 3D render, soft rounded shapes, vibrant colors', axes: { realism: 'low', energy: 'low' } },
  { text: 'Studio Ghibli anime watercolor, hand-painted cel animation', axes: { realism: 'low', color_warmth: 'high' } },
  { text: 'adorable chibi kawaii illustration, big sparkly eyes, pastel colors', axes: { realism: 'low', brightness: 'high' } },
  { text: 'oil painting on canvas, visible brushstrokes, impressionist', axes: { realism: 'low', complexity: 'high' } },
  { text: 'ultra-realistic photograph, DSLR, 8K detail', axes: { realism: 'high', complexity: 'high' } },
  { text: 'Van Gogh Starry Night style, swirling thick brushstrokes', axes: { realism: 'low', complexity: 'high', energy: 'high' } },
  { text: 'comic book panel, bold ink outlines, halftone dots', axes: { realism: 'low', energy: 'high' } },
  { text: 'dreamy soft-focus film photography, 35mm grain, light leaks', axes: { realism: 'high', brightness: 'high' } },
  { text: 'LEGO brick diorama, plastic minifigures, studs visible', axes: { realism: 'low', complexity: 'low', brightness: 'high' } },
  { text: 'retro anime VHS aesthetic, 1990s cel animation, warm grain', axes: { realism: 'low', color_warmth: 'high', energy: 'high' } },
  { text: 'Makoto Shinkai style, photorealistic anime backgrounds, dramatic sky', axes: { realism: 'high', brightness: 'high', complexity: 'high' } },
  { text: 'Bob Ross happy little trees, soft landscape, calm mountains', axes: { realism: 'low', energy: 'low', color_warmth: 'high' } },
  { text: 'pop art screen print, bold primary colors, Andy Warhol style', axes: { realism: 'low', energy: 'high', brightness: 'high' } },
  { text: 'felt and fabric diorama, stitched textures, button eyes', axes: { realism: 'low', brightness: 'high', energy: 'low' } },
  { text: 'cyberpunk neon cityscape style, rain-slicked surfaces', axes: { realism: 'high', brightness: 'low', energy: 'high' } },
];

const MOODS = [
  { text: 'cozy and intimate', axes: { energy: 'low', color_warmth: 'high' } },
  { text: 'epic and grandiose', axes: { energy: 'high', complexity: 'high' } },
  { text: 'ethereal and dreamlike', axes: { energy: 'low', brightness: 'high' } },
  { text: 'playful and whimsical', axes: { energy: 'low', brightness: 'high' } },
  { text: 'mysterious and suspenseful', axes: { energy: 'high', brightness: 'low' } },
  { text: 'silly and absurd', axes: { energy: 'high', brightness: 'high' } },
  { text: 'magical and enchanted', axes: { energy: 'low', brightness: 'high' } },
  { text: 'triumphant and heroic', axes: { energy: 'high', brightness: 'high' } },
];

const LIGHTINGS = [
  { text: 'golden hour sunlight', axes: { color_warmth: 'high', brightness: 'high' } },
  { text: 'cool blue moonlight', axes: { color_warmth: 'low', brightness: 'low' } },
  { text: 'neon city glow', axes: { color_warmth: 'low', brightness: 'low' } },
  { text: 'warm candlelight', axes: { color_warmth: 'high', brightness: 'low' } },
  { text: 'soft overcast diffused light', axes: { brightness: 'high', energy: 'low' } },
  { text: 'aurora borealis light', axes: { color_warmth: 'low', energy: 'high' } },
];

const ACTIONS = [
  'tumbling', 'sneaking', 'leaping', 'exploring a hidden passage in',
  'riding a paper airplane through', 'having a tea party with unexpected guests',
  'discovering a glowing portal', 'teaching ducklings to march',
  'building a fort out of', 'napping peacefully on', 'surfing on top of',
  'painting a tiny masterpiece of', 'conducting a tiny orchestra',
  'accidentally summoning something magical', 'befriending a creature twice their size',
  'fishing in a puddle and catching something huge', 'sword-fighting with breadsticks',
];

const INTEREST_FLAVORS = {
  gaming: ['Pokémon-style', 'Minecraft blocky', 'Zelda-inspired', 'Animal Crossing', 'retro arcade'],
  movies: ['Star Wars', 'Lord of the Rings', 'Harry Potter', 'Spirited Away', 'Jurassic Park', 'SpongeBob'],
  music: ['rock concert', 'jazz club', 'EDM festival', 'vinyl record shop', 'acoustic campfire guitar'],
  geek: ['Naruto ninja village', 'Dragon Ball energy blast', 'comic book superhero', 'mech suit cockpit'],
  sports: ['surfing a massive wave', 'skateboard halfpipe', 'basketball slam dunk', 'snowboarding powder run'],
  travel: ['Eiffel Tower at midnight', 'cherry blossom temple in Kyoto', 'Grand Canyon sunrise', 'Caribbean beach'],
  pride: ['rainbow flag colors flowing', 'pride parade confetti', 'rainbow crosswalk'],
};

const ERA_KEYWORDS = {
  prehistoric: 'prehistoric world, cave paintings, volcanoes',
  ancient: 'ancient civilization, stone and bronze, weathered ruins',
  medieval: 'medieval fantasy, stone castles, candlelit',
  victorian: 'Victorian era, ornate brass and dark wood, gas lamps',
  steampunk: 'steampunk Victorian, brass gears, airships, clockwork',
  art_deco: '1920s art deco, jazz age, gold and black geometry',
  retro: 'retro 1950s-70s, mid-century modern, vintage colors',
  synthwave: '1980s synthwave, neon grid, palm trees, sunset gradient',
  modern: 'contemporary modern, clean lines, current day',
  far_future: 'far future sci-fi, holographic, chrome and glass',
};

const SETTING_KEYWORDS = {
  cozy_indoors: 'cozy interior, warm room, furniture, shelves, windows',
  wild_outdoors: 'outdoor wilderness, forests, mountains, open sky',
  city_streets: 'urban cityscape, streets, buildings, signs',
  beach_tropical: 'tropical beach, palm trees, turquoise water, golden sand',
  mountains: 'mountain peaks, alpine meadows, rocky trails, snow caps',
  underwater: 'deep underwater, coral reefs, fish, light rays from surface',
  underground: 'underground cavern, crystals, glowing mushrooms, stalactites',
  village: 'charming village, cobblestone streets, market square, lanterns',
  space: 'outer space, stars, nebula, zero gravity, Earth in distance',
  otherworldly: 'otherworldly realm, floating islands, impossible geometry',
};

const PALETTE_KEYWORDS = {
  warm_sunset: 'warm golden amber and crimson',
  cool_twilight: 'cool blue purple and lavender',
  earthy_natural: 'earthy green brown and forest tones',
  soft_pastel: 'soft pastel pink lavender and cream',
  dark_bold: 'dark dramatic with deep blacks and vivid accents',
  monochrome: 'black and white, high contrast',
  sepia: 'warm sepia tone, vintage amber and brown',
  neon: 'electric neon colors, hot pink cyan lime green',
  candy: 'candy pop colors, bubblegum pink, sparkly gold',
  everything: '',
};

const WEIRDNESS = ['', 'slightly unusual proportions', 'dreamlike distortions', 'surreal impossible geometry', 'full Dalí surrealism'];
const SCALES = ['extreme macro close-up', 'intimate close-up', 'medium shot', 'wide shot', 'epic vast panoramic vista'];

function expandInterest(interest) {
  const flavors = INTEREST_FLAVORS[interest];
  const always = ['gaming', 'movies', 'music', 'geek', 'sports', 'travel', 'pride'];
  if (flavors && (always.includes(interest) || Math.random() < 0.4)) return pick(flavors);
  return interest;
}

function buildPrompt(recipe, wish) {
  const axes = { color_warmth: 0.5, complexity: 0.5, realism: 0.5, energy: 0.5, brightness: 0.5, chaos: 0.5, weirdness: 0.5, scale: 0.5, ...recipe.axes };
  const rolled = {
    realism: rollAxis(axes.realism),
    complexity: rollAxis(axes.complexity),
    energy: rollAxis(axes.energy),
    color_warmth: rollAxis(axes.color_warmth),
    brightness: rollAxis(axes.brightness),
  };

  const medium = filterPool(MEDIUMS, rolled);
  const mood = filterPool(MOODS, rolled);
  const lighting = filterPool(LIGHTINGS, rolled);

  const interests = recipe.interests ?? ['fantasy'];
  const sampled = [...interests].sort(() => Math.random() - 0.5).slice(0, 2).map(expandInterest);

  const eras = recipe.eras ?? ['modern'];
  const era = ERA_KEYWORDS[pick(eras)] ?? ERA_KEYWORDS.modern;
  const settings = recipe.settings ?? ['wild_outdoors'];
  const setting = SETTING_KEYWORDS[pick(settings)] ?? SETTING_KEYWORDS.wild_outdoors;

  const palettes = recipe.color_palettes ?? ['everything'];
  const paletteKey = pick(palettes);
  const colorKw = PALETTE_KEYWORDS[paletteKey] ?? '';

  const tags = (recipe.personality_tags ?? ['dreamy']).sort(() => Math.random() - 0.5).slice(0, 2).join(', ');
  const action = pick(ACTIONS);
  const weirdIdx = Math.min(WEIRDNESS.length - 1, Math.floor(axes.weirdness * WEIRDNESS.length));
  const scaleIdx = Math.min(SCALES.length - 1, Math.floor(axes.scale * SCALES.length));
  const companion = recipe.spirit_companion && Math.random() < 0.3 ? `a small ${recipe.spirit_companion.replace(/_/g, ' ')} visible somewhere in the scene` : '';

  const parts = [
    `${medium}:`,
    wish ? `"${wish}" —` : `${sampled.join(' and ')} scene`,
    wish ? '' : action,
    era,
    setting,
    mood,
    lighting,
    colorKw,
    tags,
    WEIRDNESS[weirdIdx],
    SCALES[scaleIdx],
    companion,
    'portrait orientation 9:16 ratio',
  ].filter(Boolean);

  return parts.join(', ');
}

// ── Image generation ────────────────────────────────────────────────────────

async function generateImage(prompt) {
  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { prompt, aspect_ratio: '9:16', num_outputs: 1, output_format: 'jpg' },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Replicate ${res.status}: ${body.slice(0, 200)}`);
  }

  const pred = await res.json();
  if (!pred.id) throw new Error('No prediction ID');

  // Poll
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
    });
    const data = await poll.json();
    if (data.status === 'succeeded') return data.output?.[0];
    if (data.status === 'failed') throw new Error(`Failed: ${data.error}`);
  }
  throw new Error('Timed out');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌙 Nightly Dream Generation`);
  console.log(`   Budget: ${MAX_BUDGET_CENTS}¢ | Batch: ${BATCH_SIZE} | Dry run: ${DRY_RUN}\n`);

  // Find eligible users: has recipe, ai_enabled, hasn't dreamed today
  const today = new Date().toISOString().slice(0, 10);
  const { data: users, error } = await sb
    .from('user_recipes')
    .select('user_id, recipe, dream_wish')
    .eq('onboarding_completed', true)
    .eq('ai_enabled', true);

  if (error) { console.error('DB error:', error.message); process.exit(1); }
  console.log(`Found ${users.length} eligible users`);

  // Check who already got a dream today
  const { data: todayBudgets } = await sb
    .from('ai_generation_budget')
    .select('user_id')
    .eq('date', today);
  const alreadyDreamed = new Set((todayBudgets ?? []).map(b => b.user_id));

  const eligible = users.filter(u => !alreadyDreamed.has(u.user_id));
  console.log(`${eligible.length} haven't dreamed today\n`);

  let totalCost = 0;
  let generated = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    if (totalCost >= MAX_BUDGET_CENTS) {
      console.log(`\n⚠️  Budget limit reached (${totalCost}¢ / ${MAX_BUDGET_CENTS}¢). Stopping.`);
      break;
    }

    const batch = eligible.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(async (user) => {
      const recipe = user.recipe;
      const wish = user.dream_wish;
      const prompt = buildPrompt(recipe, wish);

      process.stdout.write(`  ${user.user_id.slice(0, 8)}... `);

      if (DRY_RUN) {
        console.log('PROMPT:', prompt.slice(0, 120));
        return;
      }

      const imageUrl = await generateImage(prompt);
      if (!imageUrl) throw new Error('No URL returned');

      // Insert upload
      const { data: uploadRow } = await sb.from('uploads').insert({
        user_id: user.user_id,
        categories: ['fantasy'],
        image_url: imageUrl,
        media_type: 'image',
        caption: null,
        is_ai_generated: true,
        ai_prompt: prompt,
        is_approved: true,
        is_active: true,
        from_wish: wish || null,
      }).select('id').single();

      const uploadId = uploadRow?.id;

      // Send notification
      const BOT_ACCOUNT = '3431d831-1a32-40cd-8fb7-030ada98ad53';
      const notifBody = wish
        ? `Your wish has been granted: "${wish.slice(0, 80)}"`
        : 'A new dream has been conjured';
      try {
        await sb.from('notifications').insert({
          recipient_id: user.user_id,
          actor_id: BOT_ACCOUNT,
          type: 'dream_generated',
          upload_id: uploadId,
          body: notifBody,
        });
      } catch {}

      // Log generation (non-critical)
      try {
        await sb.from('ai_generation_log').insert({
          user_id: user.user_id,
          recipe_snapshot: recipe,
          raw_prompt_input: { wish },
          enhanced_prompt: prompt,
          model_used: 'flux-dev',
          cost_cents: COST_PER_IMAGE_CENTS,
          status: 'completed',
        });
      } catch {}

      // Update budget (non-critical)
      try {
        await sb.from('ai_generation_budget').upsert({
          user_id: user.user_id,
          date: today,
          images_generated: 1,
          total_cost_cents: COST_PER_IMAGE_CENTS,
        }, { onConflict: 'user_id,date' });
      } catch {}

      // Clear wish + modifiers after use
      if (wish) {
        await sb.from('user_recipes').update({ dream_wish: null, wish_modifiers: null }).eq('user_id', user.user_id);
      }

      console.log('✅', wish ? `(wish: "${wish.slice(0, 30)}")` : '');
    }));

    for (const r of results) {
      if (r.status === 'fulfilled') {
        generated++;
        totalCost += COST_PER_IMAGE_CENTS;
      } else {
        failed++;
        console.log('❌', r.reason?.message?.slice(0, 80));
      }
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < eligible.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n✨ Done! Generated: ${generated} | Failed: ${failed} | Cost: ${totalCost}¢`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
