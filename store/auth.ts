import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useFeedStore } from '@/store/feed';

interface AuthState {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initialized: false,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
    // Clear all cached data from previous session
    useFeedStore.getState().clearLocalStreaks();
    useFeedStore.getState().bumpReset();
    // Clear TanStack Query cache (imported lazily to avoid circular deps)
    const { queryClient } = require('@/app/_layout');
    queryClient.clear();
  },

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, initialized: true });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, initialized: true });
    });

    return () => subscription.unsubscribe();
  },
}));
