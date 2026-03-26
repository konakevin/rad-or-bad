import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export interface FeedItem {
  id: string;
  user_id: string;
  category: string;
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
}

async function fetchFeed(userId: string): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_feed', {
    p_user_id: userId,
    p_limit: 50,
  });

  if (error) throw error;

  return (data ?? []) as FeedItem[];
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
