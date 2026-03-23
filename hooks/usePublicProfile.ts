import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PostItem } from '@/hooks/useUserPosts';

export interface PublicProfile {
  id: string;
  username: string;
  created_at: string;
  followerCount: number;
  followingCount: number;
  posts: PostItem[];
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: async () => {
      const [profileRes, postsRes, followerRes, followingRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, username, created_at')
          .eq('id', userId)
          .single(),
        supabase
          .from('uploads')
          .select('id, category, image_url, caption, total_votes, gas_votes, created_at')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', userId),
      ]);

      if (profileRes.error) throw profileRes.error;

      return {
        ...profileRes.data,
        posts: (postsRes.data ?? []) as PostItem[],
        followerCount: followerRes.count ?? 0,
        followingCount: followingRes.count ?? 0,
      } as PublicProfile;
    },
    enabled: !!userId,
  });
}
