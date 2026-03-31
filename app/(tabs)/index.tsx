import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/auth';
import { colors } from '@/constants/theme';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DreamPost {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  username: string;
  avatar_url: string | null;
  is_ai_generated: boolean;
  created_at: string;
}

const PAGE_SIZE = 10;

function useDreamFeed() {
  const user = useAuthStore((s) => s.user);

  return useInfiniteQuery({
    queryKey: ['dreamFeed', user?.id],
    queryFn: async ({ pageParam = 0 }): Promise<DreamPost[]> => {
      const { data, error } = await supabase
        .from('uploads')
        .select('id, user_id, image_url, caption, created_at, is_ai_generated, users!inner(username, avatar_url)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => {
        const u = row.users as Record<string, unknown>;
        return {
          id: row.id as string,
          user_id: row.user_id as string,
          image_url: row.image_url as string,
          caption: row.caption as string | null,
          username: u.username as string,
          avatar_url: u.avatar_url as string | null,
          is_ai_generated: (row.is_ai_generated as boolean) ?? false,
          created_at: row.created_at as string,
        };
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((total, page) => total + page.length, 0);
    },
    enabled: !!user,
  });
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useDreamFeed();
  const posts = data?.pages.flat() ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const currentPost = posts[currentIndex];

  if (isLoading) {
    return (
      <View style={s.root}>
        <View style={s.loadingCenter}>
          <ActivityIndicator size="large" color="#FF4500" />
        </View>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={s.root}>
        <View style={s.loadingCenter}>
          <Ionicons name="moon-outline" size={48} color={colors.textSecondary} />
          <Text style={s.emptyTitle}>No dreams yet</Text>
          <Text style={s.emptySub}>Dreams will appear here as they're created</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Full-screen vertical feed */}
      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={2}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Image
              source={{ uri: item.image_url }}
              style={s.fullImage}
              contentFit="cover"
              transition={200}
            />

            {/* Bottom gradient for text readability */}
            <View style={s.bottomGradient} />

            {/* Post info overlay — bottom */}
            <View style={[s.postInfo, { paddingBottom: 90 + insets.bottom }]}>
              <TouchableOpacity
                style={s.usernameRow}
                onPress={() => router.push(`/user/${item.user_id}`)}
                activeOpacity={0.7}
              >
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={s.avatar} />
                ) : (
                  <View style={s.avatarFallback}>
                    <Text style={s.avatarText}>{item.username[0].toUpperCase()}</Text>
                  </View>
                )}
                <Text style={s.username}>{item.username}</Text>
                {item.is_ai_generated && (
                  <Ionicons name="sparkles" size={14} color="#FFD700" />
                )}
              </TouchableOpacity>
              {item.caption && (
                <Text style={s.caption} numberOfLines={2}>{item.caption}</Text>
              )}
            </View>
          </View>
        )}
      />

      {/* Top overlay — transparent menu */}
      <View style={[s.topOverlay, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.push('/search')} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="search" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.logoText}>Dreams</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/inbox')} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Right side action buttons */}
      <View style={[s.sideActions, { bottom: 100 + insets.bottom }]}>
        <TouchableOpacity style={s.sideButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} activeOpacity={0.7}>
          <Ionicons name="heart-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={s.sideButton} onPress={() => { if (currentPost) router.push(`/comments?uploadId=${currentPost.id}`); }} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={s.sideButton} onPress={() => {}} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  card: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullImage: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: 'transparent',
    // Simulated gradient with layered opacity
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 1,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 60 },
  },
  postInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 8,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  username: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  caption: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
  sideActions: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 20,
  },
  sideButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 22,
  },
});
