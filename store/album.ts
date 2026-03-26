import { create } from 'zustand';

interface AlbumStore {
  ids: string[];
  setAlbum: (ids: string[]) => void;
  clearAlbum: () => void;
}

export const useAlbumStore = create<AlbumStore>((set) => ({
  ids: [],
  setAlbum: (ids) => set({ ids }),
  clearAlbum: () => set({ ids: [] }),
}));
