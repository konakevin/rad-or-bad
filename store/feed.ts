import { create } from 'zustand';

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
  // Optimistic streak counts — overrides server values during active session
  localStreaks: Map<string, number>;
  updateStreak: (friendUsername: string, matched: boolean, serverStreak: number) => void;
  clearLocalStreaks: () => void;
}

// resetToken — wipes deck + refetches (used after a new upload)
// refreshToken — refetches feed without wiping session votes (used on tab press)
export const useFeedStore = create<FeedStore>((set) => ({
  resetToken: 0,
  bumpReset: () => set((s) => ({ resetToken: s.resetToken + 1 })),
  refreshToken: 0,
  bumpRefresh: () => set((s) => ({ refreshToken: s.refreshToken + 1 })),
  pendingPost: null,
  setPendingPost: (post) => set({ pendingPost: post }),
  externalVotes: new Map(),
  addExternalVote: (uploadId, vote) =>
    set((s) => ({ externalVotes: new Map(s.externalVotes).set(uploadId, vote) })),
  localStreaks: new Map(),
  updateStreak: (friendUsername, matched, serverStreak) =>
    set((s) => {
      const current = s.localStreaks.get(friendUsername) ?? serverStreak;
      const next = matched ? current + 1 : 0;
      return { localStreaks: new Map(s.localStreaks).set(friendUsername, next) };
    }),
  clearLocalStreaks: () => set({ localStreaks: new Map() }),
}));
