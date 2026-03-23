export const RATING_TIERS = [
  { minPercent: 100, label: 'Untouchable' },
  { minPercent: 90,  label: 'Elite' },
  { minPercent: 80,  label: 'Heat' },
  { minPercent: 70,  label: 'Solid' },
  { minPercent: 60,  label: 'Mid' },
  { minPercent: 0,   label: 'Fumble' },
] as const;

export type RatingLabel = (typeof RATING_TIERS)[number]['label'];
