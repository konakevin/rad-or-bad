#!/usr/bin/env node
'use strict';

/**
 * test-profiles.js — Create 10 test profiles, generate a dream for each,
 * analyze whether the engine produces relevant, beautiful results.
 *
 * Usage:
 *   node scripts/test-profiles.js
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
    if (!process.env[trimmed.slice(0, eq).trim()])
      process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const KEVIN_ID = 'eab700d8-f11a-4f47-a3a1-addda6fb67ec';
const KEVIN_EMAIL = 'konakevin@gmail.com';
const KEVIN_PASS = '01hapanui';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const userClient = createClient(SUPABASE_URL, ANON_KEY);

// Vibe → interest injection map
const VIBE_INTERESTS = {
  cozy: ['nature', 'food', 'animals'],
  dark: ['dark'],
  glamour: ['fashion'],
  gamer: ['gaming', 'geek'],
  anime_fantasy: ['fantasy', 'gaming', 'anime'],
  beach_ocean: ['ocean', 'nature'],
  space_scifi: ['space', 'sci_fi'],
  epic_adventure: ['sports', 'travel', 'nature'],
  whimsical: ['whimsical', 'cute'],
};

// Vibe → archetype patterns
const VIBE_MAP = {
  cozy: ['cozy_','peaceful_','nostalgic_','dreamy_','food_','anime_lofi_study','fashion_ballet_dreamer','fashion_vintage_glamour','music_lofi_rain','travel_train_journey','cute_animal_kingdom','whimsical_bookish_romantic'],
  dark: ['dark_','moody_','mysterious_','baddie_vampire_countess','moody_dark_gothic_muse','baddie_noir_detective'],
  glamour: ['intense_fashion_siren','intense_sci_fi_huntress','moody_dark_gothic_muse','playful_fashion_pinup','dramatic_movies_silver_screen','dreamy_ocean_goddess','ocean_mermaid_siren','dramatic_fantasy_enchantress','epic_sports_athletic_goddess','whimsical_cute_anime_dream','nostalgic_music_jazz_flame','mermaid_lagoon_siren_song','music_ocean_siren_seduction','baddie_'],
  gamer: ['gaming_','geek_','steampunk_','whimsical_cute_anime_dream','baddie_samurai_empress'],
  anime_fantasy: ['anime_','fantasy_','ghibli_','movies_ghibli_world','movies_lotr_fellowship','movies_harry_potter','movies_star_wars','dramatic_fantasy_enchantress','baddie_witch_queen'],
  beach_ocean: ['ocean_','dreamy_ocean','playful_ocean','serene_ocean','dreamy_ocean_goddess','ocean_mermaid_siren','ocean_mermaid_cute','ocean_pirate_captain','ocean_coral_palace','ocean_deep_abyss','baddie_jungle_goddess','baddie_mermaid_dark','baddie_festival_goddess'],
  space_scifi: ['space_','sci_fi_','cosmic_','abstract_','universal_surreal_mindbend','universal_impossible_landscape','intense_sci_fi_huntress','baddie_space_empress'],
  epic_adventure: ['universal_','vista_','alien_','earth_','sports_','travel_','dark_samurai_ronin','dark_viking_saga','nature_mountain_king','baddie_jungle_goddess','epic_sports_athletic_goddess','baddie_racing_queen'],
  whimsical: ['whimsical_','playful_','cute_','cute_pastel_kingdom','cute_sanrio_world','universal_tiny_worlds','universal_seasons_collide','food_feast_of_kings','food_midnight_feast'],
};

const PROFILES = [
  {
    label: 'Gamer Girl',
    interests: ['gaming', 'anime', 'fantasy', 'cute'],
    vibes: ['gamer', 'anime_fantasy', 'whimsical'],
    moods: ['playful', 'whimsical', 'epic', 'cozy', 'dreamy'],
    eras: ['synthwave', 'far_future', 'fairy_tale', 'cyberpunk'],
    settings: ['cozy_indoors', 'otherworldly', 'city_streets'],
    palettes: ['neon', 'soft_pastel', 'cool_twilight'],
    atmospheres: ['starry_midnight', 'aurora_night', 'cherry_blossom'],
    companion: 'cat',
    axes: { chaos: 0.6, scale: 0.5, energy: 0.5, realism: 0.5, weirdness: 0.4, brightness: 0.6, complexity: 0.5, color_warmth: 0.5 },
  },
  {
    label: 'Gothic Horror Queen',
    interests: ['horror', 'fantasy', 'architecture', 'dark'],
    vibes: ['dark'],
    moods: ['moody', 'mysterious', 'spooky', 'dramatic', 'intense'],
    eras: ['victorian', 'medieval', 'haunted'],
    settings: ['underground', 'cozy_indoors', 'village'],
    palettes: ['dark_bold', 'monochrome'],
    atmospheres: ['foggy_dawn', 'stormy_twilight', 'moonlit'],
    companion: 'ghost',
    axes: { chaos: 0.5, scale: 0.6, energy: 0.6, realism: 0.5, weirdness: 0.6, brightness: 0.5, complexity: 0.5, color_warmth: 0.5 },
  },
  {
    label: 'Beach Babe',
    interests: ['ocean', 'animals', 'nature', 'fashion'],
    vibes: ['beach_ocean', 'glamour', 'cozy'],
    moods: ['dreamy', 'peaceful', 'playful', 'romantic', 'serene'],
    eras: ['tropical', 'modern', 'mythological'],
    settings: ['beach_tropical', 'underwater', 'village'],
    palettes: ['ocean_blues', 'warm_sunset', 'soft_pastel'],
    atmospheres: ['golden_hour', 'sunny_morning', 'tropical_rain'],
    companion: 'mermaid',
    axes: { chaos: 0.3, scale: 0.6, energy: 0.3, realism: 0.5, weirdness: 0.2, brightness: 0.7, complexity: 0.5, color_warmth: 0.7 },
  },
  {
    label: 'Sci-Fi Nerd',
    interests: ['sci_fi', 'gaming', 'geek', 'architecture'],
    vibes: ['space_scifi', 'gamer'],
    moods: ['epic', 'intense', 'mysterious', 'dramatic'],
    eras: ['far_future', 'cyberpunk', 'synthwave'],
    settings: ['city_streets', 'space', 'otherworldly'],
    palettes: ['neon', 'dark_bold', 'cool_twilight'],
    atmospheres: ['starry_midnight', 'stormy_twilight', 'overcast'],
    companion: 'robot',
    axes: { chaos: 0.7, scale: 0.7, energy: 0.8, realism: 0.5, weirdness: 0.5, brightness: 0.4, complexity: 0.5, color_warmth: 0.3 },
  },
  {
    label: 'Cottagecore Dreamer',
    interests: ['nature', 'animals', 'fantasy'],
    vibes: ['cozy', 'whimsical'],
    moods: ['cozy', 'peaceful', 'dreamy', 'nostalgic', 'whimsical'],
    eras: ['victorian', 'fairy_tale', 'medieval', 'retro'],
    settings: ['cozy_indoors', 'village', 'wild_outdoors'],
    palettes: ['earthy_natural', 'warm_sunset', 'soft_pastel'],
    atmospheres: ['golden_hour', 'misty_forest', 'autumn_leaves', 'overcast'],
    companion: 'deer',
    axes: { chaos: 0.3, scale: 0.3, energy: 0.2, realism: 0.5, weirdness: 0.2, brightness: 0.7, complexity: 0.5, color_warmth: 0.8 },
  },
  {
    label: 'Anime Superfan',
    interests: ['anime', 'gaming', 'fantasy', 'cute'],
    vibes: ['anime_fantasy', 'whimsical', 'gamer'],
    moods: ['dreamy', 'epic', 'playful', 'romantic', 'nostalgic'],
    eras: ['far_future', 'fairy_tale', 'samurai', 'modern'],
    settings: ['city_streets', 'cozy_indoors', 'otherworldly'],
    palettes: ['neon', 'soft_pastel', 'jewel_tones'],
    atmospheres: ['cherry_blossom', 'starry_midnight', 'sunset_fire'],
    companion: 'fox',
    axes: { chaos: 0.5, scale: 0.5, energy: 0.6, realism: 0.5, weirdness: 0.4, brightness: 0.6, complexity: 0.5, color_warmth: 0.5 },
  },
  {
    label: 'Mythology Buff',
    interests: ['mythology', 'fantasy', 'architecture', 'nature'],
    vibes: ['epic_adventure', 'anime_fantasy'],
    moods: ['epic', 'dramatic', 'mysterious', 'nostalgic'],
    eras: ['mythological', 'ancient', 'medieval', 'samurai'],
    settings: ['mountains', 'otherworldly', 'village'],
    palettes: ['jewel_tones', 'warm_sunset', 'dark_bold'],
    atmospheres: ['stormy_twilight', 'golden_hour', 'moonlit'],
    companion: 'dragon',
    axes: { chaos: 0.5, scale: 0.8, energy: 0.7, realism: 0.5, weirdness: 0.3, brightness: 0.5, complexity: 0.5, color_warmth: 0.5 },
  },
  {
    label: 'Glamour Queen',
    interests: ['fashion', 'ocean', 'architecture'],
    vibes: ['glamour', 'beach_ocean', 'dark'],
    moods: ['dramatic', 'intense', 'romantic', 'mysterious'],
    eras: ['art_deco', 'modern', 'victorian'],
    settings: ['city_streets', 'beach_tropical', 'cozy_indoors'],
    palettes: ['jewel_tones', 'dark_bold', 'neon'],
    atmospheres: ['moonlit', 'golden_hour', 'sunset_fire'],
    companion: 'butterfly',
    axes: { chaos: 0.4, scale: 0.5, energy: 0.5, realism: 0.5, weirdness: 0.2, brightness: 0.5, complexity: 0.5, color_warmth: 0.5 },
  },
  {
    label: 'Tattoo Artist',
    interests: ['tattoo_art', 'horror', 'mythology', 'nature'],
    vibes: ['dark', 'epic_adventure'],
    moods: ['intense', 'moody', 'dramatic', 'mysterious', 'spooky'],
    eras: ['samurai', 'viking', 'mythological', 'modern'],
    settings: ['city_streets', 'underground', 'wild_outdoors'],
    palettes: ['dark_bold', 'monochrome', 'jewel_tones'],
    atmospheres: ['moonlit', 'stormy_twilight', 'foggy_dawn'],
    companion: 'wolf',
    axes: { chaos: 0.6, scale: 0.5, energy: 0.7, realism: 0.5, weirdness: 0.5, brightness: 0.3, complexity: 0.5, color_warmth: 0.3 },
  },
  {
    label: 'Whimsical Kid at Heart',
    interests: ['cute', 'animals', 'fantasy', 'anime'],
    vibes: ['whimsical', 'cozy', 'anime_fantasy'],
    moods: ['playful', 'whimsical', 'cozy', 'dreamy', 'euphoric'],
    eras: ['fairy_tale', 'retro', 'modern'],
    settings: ['cozy_indoors', 'village', 'otherworldly'],
    palettes: ['soft_pastel', 'neon', 'ocean_blues'],
    atmospheres: ['cherry_blossom', 'sunny_morning', 'aurora_night'],
    companion: 'unicorn',
    axes: { chaos: 0.5, scale: 0.4, energy: 0.5, realism: 0.5, weirdness: 0.4, brightness: 0.8, complexity: 0.5, color_warmth: 0.7 },
  },
];

async function matchArchetypes(recipe) {
  const userInterests = new Set(recipe.interests);
  const userMoods = new Set(recipe.selected_moods);
  const { data: archs } = await supabase
    .from('dream_archetypes')
    .select('id, key, trigger_interests, trigger_moods')
    .eq('is_active', true);

  const matchedIds = new Set();

  // Interest × mood matching
  for (const a of archs) {
    if (a.trigger_interests.some(i => userInterests.has(i)) && a.trigger_moods.some(m => userMoods.has(m))) {
      matchedIds.add(a.id);
    }
  }

  // Vibe bundle injection
  for (const vibe of (recipe.selected_vibes || [])) {
    const patterns = VIBE_MAP[vibe] || [];
    for (const a of archs) {
      for (const p of patterns) {
        if (p.endsWith('_') ? a.key.startsWith(p) : a.key === p) {
          matchedIds.add(a.id);
          break;
        }
      }
    }
  }

  return matchedIds;
}

async function main() {
  // Auth as Kevin
  const { data: auth } = await userClient.auth.signInWithPassword({
    email: KEVIN_EMAIL, password: KEVIN_PASS,
  });
  if (!auth?.session) { console.error('Auth failed'); process.exit(1); }

  const results = [];
  const outputDir = path.join(__dirname, 'profile-test-output');
  fs.mkdirSync(outputDir, { recursive: true });

  for (let i = 0; i < PROFILES.length; i++) {
    const p = PROFILES[i];
    console.log(`\n═══ [${i+1}/10] ${p.label} ═══`);

    // Build recipe with vibe interest injection
    const allInterests = new Set(p.interests);
    for (const v of p.vibes) {
      for (const interest of (VIBE_INTERESTS[v] || [])) allInterests.add(interest);
    }

    const recipe = {
      axes: p.axes,
      interests: [...allInterests],
      selected_vibes: p.vibes,
      selected_moods: p.moods,
      color_palettes: p.palettes,
      personality_tags: [],
      eras: p.eras,
      settings: p.settings,
      scene_atmospheres: p.atmospheres,
      spirit_companion: p.companion,
    };

    // Set recipe
    await supabase.from('user_recipes').update({ recipe }).eq('user_id', KEVIN_ID);

    // Match archetypes
    const matchedIds = await matchArchetypes(recipe);
    await supabase.from('user_archetypes').delete().eq('user_id', KEVIN_ID);
    if (matchedIds.size > 0) {
      await supabase.from('user_archetypes').insert(
        [...matchedIds].map(id => ({ user_id: KEVIN_ID, archetype_id: id }))
      );
    }

    console.log(`  Interests: ${recipe.interests.join(', ')}`);
    console.log(`  Moods: ${p.moods.join(', ')}`);
    console.log(`  Archetypes: ${matchedIds.size}`);

    // Generate 3 dreams
    for (let d = 0; d < 3; d++) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-dream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.session.access_token}`,
            'apikey': ANON_KEY,
          },
          body: JSON.stringify({ mode: 'flux-dev', recipe, persist: true }),
        });
        const data = await res.json();

        if (data.image_url) {
          // Get log
          const { data: logs } = await supabase
            .from('ai_generation_log')
            .select('enhanced_prompt, rolled_axes')
            .eq('user_id', KEVIN_ID)
            .order('created_at', { ascending: false })
            .limit(1);
          const log = logs?.[0];
          const axes = log?.rolled_axes || {};

          console.log(`  Dream ${d+1}: ${axes.dreamMode}/${axes.archetype || 'none'} | ${(axes.model || '').split('/').pop()}`);
          console.log(`    ${data.prompt_used?.slice(0, 100)}...`);

          // Download image
          const filename = `${String(i+1).padStart(2,'0')}_${p.label.replace(/\s+/g,'_')}_dream${d+1}.jpg`;
          const filepath = path.join(outputDir, filename);
          try {
            const imgRes = await fetch(data.image_url);
            const buf = await imgRes.arrayBuffer();
            fs.writeFileSync(filepath, Buffer.from(buf));
          } catch {}

          results.push({
            profile: p.label,
            dream: d + 1,
            mode: axes.dreamMode,
            archetype: axes.archetype || 'none',
            model: axes.model,
            prompt: data.prompt_used,
            image_url: data.image_url,
            local_file: filepath,
          });
        }
      } catch (e) {
        console.log(`  Dream ${d+1}: ❌ ${e.message}`);
      }

      if (d < 2) await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Save results
  fs.writeFileSync(path.join(__dirname, 'profile-test-results.json'), JSON.stringify(results, null, 2));
  console.log(`\n✅ Done! ${results.length} dreams across 10 profiles`);
  console.log(`Images: ${outputDir}/`);
}

main().catch(console.error);
