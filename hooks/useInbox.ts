import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export interface NotificationItem {
  id: string;
  actorId: string;
  actorUsername: string;
  actorAvatarUrl: string | null;
  type: 'post_comment' | 'comment_reply' | 'comment_mention' | 'post_share' | 'friend_request' | 'friend_accepted' | 'post_milestone' | 'dream_generated' | 'post_like' | 'post_twin' | 'post_fuse';
  uploadId: string | null;
  commentId: string | null;
  body: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  isSeen: boolean;
}

const PAGE_SIZE = 20;

function mapRow(row: Record<string, unknown>): NotificationItem {
  return {
    id: row.id as string,
    actorId: row.actor_id as string,
    actorUsername: row.actor_username as string,
    actorAvatarUrl: (row.actor_avatar_url as string | null) ?? null,
    type: row.type as NotificationItem['type'],
    uploadId: (row.upload_id as string | null) ?? null,
    commentId: (row.comment_id as string | null) ?? null,
    body: (row.body as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
    createdAt: row.created_at as string,
    isSeen: row.is_seen as boolean,
  };
}

export function useInbox() {
  const user = useAuthStore((s) => s.user);

  return useInfiniteQuery({
    queryKey: ['inbox', user?.id],
    queryFn: async ({ pageParam = 0 }): Promise<NotificationItem[]> => {
      const { data, error } = await supabase.rpc('get_notifications', {
        p_user_id: user!.id,
        p_limit: PAGE_SIZE,
        p_offset: pageParam,
      });

      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((total, page) => total + page.length, 0);
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
