import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PublicProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  postCount: number;
  followerCount: number;
  followingCount: number;
  friendCount: number;
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_profile', {
        p_user_id: userId,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('User not found');

      return {
        id: row.id as string,
        username: row.username as string,
        avatar_url: (row.avatar_url as string | null) ?? null,
        postCount: Number(row.post_count),
        followerCount: Number(row.follower_count),
        followingCount: Number(row.following_count),
        friendCount: Number(row.friend_count ?? 0),
      } as PublicProfile;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
