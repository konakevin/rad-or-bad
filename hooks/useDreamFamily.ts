import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface FamilyMember {
  id: string;
  user_id: string;
  image_url: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  ai_prompt: string | null;
}

interface DreamFamily {
  twins: FamilyMember[];
  fuses: FamilyMember[];
}

export function useDreamFamily(uploadId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['dreamFamily', uploadId],
    queryFn: async (): Promise<DreamFamily> => {
      // Fetch twins
      const { data: twinData } = await supabase
        .from('uploads')
        .select('id, user_id, image_url, created_at, ai_prompt, users!inner(username, avatar_url)')
        .eq('twin_of', uploadId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Fetch fuses
      const { data: fuseData } = await supabase
        .from('uploads')
        .select('id, user_id, image_url, created_at, ai_prompt, users!inner(username, avatar_url)')
        .eq('fuse_of', uploadId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      function mapRow(row: Record<string, unknown>): FamilyMember {
        const u = row.users as Record<string, unknown>;
        return {
          id: row.id as string,
          user_id: row.user_id as string,
          image_url: row.image_url as string,
          username: (u.username as string) || 'dreamer',
          avatar_url: (u.avatar_url as string | null) ?? null,
          created_at: row.created_at as string,
          ai_prompt: (row.ai_prompt as string | null) ?? null,
        };
      }

      return {
        twins: (twinData ?? []).map(mapRow),
        fuses: (fuseData ?? []).map(mapRow),
      };
    },
    enabled: enabled && !!uploadId,
    staleTime: 30_000,
  });
}
