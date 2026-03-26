import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface FollowUser {
  id: string;
  username: string;
}

export function useFollowersList(userId: string) {
  return useQuery({
    queryKey: ['followersList', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('users!follower_id(id, username)')
        .eq('following_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => r.users as FollowUser);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
