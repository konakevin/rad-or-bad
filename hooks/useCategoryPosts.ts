import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types/database';

export interface ExplorePost {
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
  wilson_score: number | null;
  users: { username: string } | null;
}

export interface CategoryPostsResult {
  posts: ExplorePost[];
  windowLabel: string;
}

const WINDOWS = [
  { label: 'Last 72h',   hours: 72 },
  { label: 'Last week',  hours: 168 },
  { label: 'Last month', hours: 720 },
  { label: 'All time',   hours: null },
] as const;

export function useCategoryPosts(category: Category, limit = 10) {
  return useQuery({
    queryKey: ['top', category, limit],
    queryFn: async (): Promise<CategoryPostsResult> => {
      for (let i = 0; i < WINDOWS.length; i++) {
        const { label, hours } = WINDOWS[i];
        const isLast = i === WINDOWS.length - 1;

        let query = supabase
          .from('uploads')
          .select('id, category, image_url, media_type, thumbnail_url, width, height, caption, total_votes, rad_votes, wilson_score, users(username)')
          .eq('is_active', true)
          .eq('category', category)
          .order('wilson_score', { ascending: false, nullsFirst: false })
          .limit(limit);

        if (hours !== null) {
          const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
          query = query.gte('created_at', since);
        }

        const { data, error } = await query;
        if (error) throw error;

        const posts = (data ?? []) as ExplorePost[];
        if (posts.length >= limit || isLast) {
          return { posts, windowLabel: label };
        }
      }

      return { posts: [], windowLabel: 'All time' };
    },
    staleTime: 300_000, // leaderboards: 5 min
  });
}
