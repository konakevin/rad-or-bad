import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useFeedStore } from '@/store/feed';
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

  return useMutation({
    mutationFn: async ({ uri, category, caption }: UploadArgs) => {
      const imageUrl = await uploadImage(uri, user!.id);

      const { error } = await supabase.from('uploads').insert({
        user_id: user!.id,
        category,
        image_url: imageUrl,
        caption: caption.trim() || null,
        is_approved: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts', user?.id] });
      bumpReset();
    },
  });
}
