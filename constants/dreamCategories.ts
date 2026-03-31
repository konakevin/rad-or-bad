/**
 * Dream categories — high-level groups that encompass all possible
 * outputs from the recipe engine. Each category maps to keywords
 * that match against the ai_prompt field on posts.
 */

export interface DreamCategory {
  key: string;
  label: string;
  icon: string;
  color: string;
  /** Keywords to match against ai_prompt or caption text */
  keywords: string[];
}

export const DREAM_CATEGORIES: DreamCategory[] = [
  {
    key: 'fantasy',
    label: 'Fantasy',
    icon: 'sparkles',
    color: '#BB88EE',
    keywords: [
      'fantasy', 'dragon', 'magic', 'castle', 'knight', 'medieval', 'fairy',
      'enchanted', 'wizard', 'mythical', 'elven', 'sorcerer', 'potion',
      'throne', 'kingdom', 'spell', 'rune', 'goblin', 'unicorn', 'phoenix',
    ],
  },
  {
    key: 'cosmic',
    label: 'Cosmic',
    icon: 'planet',
    color: '#6699EE',
    keywords: [
      'space', 'cosmic', 'nebula', 'aurora', 'starlight', 'galaxy', 'planet',
      'astronaut', 'stellar', 'celestial', 'void', 'constellation', 'asteroid',
      'moon', 'stars', 'black hole', 'orbit', 'zero gravity', 'alien',
    ],
  },
  {
    key: 'nature',
    label: 'Nature',
    icon: 'leaf',
    color: '#4CAA64',
    keywords: [
      'forest', 'mountain', 'ocean', 'waterfall', 'garden', 'lake', 'river',
      'flower', 'tree', 'animal', 'fox', 'deer', 'owl', 'whale', 'bird',
      'coral', 'moss', 'fern', 'bioluminescent', 'meadow', 'canyon', 'cave',
      'wolf', 'butterfly', 'jellyfish', 'tortoise', 'elk',
    ],
  },
  {
    key: 'cozy',
    label: 'Cozy',
    icon: 'cafe',
    color: colors.accent,
    keywords: [
      'cozy', 'warm', 'candle', 'fireplace', 'library', 'cottage', 'cabin',
      'blanket', 'tea', 'coffee', 'book', 'window', 'rain', 'lamp', 'indoor',
      'gentle', 'soft', 'comfort', 'home', 'hearth', 'snug', 'pillow',
    ],
  },
  {
    key: 'dark',
    label: 'Dark',
    icon: 'moon',
    color: '#CC6666',
    keywords: [
      'dark', 'gothic', 'storm', 'shadow', 'haunting', 'obsidian', 'bone',
      'skull', 'raven', 'cemetery', 'fog', 'midnight', 'noir', 'sinister',
      'eerie', 'ominous', 'cryptic', 'phantom', 'ghost', 'ruins', 'decay',
    ],
  },
  {
    key: 'whimsical',
    label: 'Whimsical',
    icon: 'balloon',
    color: '#FF8C00',
    keywords: [
      'whimsical', 'playful', 'cute', 'candy', 'miniature', 'tiny', 'toy',
      'cartoon', 'kawaii', 'chibi', 'pastel', 'bubble', 'silly', 'funny',
      'papercraft', 'music box', 'snow globe', 'fairy light', 'mushroom',
    ],
  },
  {
    key: 'retro',
    label: 'Retro',
    icon: 'radio',
    color: '#FF4500',
    keywords: [
      'retro', 'vintage', 'neon', 'vaporwave', '80s', '70s', '50s', 'film grain',
      'nostalgic', 'polaroid', 'arcade', 'synthwave', 'chrome', 'airbrush',
      'disco', 'cassette', 'pixel', 'glitch', 'VHS', 'analog',
    ],
  },
  {
    key: 'surreal',
    label: 'Surreal',
    icon: 'eye',
    color: '#44CCFF',
    keywords: [
      'surreal', 'abstract', 'impossible', 'dali', 'melting', 'distortion',
      'kaleidoscope', 'fractal', 'geometric', 'floating', 'morphing', 'dream',
      'illusion', 'paradox', 'escher', 'psychedelic', 'dissolving', 'prism',
    ],
  },
];
