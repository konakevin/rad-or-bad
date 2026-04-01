import { create } from 'zustand';

interface FusionTarget {
  postId: string;
  prompt: string;
  imageUrl: string;
  username: string;
}

interface FusionStore {
  target: FusionTarget | null;
  setTarget: (target: FusionTarget | null) => void;
  clear: () => void;
}

export const useFusionStore = create<FusionStore>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
  clear: () => set({ target: null }),
}));
