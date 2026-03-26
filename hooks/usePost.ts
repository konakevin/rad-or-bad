import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PostDetail {
  id: string;
  image_url: string;
  caption: string | null;
  category: string;
  total_votes: number;
  rad_votes: number;
  created_at: string;
  user_id: string;
  users: { username: string } | null;
}

export function usePost(id: string) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: async (): Promise<PostDetail> => {
      const { data, error } = await supabase
        .from('uploads')
        .select('id, image_url, caption, category, total_votes, rad_votes, created_at, user_id, users(username)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as PostDetail;
    },
    enabled: !!id,
  });
}
