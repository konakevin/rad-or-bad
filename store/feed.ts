import { create } from 'zustand';

interface FeedStore {
  // Feed refresh tokens
  resetToken: number;
  bumpReset: () => void;
  refreshToken: number;
  bumpRefresh: () => void;
  // Session seed for feed shuffle
  feedSeed: number;
  regenerateSeed: () => void;
  // Global video mute
  videoMuted: boolean;
  toggleVideoMute: () => void;
  // Comment count bumps — tracks increments from this session
  commentBumps: Map<string, number>;
  bumpCommentCount: (uploadId: string) => void;
  // Profile tab reset
  profileResetToken: number;
  bumpProfileReset: () => void;
}

export const useFeedStore = create<FeedStore>((set) => ({
  resetToken: 0,
  bumpReset: () => set((s) => ({ resetToken: s.resetToken + 1 })),
  refreshToken: 0,
  bumpRefresh: () => set((s) => ({ refreshToken: s.refreshToken + 1 })),
  feedSeed: Math.random(),
  regenerateSeed: () => set({ feedSeed: Math.random() }),
  videoMuted: true,
  toggleVideoMute: () => set((s) => ({ videoMuted: !s.videoMuted })),
  commentBumps: new Map(),
  bumpCommentCount: (uploadId) =>
    set((s) => ({
      commentBumps: new Map(s.commentBumps).set(uploadId, (s.commentBumps.get(uploadId) ?? 0) + 1),
    })),
  profileResetToken: 0,
  bumpProfileReset: () => set((s) => ({ profileResetToken: s.profileResetToken + 1 })),
}));
