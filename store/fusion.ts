import { create } from 'zustand';

export type DreamMode = 'normal' | 'twin' | 'fuse' | 'style_ref';

export interface FusionTarget {
  postId: string;
  prompt: string;
  imageUrl: string;
  username: string;
  userId: string;
  recipeId: string | null;
}

interface FusionStore {
  mode: DreamMode;
  target: FusionTarget | null;
  setTarget: (target: FusionTarget | null) => void;
  setTwin: (target: FusionTarget) => void;
  setFuse: (target: FusionTarget) => void;
  setStyleRef: (target: FusionTarget) => void;
  clear: () => void;
}

export const useFusionStore = create<FusionStore>((set) => ({
  mode: 'normal',
  target: null,
  setTarget: (target) => set({ target, mode: target ? 'fuse' : 'normal' }),
  setTwin: (target) => set({ target, mode: 'twin' }),
  setFuse: (target) => set({ target, mode: 'fuse' }),
  setStyleRef: (target: FusionTarget) => set({ target, mode: 'style_ref' }),
  clear: () => set({ target: null, mode: 'normal' }),
}));
