import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { DREAM_CATEGORIES, type DreamCategory } from '@/constants/dreamCategories';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP) / 2;

interface DreamPost {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  ai_prompt: string | null;
  username: string;
}

function useCategoryDreams(category: DreamCategory | null) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['categoryDreams', category?.key],
    queryFn: async (): Promise<DreamPost[]> => {
      if (!category) return [];

      const { data, error } = await supabase
        .from('uploads')
        .select('id, user_id, image_url, caption, ai_prompt, users!inner(username)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const keywords = category.keywords;
      return (data ?? [])
        .map((row: Record<string, unknown>) => {
          const u = row.users as Record<string, unknown>;
          return {
            id: row.id as string,
            user_id: row.user_id as string,
            image_url: row.image_url as string,
            caption: row.caption as string | null,
            ai_prompt: row.ai_prompt as string | null,
            username: u.username as string,
          };
        })
        .filter((post) => {
          const text = `${post.ai_prompt ?? ''} ${post.caption ?? ''}`.toLowerCase();
          return keywords.some((kw) => text.includes(kw));
        });
    },
    enabled: !!user && !!category,
    staleTime: 60_000,
  });
}

// Fetch one preview image per category for the grid tiles
function useCategoryPreviews() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['categoryPreviews'],
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from('uploads')
        .select('image_url, ai_prompt, caption')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const previews: Record<string, string> = {};
      for (const cat of DREAM_CATEGORIES) {
        const match = (data ?? []).find((row: Record<string, unknown>) => {
          const text = `${row.ai_prompt ?? ''} ${row.caption ?? ''}`.toString().toLowerCase();
          return cat.keywords.some((kw) => text.includes(kw));
        });
        if (match) previews[cat.key] = match.image_url as string;
      }
      return previews;
    },
    enabled: !!user,
    staleTime: 300_000,
  });
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<DreamCategory | null>(null);
  const { data: posts = [], isLoading } = useCategoryDreams(selected);
  const { data: previews = {} } = useCategoryPreviews();

  function selectCategory(cat: DreamCategory) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(cat);
  }

  // ── Category Grid ─────────────────────────────────────────────────────────

  if (!selected) {
    return (
      <View style={s.root}>
        <FlatList
          data={DREAM_CATEGORIES}
          keyExtractor={(item) => item.key}
          numColumns={2}
          columnWrapperStyle={s.catRow}
          contentContainerStyle={[s.catGrid, { paddingTop: insets.top + 50 }]}
          ListHeaderComponent={
            <View style={s.catHeader}>
              <Text style={s.catTitle}>Explore Dreams</Text>
              <Text style={s.catSub}>Browse by style</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.catTile}
              onPress={() => selectCategory(item)}
              activeOpacity={0.8}
            >
              {previews[item.key] ? (
                <Image source={{ uri: previews[item.key] }} style={s.catTileImage} contentFit="cover" />
              ) : (
                <View style={[s.catTileImage, { backgroundColor: `${item.color}20` }]} />
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={s.catTileGradient}
              />
              <View style={s.catTileLabel}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={16} color={item.color} />
                <Text style={s.catTileLabelText}>{item.label}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // ── Category Detail ───────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.detailHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => setSelected(null)} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.detailHeaderCenter}>
          <Ionicons name={selected.icon as keyof typeof Ionicons.glyphMap} size={18} color={selected.color} />
          <Text style={s.detailHeaderTitle}>{selected.label}</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#FF4500" />
        </View>
      ) : posts.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="moon-outline" size={40} color={colors.textSecondary} />
          <Text style={s.emptyText}>No {selected.label.toLowerCase()} dreams yet</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={s.postRow}
          contentContainerStyle={[s.postGrid, { paddingTop: insets.top + 56 }]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.postTile}
              onPress={() => router.push(`/photo/${item.id}`)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.image_url }} style={s.postImage} contentFit="cover" transition={200} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={s.postGradient} />
              <Text style={s.postUsername} numberOfLines={1}>@{item.username}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 16 },

  // Category grid
  catGrid: { paddingHorizontal: 2, paddingBottom: 100 },
  catRow: { gap: GRID_GAP },
  catHeader: { paddingHorizontal: 16, paddingBottom: 16 },
  catTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  catSub: { color: colors.textSecondary, fontSize: 15, marginTop: 4 },
  catTile: {
    width: TILE_SIZE,
    height: TILE_SIZE * 1.2,
    marginBottom: GRID_GAP,
    overflow: 'hidden',
  },
  catTileImage: {
    ...StyleSheet.absoluteFillObject,
  },
  catTileGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  catTileLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catTileLabelText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },

  // Detail header (absolute over content)
  detailHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  detailHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },

  // Post grid
  postGrid: { paddingBottom: 100 },
  postRow: { gap: GRID_GAP },
  postTile: {
    width: TILE_SIZE,
    height: TILE_SIZE * 1.4,
    marginBottom: GRID_GAP,
    overflow: 'hidden',
  },
  postImage: {
    ...StyleSheet.absoluteFillObject,
  },
  postGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  postUsername: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
});
