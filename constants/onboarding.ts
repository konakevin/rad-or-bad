import type {
  Interest,
  ColorPalette,
  PersonalityTag,
  Era,
  Setting,
  SceneAtmosphere,
  SpiritCompanion,
} from '@/types/recipe';

/** Step 1: Interest tiles */
export const INTEREST_TILES: { key: Interest; label: string; icon: string }[] = [
  { key: 'animals', label: 'Animals', icon: 'paw' },
  { key: 'nature', label: 'Nature', icon: 'leaf' },
  { key: 'fantasy', label: 'Fantasy', icon: 'sparkles' },
  { key: 'sci_fi', label: 'Sci-Fi', icon: 'planet' },
  { key: 'architecture', label: 'Architecture', icon: 'business' },
  { key: 'fashion', label: 'Fashion', icon: 'shirt' },
  { key: 'food', label: 'Food', icon: 'restaurant' },
  { key: 'abstract', label: 'Abstract', icon: 'color-palette' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
  { key: 'cute', label: 'Cute', icon: 'heart' },
  { key: 'ocean', label: 'Ocean', icon: 'water' },
  { key: 'space', label: 'Space', icon: 'rocket' },
  { key: 'whimsical', label: 'Whimsical', icon: 'balloon' },
  { key: 'gaming', label: 'Gaming', icon: 'game-controller' },
  { key: 'movies', label: 'Movies', icon: 'film' },
  { key: 'music', label: 'Music', icon: 'musical-notes' },
  { key: 'geek', label: 'Geek', icon: 'hardware-chip' },
  { key: 'sports', label: 'Sports', icon: 'football' },
  { key: 'travel', label: 'Travel', icon: 'airplane' },
  { key: 'pride', label: 'Pride', icon: 'heart-circle' },
];

/** Step 2: "I'm into..." vibe tiles — each maps to a curated archetype bundle */
export const VIBE_TILES: { key: string; label: string; icon: string }[] = [
  { key: 'cozy', label: 'Cozy & Cottagecore', icon: 'cafe' },
  { key: 'dark', label: 'Dark & Mysterious', icon: 'moon' },
  { key: 'glamour', label: 'Glamour', icon: 'flame' },
  { key: 'gamer', label: 'Gamer', icon: 'game-controller' },
  { key: 'anime_fantasy', label: 'Anime & Fantasy', icon: 'sparkles' },
  { key: 'beach_ocean', label: 'Beach & Ocean', icon: 'sunny' },
  { key: 'space_scifi', label: 'Space & Sci-Fi', icon: 'rocket' },
  { key: 'epic_adventure', label: 'Epic & Adventure', icon: 'earth' },
  { key: 'music_retro', label: 'Music & Retro', icon: 'musical-notes' },
  { key: 'whimsical', label: 'Whimsical & Surreal', icon: 'color-palette' },
];

/** Vibe → archetype key prefixes/exact keys mapping.
 *  At onboarding, selected vibes inject these archetypes into the user's pool. */
export const VIBE_ARCHETYPE_MAP: Record<string, string[]> = {
  cozy: [
    'cozy_', 'peaceful_', 'nostalgic_', 'dreamy_',
    'cozy_cottagecore_queen', 'whimsical_bookish_romantic', 'music_lofi_rain',
    'travel_train_journey', 'anime_lofi_study', 'cute_animal_kingdom',
    'fashion_ballet_dreamer', 'fashion_vintage_glamour',
    'food_', 'cozy_food',
  ],
  dark: [
    'dark_', 'moody_', 'mysterious_',
    'dark_haunted_beauty', 'music_jazz_midnight', 'dark_cosmic_horror',
    'cute_crystal_witch', 'nature_botanical_witch', 'fantasy_potion_shop',
    'fantasy_undead_kingdom', 'movies_horror_beautiful',
    'baddie_vampire_countess', 'moody_dark_gothic_muse', 'baddie_noir_detective',
  ],
  glamour: [
    'intense_fashion_siren', 'intense_sci_fi_huntress', 'moody_dark_gothic_muse',
    'playful_fashion_pinup', 'dramatic_movies_silver_screen',
    'dreamy_ocean_goddess', 'ocean_mermaid_siren',
    'dramatic_fantasy_enchantress', 'epic_sports_athletic_goddess',
    'whimsical_cute_anime_dream', 'nostalgic_music_jazz_flame',
    'mermaid_lagoon_siren_song', 'music_ocean_siren_seduction',
    'baddie_', // all baddie_* archetypes
  ],
  gamer: [
    'gaming_', 'geek_', 'steampunk_',
    'gaming_zelda_wanderer', 'gaming_dark_souls', 'gaming_minecraft_builder',
    'gaming_pokemon_trainer', 'gaming_retro_arcade', 'gaming_animal_crossing',
    'gaming_cyberpunk_edgerunner', 'gaming_ghibli_adventure',
    'gaming_boss_fight', 'gaming_loot_drop',
    'geek_hacker_den', 'steampunk_airship', 'steampunk_clockwork',
    'movies_blade_runner', 'movies_marvel_hero',
    'whimsical_cute_anime_dream', 'baddie_samurai_empress',
  ],
  anime_fantasy: [
    'anime_', 'fantasy_', 'ghibli_',
    'movies_ghibli_world', 'movies_lotr_fellowship', 'movies_harry_potter',
    'movies_star_wars', 'anime_shonen_battle', 'anime_lofi_study',
    'anime_mecha_sunset', 'anime_slice_of_life',
    'fantasy_dragon_rider', 'fantasy_wizard_tower', 'fantasy_elven_kingdom',
    'fantasy_tavern_night', 'fantasy_potion_shop', 'fantasy_floating_islands',
    'fantasy_enchanted_forest', 'fantasy_undead_kingdom', 'fantasy_dragon_hoard',
    'dramatic_fantasy_enchantress', 'baddie_witch_queen',
  ],
  beach_ocean: [
    'ocean_', 'dreamy_ocean', 'playful_ocean', 'serene_ocean',
    'dreamy_ocean_goddess', 'ocean_mermaid_siren', 'ocean_mermaid_cute',
    'ocean_pirate_captain', 'ocean_coral_palace', 'ocean_deep_abyss',
    'baddie_jungle_goddess', 'baddie_mermaid_dark', 'baddie_festival_goddess',
  ],
  space_scifi: [
    'space_', 'sci_fi_', 'cosmic_',
    'space_astronaut_alone', 'sci_fi_space_battle', 'sci_fi_mech_pilot',
    'dark_cosmic_horror',
    'abstract_', 'universal_surreal_mindbend', 'universal_impossible_landscape',
    'abstract_synesthesia', 'abstract_infinity_room',
    'intense_sci_fi_huntress', 'baddie_space_empress',
  ],
  epic_adventure: [
    'universal_', 'vista_', 'alien_', 'earth_',
    'sports_', 'travel_',
    'sports_legendary_moment', 'sports_muscle_car', 'sports_underdog_glory',
    'dark_samurai_ronin', 'dark_viking_saga',
    'travel_lost_city', 'travel_train_journey',
    'nature_mountain_king',
    'baddie_jungle_goddess', 'epic_sports_athletic_goddess', 'baddie_racing_queen',
  ],
  music_retro: [
    'music_', 'nostalgic_', 'retro_',
    'music_jazz_midnight', 'music_metal_cathedral', 'music_lofi_rain',
    'music_festival_euphoria', 'music_kpop_dreamer',
    'gaming_retro_arcade', 'movies_wes_anderson',
    'nostalgic_music_jazz_flame', 'baddie_k_pop_idol', 'baddie_festival_goddess', 'baddie_midnight_dancer',
  ],
  whimsical: [
    'whimsical_', 'playful_', 'cute_',
    'cute_pastel_kingdom', 'cute_sanrio_world',
    'universal_tiny_worlds', 'universal_seasons_collide',
    'food_feast_of_kings', 'food_midnight_feast',
  ],
};

/** Step 3: Spirit companion tiles */
export const SPIRIT_COMPANIONS: { key: SpiritCompanion; label: string; icon: string }[] = [
  { key: 'fox', label: 'Fox', icon: 'paw' },
  { key: 'cat', label: 'Cat', icon: 'paw' },
  { key: 'owl', label: 'Owl', icon: 'eye' },
  { key: 'dragon', label: 'Dragon', icon: 'flame' },
  { key: 'rabbit', label: 'Rabbit', icon: 'heart' },
  { key: 'wolf', label: 'Wolf', icon: 'moon' },
  { key: 'jellyfish', label: 'Jellyfish', icon: 'water' },
  { key: 'deer', label: 'Deer', icon: 'leaf' },
  { key: 'butterfly', label: 'Butterfly', icon: 'flower' },
  { key: 'robot', label: 'Robot', icon: 'hardware-chip' },
  { key: 'ghost', label: 'Ghost', icon: 'cloudy-night' },
  { key: 'mushroom_creature', label: 'Mushroom', icon: 'nuclear' },
];

/** Step 4: Era tiles */
export const ERA_TILES: { key: Era; label: string; icon: string }[] = [
  { key: 'prehistoric', label: 'Prehistoric', icon: 'bonfire' },
  { key: 'ancient', label: 'Ancient', icon: 'trophy' },
  { key: 'medieval', label: 'Medieval', icon: 'shield' },
  { key: 'victorian', label: 'Victorian', icon: 'key' },
  { key: 'steampunk', label: 'Steampunk', icon: 'cog' },
  { key: 'art_deco', label: 'Art Deco', icon: 'diamond' },
  { key: 'retro', label: 'Retro', icon: 'radio' },
  { key: 'synthwave', label: 'Synthwave', icon: 'musical-notes' },
  { key: 'modern', label: 'Modern', icon: 'phone-portrait' },
  { key: 'far_future', label: 'Far Future', icon: 'rocket' },
];

/** Step 4: Setting tiles */
export const SETTING_TILES: { key: Setting; label: string; icon: string }[] = [
  { key: 'cozy_indoors', label: 'Cozy Indoors', icon: 'home' },
  { key: 'wild_outdoors', label: 'Wild Outdoors', icon: 'trail-sign' },
  { key: 'city_streets', label: 'City Streets', icon: 'business' },
  { key: 'beach_tropical', label: 'Beach & Tropical', icon: 'sunny' },
  { key: 'mountains', label: 'Mountains', icon: 'triangle' },
  { key: 'underwater', label: 'Underwater', icon: 'water' },
  { key: 'underground', label: 'Underground', icon: 'flashlight' },
  { key: 'village', label: 'Village & Town', icon: 'storefront' },
  { key: 'space', label: 'Outer Space', icon: 'rocket' },
  { key: 'otherworldly', label: 'Otherworldly', icon: 'planet' },
];

/** Step 5: Mood tiles — energy, brightness, and color_warmth feed into axes */
export const MOOD_TILES: {
  key: string;
  label: string;
  icon: string;
  energy: number;
  brightness: number;
  warmth: number;
}[] = [
  { key: 'cozy', label: 'Cozy', icon: 'cafe', energy: 0.2, brightness: 0.6, warmth: 0.8 },
  { key: 'epic', label: 'Epic', icon: 'flash', energy: 0.9, brightness: 0.6, warmth: 0.5 },
  { key: 'dreamy', label: 'Dreamy', icon: 'cloud', energy: 0.2, brightness: 0.8, warmth: 0.6 },
  { key: 'moody', label: 'Moody', icon: 'rainy', energy: 0.3, brightness: 0.2, warmth: 0.3 },
  { key: 'playful', label: 'Playful', icon: 'balloon', energy: 0.6, brightness: 0.8, warmth: 0.7 },
  { key: 'serene', label: 'Serene', icon: 'water', energy: 0.1, brightness: 0.7, warmth: 0.4 },
  {
    key: 'intense',
    label: 'Intense',
    icon: 'thunderstorm',
    energy: 0.9,
    brightness: 0.3,
    warmth: 0.3,
  },
  { key: 'nostalgic', label: 'Nostalgic', icon: 'time', energy: 0.3, brightness: 0.5, warmth: 0.7 },
  {
    key: 'mysterious',
    label: 'Mysterious',
    icon: 'eye',
    energy: 0.5,
    brightness: 0.2,
    warmth: 0.2,
  },
  {
    key: 'whimsical',
    label: 'Whimsical',
    icon: 'sparkles',
    energy: 0.5,
    brightness: 0.7,
    warmth: 0.6,
  },
  { key: 'dramatic', label: 'Dramatic', icon: 'flame', energy: 0.8, brightness: 0.3, warmth: 0.4 },
  { key: 'peaceful', label: 'Peaceful', icon: 'leaf', energy: 0.1, brightness: 0.6, warmth: 0.5 },
];

/** Step 6: Scene atmosphere tiles */
export const SCENE_ATMOSPHERE_TILES: { key: SceneAtmosphere; label: string; icon: string }[] = [
  { key: 'sunny_morning', label: 'Sunny Morning', icon: 'sunny' },
  { key: 'rainy_afternoon', label: 'Rainy Afternoon', icon: 'rainy' },
  { key: 'snowy_night', label: 'Snowy Night', icon: 'snow' },
  { key: 'foggy_dawn', label: 'Foggy Dawn', icon: 'cloudy' },
  { key: 'stormy_twilight', label: 'Stormy Twilight', icon: 'thunderstorm' },
  { key: 'starry_midnight', label: 'Starry Midnight', icon: 'moon' },
  { key: 'golden_hour', label: 'Golden Hour', icon: 'sunny' },
  { key: 'aurora_night', label: 'Aurora Night', icon: 'sparkles' },
];

/** Step 7: Color palette options */
export const COLOR_PALETTES: { key: ColorPalette; label: string; colors: string[] }[] = [
  { key: 'warm_sunset', label: 'Warm Sunset', colors: ['#FFD700', '#FF8C00', '#FF4500'] },
  { key: 'cool_twilight', label: 'Cool Twilight', colors: ['#6699EE', '#8855CC', '#BB88EE'] },
  { key: 'earthy_natural', label: 'Earthy Natural', colors: ['#4CAA64', '#8B7355', '#556B2F'] },
  { key: 'soft_pastel', label: 'Soft Pastel', colors: ['#FFB6C1', '#DDA0DD', '#F0F8FF'] },
  { key: 'dark_bold', label: 'Dark & Bold', colors: ['#1A1A2E', '#E63946', '#FFD700'] },
  { key: 'monochrome', label: 'Black & White', colors: ['#FFFFFF', '#888888', '#000000'] },
  { key: 'sepia', label: 'Sepia Vintage', colors: ['#D4A76A', '#C19A6B', '#8B6914'] },
  { key: 'neon', label: 'Neon Electric', colors: ['#FF00FF', '#00FFFF', '#39FF14'] },
  { key: 'candy', label: 'Candy Pop', colors: ['#FF69B4', '#FF6EC7', '#FFD700'] },
  {
    key: 'everything',
    label: 'Surprise Me',
    colors: ['#FF4500', '#FFD700', '#4CAA64', '#6699EE', '#BB88EE'],
  },
];

/** Step 8: Personality tags */
export const PERSONALITY_TAGS: { key: PersonalityTag; label: string }[] = [
  { key: 'dreamy', label: 'Dreamy' },
  { key: 'adventurous', label: 'Adventurous' },
  { key: 'cozy', label: 'Cozy' },
  { key: 'edgy', label: 'Edgy' },
  { key: 'romantic', label: 'Romantic' },
  { key: 'mysterious', label: 'Mysterious' },
  { key: 'playful', label: 'Playful' },
  { key: 'fierce', label: 'Fierce' },
  { key: 'peaceful', label: 'Peaceful' },
  { key: 'chaotic', label: 'Chaotic' },
  { key: 'nostalgic', label: 'Nostalgic' },
  { key: 'futuristic', label: 'Futuristic' },
  { key: 'elegant', label: 'Elegant' },
  { key: 'raw', label: 'Raw' },
  { key: 'whimsical', label: 'Whimsical' },
  { key: 'bold', label: 'Bold' },
  { key: 'gentle', label: 'Gentle' },
  { key: 'wild', label: 'Wild' },
];

/** Minimum selections per step — no maximums, pick as many as you want */
export const LIMITS = {
  interests: { min: 3 },
  colorPalettes: { min: 1 },
  personalityTags: { min: 1 },
  moods: { min: 1 },
  sceneAtmospheres: { min: 1 },
} as const;

/** Total steps in the onboarding flow */
export const TOTAL_STEPS = 12;
