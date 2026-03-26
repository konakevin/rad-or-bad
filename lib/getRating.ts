export type Rating = {
  percent: number;
  gradient: [string, string];
};

// Score gradient — all colors pulled from the app's treadmill palette
// Warm end (coral/amber/gold) = high rad %, cool end (purple/blue/teal) = low
function getGradient(percent: number): [string, string] {
  if (percent >= 90) return ['#DDAA66', '#DD7766'];   // amber → coral
  if (percent >= 80) return ['#CCDD55', '#DDAA66'];   // yellow-green → amber
  if (percent >= 70) return ['#DDBB55', '#CCDD55'];   // gold → yellow-green
  if (percent >= 60) return ['#77CC88', '#DDBB55'];   // green → gold
  if (percent >= 50) return ['#44BBCC', '#77CC88'];   // teal → green
  if (percent >= 40) return ['#6699EE', '#44BBCC'];   // blue → teal
  if (percent >= 30) return ['#BB88EE', '#6699EE'];   // purple → blue
  return                     ['#BB88EE', '#9966CC'];  // deep purple
}

/**
 * Returns the percentage and temperature gradient for a photo.
 * Returns null if there are no votes yet.
 */
export function getRating(radVotes: number, totalVotes: number): Rating | null {
  if (totalVotes === 0) return null;

  const percent = Math.round((radVotes / totalVotes) * 100);
  return { percent, gradient: getGradient(percent) };
}
