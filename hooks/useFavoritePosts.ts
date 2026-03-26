import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { PostItem } from '@/hooks/useUserPosts';

export function useFavoritePosts() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['favoritePosts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('uploads(id, category, image_url, media_type, thumbnail_url, width, height, caption, total_votes, rad_votes, created_at)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((r) => r.uploads as PostItem | null)
        .filter((u): u is PostItem => u !== null);
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
