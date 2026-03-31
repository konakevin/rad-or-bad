import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/auth';
import { colors } from '@/constants/theme';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FeedTab = 'forYou' | 'following' | 'dreamers';

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

function useDreamFeed(tab: FeedTab) {
  const user = useAuthStore((s) => s.user);
  const [seed] = useState(() => Math.random());

  return useInfiniteQuery({
    queryKey: ['dreamFeed', tab, user?.id, seed],
    queryFn: async ({ pageParam = 0 }): Promise<DreamPost[]> => {
      if (tab === 'forYou') {
        // Smart feed: Wilson score + time decay + follow boost + randomized seed
        const { data, error } = await supabase.rpc('get_feed', {
          p_user_id: user!.id,
          p_limit: PAGE_SIZE,
          p_seed: seed,
        });
        if (error) throw error;
        return (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          user_id: row.user_id as string,
          image_url: row.image_url as string,
          caption: row.caption as string | null,
          username: row.username as string,
          avatar_url: row.avatar_url as string | null,
          is_ai_generated: true,
          created_at: row.created_at as string,
        }));
      }

      // Following and Dreamers tabs — filtered queries
      let query = supabase
        .from('uploads')
        .select('id, user_id, image_url, caption, created_at, is_ai_generated, users!inner(username, avatar_url)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (tab === 'following') {
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user!.id);
        const followIds = (followData ?? []).map((f: Record<string, string>) => f.following_id);
        if (followIds.length === 0) return [];
        query = query.in('user_id', followIds);
      } else if (tab === 'dreamers') {
        const { data: friendData } = await supabase.rpc('get_friend_ids', { p_user_id: user!.id });
        const friendIds = (friendData ?? []).map((f: Record<string, string>) => f.friend_id);
        if (friendIds.length === 0) return [];
        query = query.in('user_id', friendIds);
      }

      const { data, error } = await query;
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

// ── Feed Tab Selector ───────────────────────────────────────────────────────

function FeedTabs({ active, onChange }: { active: FeedTab; onChange: (tab: FeedTab) => void }) {
  const tabs: { key: FeedTab; label: string }[] = [
    { key: 'following', label: 'Following' },
    { key: 'forYou', label: 'Explore' },
    { key: 'dreamers', label: 'Dreamers' },
  ];

  return (
    <View style={s.feedTabs}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(tab.key); }}
          activeOpacity={0.7}
          style={s.feedTab}
        >
          <Text style={[s.feedTabText, active === tab.key && s.feedTabTextActive]}>
            {tab.label}
          </Text>
          {active === tab.key && <View style={s.feedTabLine} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Dream Card ──────────────────────────────────────────────────────────────

function DreamCard({ item, insets }: { item: DreamPost; insets: { bottom: number } }) {
  return (
    <View style={s.card}>
      <Image
        source={{ uri: item.image_url }}
        style={s.fullImage}
        contentFit="cover"
        transition={200}
      />

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
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyFeed({ tab }: { tab: FeedTab }) {
  const messages: Record<FeedTab, { icon: string; title: string; sub: string }> = {
    forYou: { icon: 'moon-outline', title: 'No dreams yet', sub: 'Dreams will appear here as they\'re created' },
    following: { icon: 'people-outline', title: 'No dreams from people you follow', sub: 'Follow dreamers to see their creations here' },
    dreamers: { icon: 'heart-outline', title: 'No dreams from your dreamers', sub: 'Connect with dreamers to see their art here' },
  };
  const msg = messages[tab];
  return (
    <View style={s.emptyWrap}>
      <Ionicons name={msg.icon as keyof typeof Ionicons.glyphMap} size={48} color={colors.textSecondary} />
      <Text style={s.emptyTitle}>{msg.title}</Text>
      <Text style={s.emptySub}>{msg.sub}</Text>
    </View>
  );
}

// ── Home Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FeedTab>('forYou');
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useDreamFeed(activeTab);
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

  function handleTabChange(tab: FeedTab) {
    setActiveTab(tab);
    setCurrentIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  return (
    <View style={s.root}>
      {/* Full-screen vertical feed */}
      {isLoading ? (
        <View style={s.loadingCenter}>
          <ActivityIndicator size="large" color="#FF4500" />
        </View>
      ) : posts.length === 0 ? (
        <EmptyFeed tab={activeTab} />
      ) : (
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
          renderItem={({ item }) => <DreamCard item={item} insets={insets} />}
        />
      )}

      {/* Top overlay with gradient backdrop for readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'transparent']}
        style={[s.topOverlay, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <FeedTabs active={activeTab} onChange={handleTabChange} />
      </LinearGradient>

      {/* Right side action buttons */}
      {currentPost && (
        <View style={[s.sideActions, { bottom: 100 + insets.bottom }]}>
          <TouchableOpacity style={s.sideButton} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={s.sideButton} onPress={() => router.push(`/comments?uploadId=${currentPost.id}`)} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={s.sideButton} onPress={() => {}} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
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
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  card: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullImage: {
    ...StyleSheet.absoluteFillObject,
  },
  postInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 70,
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
    alignItems: 'center',
    paddingBottom: 20,
  },
  feedTabs: {
    flexDirection: 'row',
    gap: 24,
  },
  feedTab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  feedTabText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  feedTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  feedTabLine: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
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
