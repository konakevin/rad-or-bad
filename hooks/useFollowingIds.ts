import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export function useFollowingIds() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['followingIds', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.following_id as string));
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
