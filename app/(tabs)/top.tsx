import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, FlatList,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { DREAM_CATEGORIES, type DreamCategory } from '@/constants/dreamCategories';
import { colors } from '@/constants/theme';
import { FullScreenFeed } from '@/components/FullScreenFeed';
import type { DreamPostItem } from '@/components/DreamCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function useCategoryDreams(category: DreamCategory) {
  const user = useAuthStore((s) => s.user);
  const [seed] = useState(() => Math.random());

  return useInfiniteQuery({
    queryKey: ['categoryDreams', category.key, seed],
    queryFn: async (): Promise<DreamPostItem[]> => {
      const { data, error } = await supabase.rpc('get_feed', {
        p_user_id: user!.id,
        p_limit: 100,
        p_offset: 0,
        p_seed: seed,
      });
      if (error) throw error;

      const keywords = category.keywords;
      return (data ?? [])
        .filter((row: Record<string, unknown>) => {
          const text = `${row.caption ?? ''}`.toString().toLowerCase();
          return keywords.some((kw) => text.includes(kw));
        })
        .map((row: Record<string, unknown>) => ({
          id: row.id as string,
          user_id: row.user_id as string,
          image_url: row.image_url as string,
          caption: row.caption as string | null,
          username: row.username as string,
          avatar_url: row.avatar_url as string | null,
          is_ai_generated: true,
          created_at: row.created_at as string,
          comment_count: (row.comment_count as number) ?? 0,
        }));
    },
    initialPageParam: 0,
    getNextPageParam: () => undefined,
    enabled: !!user,
    staleTime: 60_000,
  });
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<DreamCategory>(DREAM_CATEGORIES[0]);
  const [showChipFade, setShowChipFade] = useState(true);
  const chipScrollRef = useRef<ScrollView>(null);
  const listRef = useRef<FlatList>(null);

  const { data, isLoading } = useCategoryDreams(selected);
  const posts = data?.pages.flat() ?? [];

  function handleChipScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setShowChipFade(contentOffset.x + layoutMeasurement.width < contentSize.width - 10);
  }

  function selectCategory(cat: DreamCategory) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(cat);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  return (
    <View style={s.root}>
      <FullScreenFeed
        posts={posts}
        isLoading={isLoading}
        listRef={listRef}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="moon-outline" size={48} color={colors.textSecondary} />
            <Text style={s.emptyTitle}>No {selected.label.toLowerCase()} dreams yet</Text>
          </View>
        }
      />

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
                  style={[s.chip, active && s.chipActive]}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>
                    {cat.label}
                  </Text>
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
  root: { flex: 1, backgroundColor: '#000' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { color: colors.textSecondary, fontSize: 17 },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 20 },
  chipWrapper: {},
  chipRow: { gap: 12, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.overlayWhite,
  },
  chipActive: { backgroundColor: colors.overlayWhiteActive },
  chipText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '800' },
});
