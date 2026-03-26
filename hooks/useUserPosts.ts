import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export interface PostItem {
  id: string;
  category: string;
  image_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  total_votes: number;
  rad_votes: number;
  created_at: string;
}

export function useUserPosts() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['userPosts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uploads')
        .select('id, category, image_url, media_type, thumbnail_url, width, height, caption, total_votes, rad_votes, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PostItem[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
