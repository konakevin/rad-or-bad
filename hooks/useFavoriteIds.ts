import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export function useFavoriteIds() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['favoriteIds', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('upload_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.upload_id as string));
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
