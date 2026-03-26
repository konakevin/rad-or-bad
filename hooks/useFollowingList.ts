import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { FollowUser } from './useFollowersList';

export function useFollowingList(userId: string) {
  return useQuery({
    queryKey: ['followingList', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('users!following_id(id, username)')
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => r.users as FollowUser);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
