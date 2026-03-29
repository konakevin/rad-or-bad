import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { FriendUser } from '@/hooks/useFriendsList';

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase.rpc('remove_friend', { p_friend_id: friendId });
      if (error) throw error;
    },
    onMutate: async (friendId) => {
      // Optimistically remove from the cached friends list
      await queryClient.cancelQueries({ queryKey: ['friendsList', user?.id] });

      const previousList = queryClient.getQueryData<FriendUser[]>(['friendsList', user?.id]);

      queryClient.setQueryData<FriendUser[]>(
        ['friendsList', user?.id],
        (old) => old?.filter((f) => f.id !== friendId) ?? [],
      );

      return { previousList };
    },
    onError: (_err, _friendId, context) => {
      // Roll back on failure
      if (context?.previousList) {
        queryClient.setQueryData(['friendsList', user?.id], context.previousList);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friendIds'] });
      queryClient.invalidateQueries({ queryKey: ['friendsList'] });
      queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
      queryClient.invalidateQueries({ queryKey: ['friendshipStatus'] });
    },
  });
}
