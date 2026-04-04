import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useFeedStore } from '@/store/feed';
import type { Category } from '@/types/database';
import { moderateText, moderateImage } from '@/lib/moderation';

interface UploadArgs {
  uri: string;
  categories: Category[];
  caption: string;
  width: number | null;
  height: number | null;
  onPhase?: (phase: string) => void;
}

async function uploadFile(uri: string, userId: string): Promise<string> {
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
  const setPinnedPost = useFeedStore((s) => s.setPinnedPost);

  return useMutation({
    mutationFn: async ({ uri, categories, caption, width, height, onPhase }: UploadArgs) => {
      // ── 1. Check caption text (instant, no upload needed) ───────────────
      if (caption.trim()) {
        onPhase?.('Processing...');
        const textResult = await moderateText(caption.trim());
        if (!textResult.passed) {
          throw new Error(textResult.reason ?? 'Caption contains inappropriate language');
        }
      }

      // ── 2. Check image BEFORE uploading the full file ───────────────────
      onPhase?.('Processing...');
      const tempUrl = await uploadFile(uri, user!.id);
      const imageCheck = await moderateImage(tempUrl);
      const tempName = tempUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('uploads').remove([tempName]);
      if (!imageCheck.passed) {
        throw new Error(imageCheck.reason ?? 'Content rejected by moderation');
      }

      // ── 3. Upload the real file (only reached if moderation passed) ─────
      onPhase?.('Uploading...');
      const imageUrl = await uploadFile(uri, user!.id);

      const { data: inserted, error } = await supabase
        .from('uploads')
        .insert({
          user_id: user!.id,
          categories,
          image_url: imageUrl,
          media_type: 'image',
          width,
          height,
          caption: caption.trim() || null,
        })
        .select(
          'id, user_id, categories, image_url, media_type, width, height, caption, created_at, total_votes, rad_votes, bad_votes'
        )
        .single();

      if (error) throw error;

      // Auto-vote Rad on own post
      await supabase.from('votes').insert({
        voter_id: user!.id,
        upload_id: inserted.id,
        vote: 'rad',
      });

      const { data: userData } = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('id', user!.id)
        .single();

      return {
        ...inserted,
        username: userData?.username ?? '',
        avatar_url: userData?.avatar_url ?? null,
      };
    },
    onSuccess: () => {
      setPinnedPost(null);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts', user?.id] });
      bumpReset();
    },
  });
}
