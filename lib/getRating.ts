import { RATING_TIERS, type RatingLabel } from '@/constants/ratings';

export type Rating = {
  label: RatingLabel;
  percent: number;
  gradient: [string, string];
};

// Temperature gradient: each tier spans a wide sweep of the heat spectrum
// so the gradient is clearly visible and matches its position on the gauge.
function getGradient(percent: number): [string, string] {
  if (percent >= 90) return ['#FF6600', '#FF0000'];   // orange (light) → red (deep)
  if (percent >= 80) return ['#FFAA00', '#FF4400'];   // amber (light) → orange-red (deep)
  if (percent >= 70) return ['#FFE500', '#FF9900'];   // yellow (light) → amber (deep)
  if (percent >= 60) return ['#DDEE00', '#88CC00'];   // yellow-green (light) → lime (deep)
  if (percent >= 50) return ['#88DD44', '#00AA66'];   // lime (light) → green (deep)
  if (percent >= 40) return ['#00CCDD', '#007799'];   // cyan (light) → teal (deep)
  if (percent >= 30) return ['#44AAFF', '#0033BB'];   // sky blue (light) → deep blue
  return                     ['#BB66FF', '#5500CC'];  // lavender (light) → deep purple
}

/**
 * Returns the rating label, percentage, and temperature gradient for a photo.
 * Returns null if there are no votes yet.
 */
export function getRating(radVotes: number, totalVotes: number): Rating | null {
  if (totalVotes === 0) return null;

  const percent = Math.round((radVotes / totalVotes) * 100);
  const tier = RATING_TIERS.find((t) => percent >= t.minPercent)!;

  return { label: tier.label, percent, gradient: getGradient(percent) };
}
