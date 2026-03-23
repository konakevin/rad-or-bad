import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export interface PostItem {
  id: string;
  category: string;
  image_url: string;
  caption: string | null;
  total_votes: number;
  gas_votes: number;
  created_at: string;
}

export function useUserPosts() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['userPosts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uploads')
        .select('id, category, image_url, caption, total_votes, gas_votes, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PostItem[];
    },
    enabled: !!user,
  });
}
