import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useFeedStore } from '@/store/feed';
import { colors } from '@/constants/theme';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FullScreenFeed } from '@/components/FullScreenFeed';
import { OverlayPill } from '@/components/OverlayPill';
import type { DreamPostItem } from '@/components/DreamCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
type FeedTab = 'forYou' | 'following' | 'dreamers';
const PAGE_SIZE = 20;

function useDreamFeed(tab: FeedTab) {
  const user = useAuthStore((s) => s.user);
  const feedSeed = useFeedStore((s) => s.feedSeed);

  return useInfiniteQuery({
    queryKey: ['dreamFeed', tab, user?.id, feedSeed],
    queryFn: async ({ pageParam = 0 }): Promise<DreamPostItem[]> => {
      if (tab === 'forYou') {
        const { data, error } = await supabase.rpc('get_feed', {
          p_user_id: user!.id,
          p_limit: PAGE_SIZE,
          p_offset: pageParam,
          p_seed: feedSeed,
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
          comment_count: (row.comment_count as number) ?? 0,
          like_count: (row.like_count as number) ?? 0,
          twin_count: (row.twin_count as number) ?? 0,
          fuse_count: (row.fuse_count as number) ?? 0,
          bot_message: (row.bot_message as string | null) ?? null,
        }));
      }

      let query = supabase
        .from('uploads')
        .select(
          'id, user_id, image_url, caption, created_at, is_ai_generated, comment_count, like_count, from_wish, recipe_id, ai_prompt, twin_count, fuse_count, twin_of, fuse_of, bot_message, users!inner(username, avatar_url)'
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (tab === 'following') {
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user!.id);
        const ids = (followData ?? []).map((f: Record<string, string>) => f.following_id);
        if (ids.length === 0) return [];
        query = query.in('user_id', ids);
      } else if (tab === 'dreamers') {
        const { data: friendData } = await supabase.rpc('get_friend_ids', { p_user_id: user!.id });
        const ids = (friendData ?? []).map((f: Record<string, string>) => f.friend_id);
        if (ids.length === 0) return [];
        query = query.in('user_id', ids);
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
          comment_count: (row.comment_count as number) ?? 0,
          like_count: (row.like_count as number) ?? 0,
          from_wish: (row.from_wish as string | null) ?? null,
          recipe_id: (row.recipe_id as string | null) ?? null,
          ai_prompt: (row.ai_prompt as string | null) ?? null,
          twin_count: (row.twin_count as number) ?? 0,
          fuse_count: (row.fuse_count as number) ?? 0,
          twin_of: (row.twin_of as string | null) ?? null,
          fuse_of: (row.fuse_of as string | null) ?? null,
        };
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((total, page) => total + page.length, 0);
    },
    enabled: !!useAuthStore.getState().user,
  });
}

function FeedTabs({ active, onChange }: { active: FeedTab; onChange: (tab: FeedTab) => void }) {
  const tabs: { key: FeedTab; label: string }[] = [
    { key: 'following', label: 'Following' },
    { key: 'forYou', label: 'Explore' },
    { key: 'dreamers', label: 'Dreamers' },
  ];

  return (
    <View style={s.feedTabs}>
      {tabs.map((tab) => (
        <OverlayPill
          key={tab.key}
          label={tab.label}
          active={active === tab.key}
          onPress={() => onChange(tab.key)}
        />
      ))}
    </View>
  );
}

function EmptyFeed({ tab }: { tab: FeedTab }) {
  const msgs: Record<FeedTab, { icon: string; title: string; sub: string }> = {
    forYou: { icon: 'moon-outline', title: 'No dreams yet', sub: 'Dreams will appear here' },
    following: {
      icon: 'people-outline',
      title: 'No dreams from people you follow',
      sub: 'Follow dreamers to see their creations',
    },
    dreamers: {
      icon: 'heart-outline',
      title: 'No dreams from your dreamers',
      sub: 'Connect with dreamers to see their art',
    },
  };
  const m = msgs[tab];
  return (
    <View style={s.emptyWrap}>
      <Ionicons
        name={m.icon as keyof typeof Ionicons.glyphMap}
        size={48}
        color={colors.textSecondary}
      />
      <Text style={s.emptyTitle}>{m.title}</Text>
      <Text style={s.emptySub}>{m.sub}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FeedTab>('forYou');
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDreamFeed(activeTab);
  const pinnedPost = useFeedStore((s) => s.pinnedPost);
  const setPinnedPost = useFeedStore((s) => s.setPinnedPost);
  const feedPosts = data?.pages.flat() ?? [];
  const listRef = useRef<FlatList>(null) as React.RefObject<FlatList>;

  // Prepend pinned post (e.g. first dream from onboarding) then clear it
  const posts =
    pinnedPost && activeTab === 'forYou'
      ? [pinnedPost as unknown as DreamPostItem, ...feedPosts]
      : feedPosts;

  // Scroll to top when a pinned post appears
  useEffect(() => {
    if (pinnedPost) {
      setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }), 100);
    }
  }, [pinnedPost]);

  function handleTabChange(tab: FeedTab) {
    setActiveTab(tab);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    // Clear pinned post when switching tabs
    if (pinnedPost) setPinnedPost(null);
  }

  return (
    <View style={s.root}>
      <FullScreenFeed
        posts={posts}
        isLoading={isLoading}
        listRef={listRef}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        ListEmptyComponent={<EmptyFeed tab={activeTab} />}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)', 'transparent']}
        style={[s.topOverlay, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <View style={s.topRow}>
          <FeedTabs active={activeTab} onChange={handleTabChange} />
          <TouchableOpacity
            style={s.searchButton}
            onPress={() => router.push('/search')}
            activeOpacity={0.7}
            hitSlop={12}
          >
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  emptySub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 20 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  feedTabs: { flexDirection: 'row', gap: 8 },
  searchButton: { position: 'absolute', right: 16 },
});
