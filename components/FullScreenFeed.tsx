/**
 * FullScreenFeed — shared vertical paging feed component.
 * Used by Home, Explore, and profile album views.
 *
 * Handles: vertical paging, image prefetching, scroll tracking,
 * end-reached loading. Cards are rendered via DreamCard.
 */

import { useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { DreamCard } from '@/components/DreamCard';
import type { DreamPostItem } from '@/components/DreamCard';
import { useFavoriteIds } from '@/hooks/useFavoriteIds';
import { useToggleFavorite } from '@/hooks/useToggleFavorite';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/Toast';
import { useFusionStore } from '@/store/fusion';
import { colors } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  posts: DreamPostItem[];
  isLoading?: boolean;
  onEndReached?: () => void;
  /** Index to scroll to on mount (for album deep links) */
  initialIndex?: number;
  /** Called when the visible card changes */
  onIndexChange?: (index: number) => void;
  /** Ref to control the FlatList externally */
  listRef?: React.RefObject<FlatList>;
  /** Content rendered above the feed (absolute positioned overlays go in parent) */
  ListEmptyComponent?: React.ReactElement;
  /** Disable swipe-left-to-profile on cards (for album/detail views) */
  disableSwipeToProfile?: boolean;
}

export function FullScreenFeed({
  posts, isLoading, onEndReached, initialIndex = 0,
  onIndexChange, listRef, ListEmptyComponent, disableSwipeToProfile,
}: Props) {
  const insets = useSafeAreaInsets();
  const internalRef = useRef<FlatList>(null);
  const ref = listRef ?? internalRef;

  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { data: favoriteIds = new Set<string>() } = useFavoriteIds();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const setFusionTarget = useFusionStore((s) => s.setTarget);

  const handleDelete = useCallback(async (uploadId: string) => {
    const { error } = await supabase.from('uploads').delete().eq('id', uploadId);
    if (error) {
      Toast.show('Failed to delete', 'close-circle');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show('Dream deleted', 'checkmark-circle');
    queryClient.invalidateQueries({ queryKey: ['dreamFeed'] });
    queryClient.invalidateQueries({ queryKey: ['userUploads'] });
    queryClient.invalidateQueries({ queryKey: ['userPosts'] });
    queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
    if (router.canGoBack()) router.back();
  }, [queryClient]);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      const idx = viewableItems[0].index;
      onIndexChange?.(idx);
      // Prefetch next 3 images
      const upcoming = posts.slice(idx + 1, idx + 4);
      if (upcoming.length > 0) {
        ExpoImage.prefetch(upcoming.map((p) => p.image_url));
      }
    }
  }, [posts, onIndexChange]);

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (posts.length === 0 && ListEmptyComponent) {
    return ListEmptyComponent;
  }

  return (
    <>
    <FlatList
      ref={ref}
      data={posts}
      keyExtractor={(item) => item.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      decelerationRate="fast"
      windowSize={7}
      maxToRenderPerBatch={5}
      initialNumToRender={3}
      removeClippedSubviews={false}
      initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
      getItemLayout={(_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index })}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onEndReached={onEndReached}
      onEndReachedThreshold={2}
      renderItem={({ item }) => (
        <DreamCard
          item={item}
          bottomPadding={90 + insets.bottom}
          isLiked={favoriteIds.has(item.id)}
          onLike={() => toggleFavorite({ uploadId: item.id, currentlyFavorited: false })}
          onToggleLike={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleFavorite({ uploadId: item.id, currentlyFavorited: favoriteIds.has(item.id) });
          }}
          onComment={() => router.push(`/comments?uploadId=${item.id}`)}
          disableSwipeToProfile={disableSwipeToProfile}
          onDelete={item.user_id === user?.id ? () => handleDelete(item.id) : undefined}
          onFuse={item.user_id !== user?.id && item.is_ai_generated ? () => {
            setFusionTarget({
              postId: item.id,
              prompt: item.ai_prompt ?? item.caption ?? '',
              imageUrl: item.image_url,
              username: item.username,
            });
            router.navigate('/(tabs)/upload');
          } : undefined}
        />
      )}
    />
    </>
  );
}

const s = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
