const MILESTONES = [10, 25, 50, 100, 250, 500, 1000] as const;

export interface MilestoneHit {
  milestone: number;
  tier: number; // 1-4, controls animation intensity
  message: string;
}

function formatNumber(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
}

function buildMessage(milestone: number): string {
  return `You're rad vote #${formatNumber(milestone)}!`;
}

/**
 * Check if casting a rad vote would hit a milestone.
 * Pass the CURRENT rad_votes (before the new vote).
 * Returns null if no milestone is hit.
 */
export function checkMilestone(currentRadVotes: number): MilestoneHit | null {
  const next = currentRadVotes + 1;
  if (!(MILESTONES as readonly number[]).includes(next)) return null;
  const tier = next >= 500 ? 4 : next >= 100 ? 3 : next >= 50 ? 2 : 1;
  return { milestone: next, tier, message: buildMessage(next) };
}
