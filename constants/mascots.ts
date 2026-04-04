/** DreamBot mascot images hosted on Supabase storage */
const BASE = 'https://jimftynwrinwenonjrlj.supabase.co/storage/v1/object/public/uploads/assets';

export const MASCOT_URLS = [
  `${BASE}/dreambot-mascot-v2.jpg`, // reaching for star
  `${BASE}/dreambot-artist.jpg`, // painting on easel
  `${BASE}/dreambot-dreaming.jpg`, // sleeping on cloud
];

/** Get a random mascot URL */
export function randomMascot(): string {
  return MASCOT_URLS[Math.floor(Math.random() * MASCOT_URLS.length)];
}
