/**
 * Milestone thresholds and their actions.
 * - 'push': send a push notification to the post owner
 * - 'burst': show the milestone burst animation on the card
 *
 * Add new actions here as needed (e.g. 'badge', 'confetti', 'rank_boost').
 */
export type MilestoneAction = 'push' | 'burst';

export interface MilestoneConfig {
  threshold: number;
  actions: MilestoneAction[];
  label: string;
}

export const MILESTONES: MilestoneConfig[] = [
  { threshold: 5,    actions: ['push'],           label: '5 Rad votes' },
  { threshold: 10,   actions: ['push', 'burst'],  label: '10 Rad votes' },
  { threshold: 25,   actions: ['push', 'burst'],  label: '25 Rad votes' },
  { threshold: 50,   actions: ['push', 'burst'],  label: '50 Rad votes' },
  { threshold: 100,  actions: ['push', 'burst'],  label: '100 Rad votes' },
  { threshold: 250,  actions: ['push', 'burst'],  label: '250 Rad votes' },
  { threshold: 500,  actions: ['push', 'burst'],  label: '500 Rad votes' },
  { threshold: 1000, actions: ['push', 'burst'],  label: '1K Rad votes' },
];

/** Get the milestone config for a given rad vote count, or null */
export function getMilestone(radVotes: number): MilestoneConfig | null {
  return MILESTONES.find((m) => m.threshold === radVotes) ?? null;
}

/** Check if a threshold should show the burst animation */
export function shouldBurst(radVotes: number): boolean {
  const m = getMilestone(radVotes);
  return m?.actions.includes('burst') ?? false;
}
