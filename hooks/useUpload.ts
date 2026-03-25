import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useFeedStore, type PendingPost } from '@/store/feed';
import type { Category } from '@/types/database';

interface UploadArgs {
  uri: string;
  category: Category;
  caption: string;
}

async function uploadImage(uri: string, userId: string): Promise<string> {
  const fileName = `${userId}/${Date.now()}.jpg`;

  // blob() is broken for local file URIs in React Native — use arrayBuffer instead
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from('uploads')
    .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
  return data.publicUrl;
}

export function useUpload() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const bumpReset = useFeedStore((s) => s.bumpReset);
  const setPendingPost = useFeedStore((s) => s.setPendingPost);

  return useMutation({
    mutationFn: async ({ uri, category, caption }: UploadArgs): Promise<PendingPost> => {
      const imageUrl = await uploadImage(uri, user!.id);

      const { data: inserted, error } = await supabase
        .from('uploads')
        .insert({
          user_id: user!.id,
          category,
          image_url: imageUrl,
          caption: caption.trim() || null,
          is_approved: true,
        })
        .select('id, user_id, category, image_url, caption, created_at, total_votes, rad_votes, bad_votes')
        .single();

      if (error) throw error;

      // Auto-vote Rad on own post — everyone implicitly upvotes their own content
      await supabase.from('votes').insert({
        voter_id: user!.id,
        upload_id: inserted.id,
        vote: 'rad',
      });

      const { data: userData } = await supabase
        .from('users')
        .select('username')
        .eq('id', user!.id)
        .single();

      // Return raw vote counts (0) — SwipeCard adds the optimistic +1
      // from sessionVotes, so the badge will correctly show 1 vote at 100%
      return { ...inserted, username: userData?.username ?? '' } as PendingPost;
    },
    onSuccess: (newPost) => {
      setPendingPost(newPost);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts', user?.id] });
      bumpReset();
    },
  });
}
