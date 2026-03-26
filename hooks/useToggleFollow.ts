import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

interface ToggleArgs {
  userId: string;
  currentlyFollowing: boolean;
}

export function useToggleFollow() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const key = ['followingIds', user?.id];

  return useMutation({
    mutationFn: async ({ userId, currentlyFollowing }: ToggleArgs) => {
      if (currentlyFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user!.id)
          .eq('following_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user!.id, following_id: userId });
        if (error) throw error;
      }
    },
    onMutate: async ({ userId, currentlyFollowing }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Set<string>>(key);
      qc.setQueryData<Set<string>>(key, (old = new Set()) => {
        const next = new Set(old);
        if (currentlyFollowing) next.delete(userId);
        else next.add(userId);
        return next;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(key, ctx?.previous);
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: ['publicProfile', userId] });
      // Refresh follower/following list tabs
      qc.invalidateQueries({ queryKey: ['followersList', userId] });
      qc.invalidateQueries({ queryKey: ['followingList', user?.id] });
    },
  });
}
