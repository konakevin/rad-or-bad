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

export function useDreamFamily(uploadId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['dreamFamily', uploadId],
    queryFn: async (): Promise<FamilyMember[]> => {
      // Fetch all fusions (both twin_of and fuse_of point here)
      const { data: fuseData } = await supabase
        .from('uploads')
        .select('id, user_id, image_url, created_at, ai_prompt, users!inner(username, avatar_url)')
        .eq('fuse_of', uploadId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const { data: twinData } = await supabase
        .from('uploads')
        .select('id, user_id, image_url, created_at, ai_prompt, users!inner(username, avatar_url)')
        .eq('twin_of', uploadId)
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

      // Combine both into one list, deduplicate by id
      const all = [...(fuseData ?? []).map(mapRow), ...(twinData ?? []).map(mapRow)];
      const seen = new Set<string>();
      return all.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    },
    enabled: enabled && !!uploadId,
    staleTime: 30_000,
  });
}
