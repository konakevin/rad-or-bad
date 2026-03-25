import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

interface VoteArgs {
  uploadId: string;
  vote: 'rad' | 'bad';
}

export function useVote() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uploadId, vote }: VoteArgs) => {
      const { error } = await supabase.from('votes').insert({
        voter_id: user!.id,
        upload_id: uploadId,
        vote,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed', user?.id] });
    },
  });
}
