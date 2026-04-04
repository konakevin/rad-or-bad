/**
 * FullScreenFeed — shared vertical paging feed component.
 * Used by Home, Explore, and profile album views.
 *
 * Handles: vertical paging, image prefetching, scroll tracking,
 * end-reached loading. Cards are rendered via DreamCard.
 */

import { useCallback, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { DreamCard } from '@/components/DreamCard';
import type { DreamPostItem } from '@/components/DreamCard';
import { CommentOverlay } from '@/components/CommentOverlay';
import { useFavoriteIds } from '@/hooks/useFavoriteIds';
import { useToggleFavorite } from '@/hooks/useToggleFavorite';
import { useLikeIds } from '@/hooks/useLikeIds';
import { useToggleLike } from '@/hooks/useToggleLike';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/Toast';
import { useFusionStore } from '@/store/fusion';
import { DreamFamilySheet } from '@/components/DreamFamilySheet';
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
  /** Hide tab bar padding (for detail views without a tab bar) */
  hideTabBar?: boolean;
}

export function FullScreenFeed({
  posts,
  isLoading,
  onEndReached,
  initialIndex = 0,
  onIndexChange,
  listRef,
  ListEmptyComponent,
  disableSwipeToProfile,
  hideTabBar,
}: Props) {
  const insets = useSafeAreaInsets();
  const internalRef = useRef<FlatList>(null);
  const ref = listRef ?? internalRef;

  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { data: favoriteIds = new Set<string>() } = useFavoriteIds();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { data: likeIds = new Set<string>() } = useLikeIds();
  const { mutate: toggleLike } = useToggleLike();
  const setStyleRef = useFusionStore((s) => s.setStyleRef);
  const [familyPostId, setFamilyPostId] = useState<string | null>(null);
  const [familyPost, setFamilyPost] = useState<DreamPostItem | null>(null);
  const [commentPost, setCommentPost] = useState<DreamPostItem | null>(null);

  const handleDelete = useCallback(
    async (uploadId: string) => {
      // Fetch image URL so we can clean up storage
      const { data: row } = await supabase
        .from('uploads')
        .select('image_url')
        .eq('id', uploadId)
        .single();

      const { error } = await supabase.from('uploads').delete().eq('id', uploadId);
      if (error) {
        Toast.show('Failed to delete', 'close-circle');
        return;
      }

      // Clean up the image from Supabase Storage
      if (row?.image_url) {
        const match = row.image_url.match(/\/uploads\/(.+)$/);
        if (match?.[1]) {
          supabase.storage.from('uploads').remove([decodeURIComponent(match[1])]);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show('Dream deleted', 'checkmark-circle');

      // Optimistically remove from all feed caches so the card disappears immediately
      const feedKeys = ['feed', 'dreamFeed', 'userPosts', 'publicProfile', 'top'];
      for (const key of feedKeys) {
        queryClient.setQueriesData({ queryKey: [key] }, (old: unknown) => {
          if (Array.isArray(old)) return old.filter((p: { id: string }) => p.id !== uploadId);
          return old;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['dreamFeed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
      if (router.canGoBack()) router.back();
    },
    [queryClient]
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index;
        onIndexChange?.(idx);
        // Prefetch next 3 images
        const upcoming = posts.slice(idx + 1, idx + 4);
        if (upcoming.length > 0) {
          ExpoImage.prefetch(upcoming.map((p) => p.image_url));
        }
      }
    },
    [posts, onIndexChange]
  );

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
        removeClippedSubviews={true}
        initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={onEndReached}
        onEndReachedThreshold={2}
        renderItem={({ item }) => (
          <DreamCard
            item={item}
            bottomPadding={hideTabBar ? 16 + insets.bottom : 90 + insets.bottom}
            isLiked={likeIds.has(item.id)}
            onLike={() => toggleLike({ uploadId: item.id, currentlyLiked: false })}
            onToggleLike={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleLike({ uploadId: item.id, currentlyLiked: likeIds.has(item.id) });
            }}
            onComment={() => setCommentPost(item)}
            isSaved={favoriteIds.has(item.id)}
            onToggleSave={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFavorite({ uploadId: item.id, currentlyFavorited: favoriteIds.has(item.id) });
            }}
            disableSwipeToProfile={disableSwipeToProfile}
            onDelete={item.user_id === user?.id ? () => handleDelete(item.id) : undefined}
            onFamily={
              item.is_ai_generated
                ? () => {
                    setFamilyPostId(item.id);
                    setFamilyPost(item);
                  }
                : undefined
            }
          />
        )}
      />
      {commentPost && (
        <CommentOverlay
          post={commentPost}
          onClose={() => setCommentPost(null)}
          hideTabBar={hideTabBar}
        />
      )}
      {familyPost && (
        <DreamFamilySheet
          visible={!!familyPostId}
          onClose={() => {
            setFamilyPostId(null);
            setFamilyPost(null);
          }}
          post={familyPost}
          uploadId={familyPost.id}
          isAiGenerated={familyPost.is_ai_generated}
          hideTabBar={hideTabBar}
          onDreamLikeThis={async () => {
            // Always fetch ai_prompt from DB — feed data may not include it
            let prompt = familyPost.ai_prompt ?? '';
            if (!prompt) {
              const { data } = await supabase
                .from('uploads')
                .select('ai_prompt')
                .eq('id', familyPost.id)
                .single();
              prompt = (data?.ai_prompt as string) ?? '';
            }
            setStyleRef({
              postId: familyPost.id,
              prompt,
              imageUrl: familyPost.image_url,
              username: familyPost.username,
              userId: familyPost.user_id,
              recipeId: familyPost.recipe_id ?? null,
            });
            router.navigate('/(tabs)/upload');
          }}
        />
      )}
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
