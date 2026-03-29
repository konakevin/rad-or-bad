import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useFeedStore } from '@/store/feed';
import { moderateText } from '@/lib/moderation';

interface AddCommentArgs {
  uploadId: string;
  body: string;
  parentId?: string;
}

export function useAddComment() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uploadId, body, parentId }: AddCommentArgs) => {
      // Content moderation
      const modResult = await moderateText(body);
      if (!modResult.passed) {
        throw new Error(modResult.reason ?? 'Comment contains inappropriate language');
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          upload_id: uploadId,
          user_id: user!.id,
          parent_id: parentId ?? null,
          body,
        })
        .select('id, created_at')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { uploadId, parentId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', uploadId] });
      if (parentId) {
        queryClient.invalidateQueries({ queryKey: ['replies', parentId] });
      }
      // Bump comment count so the card updates instantly
      useFeedStore.getState().bumpCommentCount(uploadId);
      queryClient.invalidateQueries({ queryKey: ['post', uploadId] });
    },
  });
}
