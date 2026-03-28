import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useFeedStore, type PendingPost } from '@/store/feed';
import type { Category } from '@/types/database';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video as CompressorVideo } from 'react-native-compressor';
import { moderateUpload } from '@/lib/moderation';

interface UploadArgs {
  uri: string;
  categories: Category[];
  caption: string;
  mediaType: 'image' | 'video';
  width: number | null;
  height: number | null;
}

async function uploadFile(uri: string, userId: string, mediaType: 'image' | 'video'): Promise<string> {
  const ext = mediaType === 'video' ? 'mp4' : 'jpg';
  const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
  const fileName = `${userId}/${Date.now()}.${ext}`;

  // blob() is broken for local file URIs in React Native — use arrayBuffer instead
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from('uploads')
    .upload(fileName, arrayBuffer, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
  return data.publicUrl;
}

async function generateAndUploadThumbnail(videoUri: string, userId: string): Promise<string | null> {
  try {
    const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 0 });
    return await uploadFile(thumbUri, userId, 'image');
  } catch {
    return null;
  }
}

export function useUpload() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const bumpReset = useFeedStore((s) => s.bumpReset);
  const setPendingPost = useFeedStore((s) => s.setPendingPost);

  return useMutation({
    mutationFn: async ({ uri, categories, caption, mediaType, width, height }: UploadArgs): Promise<PendingPost> => {
      const uploadUri = mediaType === 'video'
        ? await CompressorVideo.compress(uri, { compressionMethod: 'auto', maxSize: 1280 })
        : uri;

      const mediaUrl = await uploadFile(uploadUri, user!.id, mediaType);

      const thumbnailUrl = mediaType === 'video'
        ? await generateAndUploadThumbnail(uploadUri, user!.id)
        : null;

      // Content moderation — check media + caption before making visible
      const modResult = await moderateUpload(mediaUrl, mediaType, caption.trim() || null);
      if (!modResult.passed) {
        // Clean up uploaded file
        const fileName = mediaUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('uploads').remove([fileName]);
        throw new Error(modResult.reason ?? 'Content rejected by moderation');
      }

      const { data: inserted, error } = await supabase
        .from('uploads')
        .insert({
          user_id: user!.id,
          categories,
          image_url: mediaUrl,
          media_type: mediaType,
          thumbnail_url: thumbnailUrl,
          width,
          height,
          caption: caption.trim() || null,
          is_approved: true,
        })
        .select('id, user_id, categories, image_url, media_type, thumbnail_url, width, height, caption, created_at, total_votes, rad_votes, bad_votes')
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

      return { ...inserted, username: userData?.username ?? '', avatar_url: userData?.avatar_url ?? null } as PendingPost;
    },
    onSuccess: (newPost) => {
      setPendingPost(newPost);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts', user?.id] });
      bumpReset();
    },
  });
}
