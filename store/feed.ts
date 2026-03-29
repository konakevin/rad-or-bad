import { create } from 'zustand';

export interface LocalStreak {
  radStreak: number;
  badStreak: number;
  username: string;
  avatarUrl: string | null;
  userRank: string | null;
}

// Mirrors FeedItem shape — defined here to avoid circular imports
export interface PendingPost {
  id: string;
  user_id: string;
  categories: string[];
  image_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  created_at: string;
  total_votes: number;
  rad_votes: number;
  bad_votes: number;
  username: string;
  avatar_url: string | null;
}

interface FeedStore {
  resetToken: number;
  bumpReset: () => void;
  refreshToken: number;
  bumpRefresh: () => void;
  pendingPost: PendingPost | null;
  setPendingPost: (post: PendingPost | null) => void;
  // Votes cast outside the feed screen (e.g. photo detail view)
  externalVotes: Map<string, 'rad' | 'bad'>;
  addExternalVote: (uploadId: string, vote: 'rad' | 'bad') => void;
  // Global video mute — muted by default, one toggle affects all videos
  videoMuted: boolean;
  toggleVideoMute: () => void;
  // Comment count bumps — tracks increments from this session
  commentBumps: Map<string, number>;
  bumpCommentCount: (uploadId: string) => void;
  // Session seed for feed shuffle — changes on pull-to-refresh
  feedSeed: number;
  regenerateSeed: () => void;
  // Optimistic streak data — overrides server values during active session
  localStreaks: Map<string, LocalStreak>;
  updateStreak: (friend: { username: string; avatar_url: string | null; user_rank: string | null; rad_streak?: number; bad_streak?: number }, matched: boolean, voteType: 'rad' | 'bad') => void;
  clearLocalStreaks: () => void;
}

// resetToken — wipes deck + refetches (used after a new upload)
// refreshToken — refetches feed without wiping session votes (used on tab press)
export const useFeedStore = create<FeedStore>((set) => ({
  resetToken: 0,
  bumpReset: () => set((s) => ({ resetToken: s.resetToken + 1 })),
  refreshToken: 0,
  bumpRefresh: () => set((s) => ({ refreshToken: s.refreshToken + 1 })),
  feedSeed: Math.random(),
  regenerateSeed: () => set({ feedSeed: Math.random() }),
  pendingPost: null,
  setPendingPost: (post) => set({ pendingPost: post }),
  videoMuted: true,
  toggleVideoMute: () => set((s) => ({ videoMuted: !s.videoMuted })),
  commentBumps: new Map(),
  bumpCommentCount: (uploadId) =>
    set((s) => ({
      commentBumps: new Map(s.commentBumps).set(uploadId, (s.commentBumps.get(uploadId) ?? 0) + 1),
    })),
  externalVotes: new Map(),
  addExternalVote: (uploadId, vote) =>
    set((s) => ({ externalVotes: new Map(s.externalVotes).set(uploadId, vote) })),
  localStreaks: new Map(),
  updateStreak: (friend, matched, voteType) =>
    set((s) => {
      const existing = s.localStreaks.get(friend.username);
      const curRad = existing?.radStreak ?? (friend.rad_streak ?? 0);
      const curBad = existing?.badStreak ?? (friend.bad_streak ?? 0);

      let newRad = curRad;
      let newBad = curBad;

      if (matched) {
        // Both voted the same — increment that type's streak
        if (voteType === 'rad') newRad = curRad + 1;
        else newBad = curBad + 1;
      } else {
        // Disagreed — reset both streaks
        newRad = 0;
        newBad = 0;
      }

      return {
        localStreaks: new Map(s.localStreaks).set(friend.username, {
          radStreak: newRad,
          badStreak: newBad,
          username: friend.username,
          avatarUrl: friend.avatar_url,
          userRank: friend.user_rank,
        }),
      };
    }),
  clearLocalStreaks: () => set({ localStreaks: new Map() }),
}));
