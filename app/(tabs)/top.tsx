import {
  View, Text, ScrollView, ActivityIndicator,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { useCategoryPosts } from '@/hooks/useCategoryPosts';
import type { Category } from '@/types/database';
import { RankCard } from '@/components/RankCard';



const CATEGORIES: { key: Category; label: string; color: string }[] = [
  { key: 'people',  label: 'People',  color: '#60A5FA' },
  { key: 'animals', label: 'Animals', color: '#FB923C' },
  { key: 'food',    label: 'Food',    color: '#F43F5E' },
  { key: 'nature',  label: 'Nature',  color: '#4ADE80' },
  { key: 'memes',   label: 'Memes',   color: '#A78BFA' },
];

export default function TopScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [selected, setSelected] = useState<Category>(
    (params.category as Category | undefined) ?? CATEGORIES[0].key
  );

  useEffect(() => {
    if (params.category) setSelected(params.category as Category);
  }, [params.category]);

  const { data, isLoading } = useCategoryPosts(selected, 10);
  const posts = data?.posts ?? [];
  const albumIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const activeCategory = CATEGORIES.find((c) => c.key === selected);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Top 10{activeCategory
            ? <Text style={{ color: activeCategory.color }}> {activeCategory.label}</Text>
            : null}
        </Text>
      </View>

      {/* Category chips */}
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => {
          const isActive = selected === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setSelected(cat.key)}
              activeOpacity={0.75}
              style={[
                styles.chip,
                isActive
                  ? { backgroundColor: `${cat.color}26`, borderColor: `${cat.color}99` }
                  : styles.chipInactive,
              ]}
            >
              <Text style={[styles.chipText, isActive && { color: cat.color }]} numberOfLines={1}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF4500" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            No posts in {activeCategory?.label ?? selected} yet
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {posts.map((post, i) => (
            <RankCard key={post.id} post={post} rank={i + 1} albumIds={albumIds} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInactive: { borderColor: '#2F2F2F' },
  chipText: { color: '#71767B', fontSize: 13, fontWeight: '600' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#71767B', fontSize: 15 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
});
