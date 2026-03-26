import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export function useUserVote(uploadId: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['userVote', uploadId],
    enabled: !!user && !!uploadId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('votes')
        .select('vote')
        .eq('upload_id', uploadId)
        .eq('voter_id', user!.id)
        .maybeSingle();
      return (data?.vote as 'rad' | 'bad') ?? null;
    },
  });
}
