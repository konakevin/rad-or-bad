import { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, FlatList,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useFavoriteIds } from '@/hooks/useFavoriteIds';
import { useToggleFavorite } from '@/hooks/useToggleFavorite';
import { DreamCard } from '@/components/DreamCard';
import { DREAM_CATEGORIES, type DreamCategory } from '@/constants/dreamCategories';
import { colors } from '@/constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PAGE_SIZE = 10;

import type { DreamPostItem } from '@/components/DreamCard';

interface DreamPost extends DreamPostItem {
  ai_prompt: string | null;
}

function useCategoryDreams(category: DreamCategory) {
  const user = useAuthStore((s) => s.user);
  const [seed] = useState(() => Math.random());

  return useInfiniteQuery({
    queryKey: ['categoryDreams', category.key, seed],
    queryFn: async (): Promise<DreamPost[]> => {
      // Use the smart feed algorithm (Wilson score + time decay + follow boost + randomization)
      // then filter by category keywords client-side
      const { data, error } = await supabase.rpc('get_feed', {
        p_user_id: user!.id,
        p_limit: 100, // fetch more since we filter down
        p_seed: seed,
      });

      if (error) throw error;

      const keywords = category.keywords;
      return (data ?? [])
        .map((row: Record<string, unknown>) => {
          const text = `${row.caption ?? ''}`.toString().toLowerCase();
          if (!keywords.some((kw) => text.includes(kw))) return null;
          return {
            id: row.id as string,
            user_id: row.user_id as string,
            image_url: row.image_url as string,
            caption: row.caption as string | null,
            ai_prompt: null,
            username: row.username as string,
            avatar_url: row.avatar_url as string | null,
            is_ai_generated: true,
            created_at: row.created_at as string,
          };
        })
        .filter(Boolean) as DreamPost[];
    },
    initialPageParam: 0,
    getNextPageParam: () => undefined, // single page since get_feed returns sorted results
    enabled: !!user,
    staleTime: 60_000,
  });
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<DreamCategory>(DREAM_CATEGORIES[0]);
  const [showChipFade, setShowChipFade] = useState(true);
  const chipScrollRef = useRef<ScrollView>(null);
  const flatListRef = useRef<FlatList>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useCategoryDreams(selected);
  const posts = data?.pages.flat() ?? [];
  const { data: favoriteIds = new Set<string>() } = useFavoriteIds();
  const { mutate: toggleFavorite } = useToggleFavorite();

  const [currentIndex, setCurrentIndex] = useState(0);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const currentPost = posts[currentIndex];

  function handleChipScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setShowChipFade(contentOffset.x + layoutMeasurement.width < contentSize.width - 10);
  }

  function selectCategory(cat: DreamCategory) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(cat);
    setCurrentIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  return (
    <View style={s.root}>
      {/* Full-screen vertical feed */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#FF4500" />
        </View>
      ) : posts.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="moon-outline" size={48} color={colors.textSecondary} />
          <Text style={s.emptyTitle}>No {selected.label.toLowerCase()} dreams yet</Text>
          <Text style={s.emptySub}>Dreams matching this style will appear here</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index })}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={2}
          renderItem={({ item }) => (
            <DreamCard
              item={item}
              bottomPadding={90 + insets.bottom}
              isLiked={favoriteIds.has(item.id)}
              onLike={() => toggleFavorite({ uploadId: item.id, currentlyFavorited: false })}
              onToggleLike={() => toggleFavorite({ uploadId: item.id, currentlyFavorited: favoriteIds.has(item.id) })}
              onComment={() => router.push(`/comments?uploadId=${item.id}`)}
            />
          )}
        />
      )}

      {/* Top overlay — gradient + category pills */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)', 'transparent']}
        style={[s.topOverlay, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <View style={s.chipWrapper}>
          <ScrollView
            ref={chipScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipRow}
            onScroll={handleChipScroll}
            scrollEventThrottle={16}
          >
            {DREAM_CATEGORIES.map((cat) => {
              const active = selected.key === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => selectCategory(cat)}
                  activeOpacity={0.7}
                  style={s.chip}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>
                    {cat.label}
                  </Text>
                  {active && <View style={s.chipLine} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </LinearGradient>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  emptySub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },


  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingBottom: 20,
  },
  chipWrapper: {},
  chipRow: { gap: 20, paddingHorizontal: 16 },
  chip: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  chipLine: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  chipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

});
