import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { FriendVote } from '@/hooks/useFeed';

/**
 * Checks if mutual follows voted on a specific post.
 * Only enabled when uploadId is provided (after voting).
 */
export function useFriendVotesOnPost(uploadId: string | null) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['friendVotesOnPost', uploadId],
    queryFn: async (): Promise<FriendVote[]> => {
      const { data, error } = await supabase.rpc('get_friend_votes_on_post', {
        p_user_id: user!.id,
        p_upload_id: uploadId!,
      });
      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => ({
        username: row.friend_username as string,
        avatar_url: (row.friend_avatar as string | null) ?? null,
        user_rank: (row.friend_rank as string | null) ?? null,
        vote: row.vote as 'rad' | 'bad',
        streak: (row.streak as number) ?? 0,
      }));
    },
    enabled: !!user && !!uploadId,
    staleTime: 60_000,
  });
}
