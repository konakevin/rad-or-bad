import { MILESTONES, shouldBurst } from '@/constants/milestones';

export interface MilestoneHit {
  milestone: number;
  tier: number; // 1-4, controls animation intensity
  message: string;
}

function formatNumber(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
}

/**
 * Check if casting a rad vote would hit a milestone that shows a burst.
 * Pass the CURRENT rad_votes (before the new vote).
 * Returns null if no burst milestone is hit.
 */
export function checkMilestone(currentRadVotes: number): MilestoneHit | null {
  const next = currentRadVotes + 1;
  if (!shouldBurst(next)) return null;
  const tier = next >= 500 ? 4 : next >= 100 ? 3 : next >= 50 ? 2 : 1;
  return { milestone: next, tier, message: `You're rad vote #${formatNumber(next)}!` };
}
