import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export function useDreamWish() {
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ['dreamWish', user?.id],
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase
        .from('user_recipes')
        .select('dream_wish')
        .eq('user_id', user!.id)
        .single();
      return data?.dream_wish ?? null;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  return {
    wish: query.data ?? null,
    isLoading: query.isLoading,
  };
}

export function useSetDreamWish() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wish: string | null) => {
      const { error } = await supabase
        .from('user_recipes')
        .update({ dream_wish: wish })
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dreamWish'] });
    },
  });
}
