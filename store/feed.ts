import { create } from 'zustand';

interface FeedStore {
  resetToken: number;
  bumpReset: () => void;
  refreshToken: number;
  bumpRefresh: () => void;
}

// resetToken — wipes deck + refetches (used after a new upload)
// refreshToken — refetches feed without wiping session votes (used on tab press)
export const useFeedStore = create<FeedStore>((set) => ({
  resetToken: 0,
  bumpReset: () => set((s) => ({ resetToken: s.resetToken + 1 })),
  refreshToken: 0,
  bumpRefresh: () => set((s) => ({ refreshToken: s.refreshToken + 1 })),
}));
