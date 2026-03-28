import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export interface FriendVote {
  username: string;
  avatar_url: string | null;
  user_rank: string | null;
  vote: 'rad' | 'bad';
  streak?: number;
}

export interface FeedItem {
  id: string;
  user_id: string;
  categories: string[];
  image_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  created_at: string;
  total_votes: number;
  rad_votes: number;
  bad_votes: number;
  username: string;
  user_rank: string | null;
  avatar_url: string | null;
  friend_votes?: FriendVote[];
}

async function fetchFeed(userId: string): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_feed', {
    p_user_id: userId,
    p_limit: 50,
  });

  if (error) throw error;

  return (data ?? []) as FeedItem[];
}

async function fetchFriendsFeed(userId: string): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_friends_feed', {
    p_user_id: userId,
    p_limit: 50,
  });

  if (error) {
    console.error('[fetchFriendsFeed] RPC error:', error.message);
    throw error;
  }

  console.log(`[fetchFriendsFeed] returned ${data?.length ?? 0} rows`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    friend_votes: (row.friend_votes as FriendVote[] | null) ?? [],
  })) as FeedItem[];
}

export function useFeed() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['feed', user?.id],
    queryFn: () => fetchFeed(user!.id),
    enabled: !!user,
    staleTime: 120_000,
  });
}

export function useFollowingFeed() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['followingFeed', user?.id],
    queryFn: async (): Promise<FeedItem[]> => {
      const { data, error } = await supabase.rpc('get_following_feed', {
        p_user_id: user!.id,
        p_limit: 50,
      });
      if (error) throw error;
      return (data ?? []) as FeedItem[];
    },
    enabled: !!user,
    staleTime: 120_000,
  });
}

export function useFriendsFeed() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['friendsFeed', user?.id],
    queryFn: () => fetchFriendsFeed(user!.id),
    enabled: !!user,
    staleTime: 120_000,
  });
}
