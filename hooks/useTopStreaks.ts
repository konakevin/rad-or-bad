import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface VibeSyncStreak {
  friendId: string;
  friendUsername: string;
  friendAvatar: string | null;
  friendRank: string | null;
  currentStreak: number;
  bestStreak: number;
  streakType: 'rad' | 'bad' | null;
}

export function useTopStreaks(userId: string) {
  return useQuery({
    queryKey: ['topStreaks', userId],
    queryFn: async (): Promise<VibeSyncStreak[]> => {
      const { data, error } = await supabase.rpc('get_top_streaks', { p_user_id: userId });
      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => ({
        friendId: row.friend_id as string,
        friendUsername: row.friend_username as string,
        friendAvatar: (row.friend_avatar as string | null) ?? null,
        friendRank: (row.friend_rank as string | null) ?? null,
        currentStreak: row.current_streak as number,
        bestStreak: row.best_streak as number,
        streakType: (row.streak_type as 'rad' | 'bad' | null) ?? null,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 min — streaks update at most every 30 min
  });
}
