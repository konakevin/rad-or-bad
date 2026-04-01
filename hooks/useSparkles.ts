import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export function useSparkleBalance() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['sparkleBalance', user?.id],
    queryFn: async (): Promise<number> => {
      const { data } = await supabase
        .from('users')
        .select('sparkle_balance')
        .eq('id', user!.id)
        .single();
      return data?.sparkle_balance ?? 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useSpendSparkles() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount, reason, referenceId }: { amount: number; reason: string; referenceId?: string }) => {
      const { data, error } = await supabase.rpc('spend_sparkles', {
        p_user_id: user!.id,
        p_amount: amount,
        p_reason: reason,
        p_reference_id: referenceId ?? null,
      });
      if (error) throw error;
      if (!data) throw new Error('Not enough sparkles');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sparkleBalance'] });
    },
  });
}
