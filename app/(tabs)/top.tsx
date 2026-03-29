import {
  View, Text, ScrollView, ActivityIndicator,
  TouchableOpacity, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useCategoryPosts, type CategorySort } from '@/hooks/useCategoryPosts';
import type { Category } from '@/types/database';
import { RankCard } from '@/components/RankCard';
import { colors, gradients } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';

export default function TopScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [selected, setSelected] = useState<Category>(
    (params.category as Category | undefined) ?? CATEGORIES[0].key
  );
  const [sort, setSort] = useState<CategorySort>('top');
  const [showChipFade, setShowChipFade] = useState(true);

  function handleChipScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const atEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 10;
    setShowChipFade(!atEnd);
  }

  useEffect(() => {
    if (params.category) setSelected(params.category as Category);
  }, [params.category]);

  const scrollRef = useRef<ScrollView>(null);
  const { data, isLoading, refetch } = useCategoryPosts(selected, 9, sort);
  const posts = data?.posts ?? [];
  const albumIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const activeCategory = CATEGORIES.find((c) => c.key === selected);

  // Preserve the last known windowLabel so the header height doesn't change
  // while a new category is loading (which causes a visible layout jump).
  const stableWindowLabel = useRef('');
  if (data?.windowLabel) stableWindowLabel.current = data.windowLabel;

  function selectCategory(key: Category) {
    setSelected(key);
    refetch();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  return (
    <SafeAreaView style={styles.root}>

      {/* Header — big category name + sort toggle */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.categoryHero}>
              {activeCategory?.label ?? selected}
            </Text>
            <Text style={[styles.metaLabel, !stableWindowLabel.current && styles.invisible]}>
              {sort === 'top' ? 'Top' : 'Bottom'} Posts · {stableWindowLabel.current}
            </Text>
          </View>
          <View style={styles.sortToggle}>
            <TouchableOpacity onPress={() => setSort('top')} activeOpacity={0.75} style={styles.sortButton}>
              <MaskedView maskElement={<Text style={styles.sortButtonText}>RAD</Text>}>
                <LinearGradient colors={gradients.rad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={[styles.sortButtonText, styles.invisible]}>RAD</Text>
                </LinearGradient>
              </MaskedView>
              {sort === 'top' && (
                <LinearGradient colors={gradients.rad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sortUnderline} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSort('bottom')} activeOpacity={0.75} style={styles.sortButton}>
              <MaskedView maskElement={<Text style={styles.sortButtonText}>BAD</Text>}>
                <LinearGradient colors={gradients.bad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={[styles.sortButtonText, styles.invisible]}>BAD</Text>
                </LinearGradient>
              </MaskedView>
              {sort === 'bottom' && (
                <LinearGradient colors={gradients.bad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sortUnderline} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Category chips — horizontal scroll with right fade */}
      <View style={styles.chipWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          onScroll={handleChipScroll}
          scrollEventThrottle={16}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selected === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => selectCategory(cat.key)}
                activeOpacity={0.75}
                style={[
                  styles.chip,
                  isActive
                    ? styles.chipActive
                    : styles.chipInactive,
                ]}
              >
                <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={13} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {/* Fade to signal more chips off-screen — hides when scrolled to end */}
        {showChipFade && (
          <LinearGradient
            colors={['transparent', '#000000']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.chipFade}
            pointerEvents="none"
          />
        )}
      </View>

      {/* Rank list */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#71767B" size="large" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nothing here yet</Text>
          <Text style={styles.emptySubtext}>Be the first to post in {activeCategory?.label}</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* #1 — full-width hero */}
          {posts[0] && (
            <RankCard
              key={posts[0].id}
              post={posts[0]}
              rank={1}
              albumIds={albumIds}
              accentColor={activeCategory?.color}
              featured
            />
          )}

          {/* #2–9 — 2-column grid */}
          <View style={styles.grid}>
            {posts.slice(1).map((post, i) => (
              <RankCard
                key={post.id}
                post={post}
                rank={i + 2}
                albumIds={albumIds}
                accentColor={activeCategory?.color}
                grid
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortToggle: {
    flexDirection: 'row',
    gap: 16,
  },
  sortButton: {
    alignItems: 'center',
    paddingBottom: 4,
    gap: 4,
  },
  sortUnderline: {
    height: 3,
    borderRadius: 2,
    width: '100%',
  },
  sortButtonText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  invisible: { opacity: 0 },
  categoryHero: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 44,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  chipWrapper: {
    height: 44,
    marginBottom: 4,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    gap: 5,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.4)' },
  chipInactive: { borderColor: 'rgba(255,255,255,0.25)' },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  chipFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  emptySubtext: { color: colors.textSecondary, fontSize: 14 },
  scrollContent: { paddingTop: 12, paddingBottom: 32 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
});
