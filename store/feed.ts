import { create } from 'zustand';

// Mirrors FeedItem shape — defined here to avoid circular imports
export interface PendingPost {
  id: string;
  user_id: string;
  category: string;
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
}

interface FeedStore {
  resetToken: number;
  bumpReset: () => void;
  refreshToken: number;
  bumpRefresh: () => void;
  pendingPost: PendingPost | null;
  setPendingPost: (post: PendingPost | null) => void;
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
}));
