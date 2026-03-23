import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

interface ToggleArgs {
  uploadId: string;
  currentlyFavorited: boolean;
}

export function useToggleFavorite() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const key = ['favoriteIds', user?.id];

  return useMutation({
    mutationFn: async ({ uploadId, currentlyFavorited }: ToggleArgs) => {
      if (currentlyFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user!.id)
          .eq('upload_id', uploadId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user!.id, upload_id: uploadId });
        if (error) throw error;
      }
    },
    // Optimistically update the favoriteIds set before the request completes
    onMutate: async ({ uploadId, currentlyFavorited }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Set<string>>(key);
      qc.setQueryData<Set<string>>(key, (old = new Set()) => {
        const next = new Set(old);
        if (currentlyFavorited) next.delete(uploadId);
        else next.add(uploadId);
        return next;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(key, ctx?.previous);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favoritePosts', user?.id] });
    },
  });
}
