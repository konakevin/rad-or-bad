import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFeed, type FeedItem } from '@/hooks/useFeed';
import { useVote } from '@/hooks/useVote';
import { useFavoriteIds } from '@/hooks/useFavoriteIds';
import { useToggleFavorite } from '@/hooks/useToggleFavorite';
import { useFollowingIds } from '@/hooks/useFollowingIds';
import { useToggleFollow } from '@/hooks/useToggleFollow';
import { useFeedStore } from '@/store/feed';
import { useAuthStore } from '@/store/auth';
import { SwipeCard } from '@/components/SwipeCard';
import { RankCard } from '@/components/RankCard';
import { router } from 'expo-router';
import { useCategoryPosts } from '@/hooks/useCategoryPosts';

export default function FeedScreen() {
  const currentUser = useAuthStore((s) => s.user);
  const { data: feed = [], isLoading, refetch, isRefetching } = useFeed();
  const { mutate: castVote } = useVote();
  const { data: favoriteIds = new Set<string>() } = useFavoriteIds();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { mutate: toggleFollow } = useToggleFollow();
  const resetToken = useFeedStore((s) => s.resetToken);
  const refreshToken = useFeedStore((s) => s.refreshToken);
  const pendingPost = useFeedStore((s) => s.pendingPost);
  const setPendingPost = useFeedStore((s) => s.setPendingPost);
  const [deck, setDeck] = useState<FeedItem[]>([]);
  const [sessionVotes, setSessionVotes] = useState<Map<string, 'rad' | 'bad'>>(new Map());
  const [cardAreaHeight, setCardAreaHeight] = useState(0);
  const loadedFeedKey = useRef('');

  // When a new upload happens, wipe the deck so the feed refetches from scratch
  useEffect(() => {
    if (resetToken === 0) return;
    loadedFeedKey.current = '';
    setDeck([]);
    setSessionVotes(new Map());
  }, [resetToken]);

  // Prepend the user's own new post to the top of the deck after upload,
  // pre-marked as voted Rad so the 100% badge shows immediately
  useEffect(() => {
    if (!pendingPost) return;
    setDeck((prev) => {
      const alreadyIn = prev.some((d) => d.id === pendingPost.id);
      if (alreadyIn) return prev;
      return [pendingPost as FeedItem, ...prev];
    });
    setSessionVotes((prev) => new Map(prev).set(pendingPost.id, 'rad'));
    setPendingPost(null);
  }, [pendingPost]);

  useEffect(() => {
    const newKey = feed.map((f) => f.id).join(',');
    if (newKey && newKey !== loadedFeedKey.current) {
      loadedFeedKey.current = newKey;
      setDeck((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        const freshItems = feed.filter((f) => !existingIds.has(f.id));
        return [...prev, ...freshItems];
      });
    }
  }, [feed]);

  // Vote on the top card — card stays, score badge fades in with optimistic score
  const handleVote = useCallback(
    (item: FeedItem, vote: 'rad' | 'bad') => {
      if (sessionVotes.has(item.id)) return;
      Haptics.impactAsync(
        vote === 'rad'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
      castVote({ uploadId: item.id, vote });
      setSessionVotes((prev) => new Map(prev).set(item.id, vote));
    },
    [castVote, sessionVotes]
  );

  const handleFavorite = useCallback((item: FeedItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite({ uploadId: item.id, currentlyFavorited: favoriteIds.has(item.id) });
  }, [toggleFavorite, favoriteIds]);

  const handleFollow = useCallback((item: FeedItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow({ userId: item.user_id, currentlyFollowing: followingIds.has(item.user_id) });
  }, [toggleFollow, followingIds]);

  const handleUserPress = useCallback((item: FeedItem) => {
    router.push(`/user/${item.user_id}`);
  }, []);

  // Swipe up to dismiss (skip or after voting)
  const handleDismiss = useCallback((item: FeedItem) => {
    setDeck((prev) => prev.filter((c) => c.id !== item.id));
  }, []);

  // Tab icon pressed → refetch feed (keeps session votes intact)
  useEffect(() => {
    if (refreshToken === 0) return;
    loadedFeedKey.current = '';
    refetch();
  }, [refreshToken]);

  const handleRefresh = useCallback(() => {
    loadedFeedKey.current = '';
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#FF4500" />
      </SafeAreaView>
    );
  }

  const topCards = deck.slice(0, 3);
  const topItem = topCards[0];
  const topItemVoted = topItem ? sessionVotes.has(topItem.id) : false;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerWordRow}>
          {/* RAD — warm amber → orange, not full red */}
          <MaskedView maskElement={<Text style={styles.headerTitle}>RAD</Text>}>
            <LinearGradient
              colors={['#FFCC77', '#FFB300', '#FF5500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.headerTitle, styles.invisible]}>RAD</Text>
            </LinearGradient>
          </MaskedView>

          <Text style={styles.headerOr}>OR</Text>

          {/* BAD — teal → blue → purple */}
          <MaskedView maskElement={<Text style={styles.headerTitle}>BAD</Text>}>
            <LinearGradient
              colors={['#66DDCC', '#00CCAA', '#0077FF', '#6633CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.headerTitle, styles.invisible]}>BAD</Text>
            </LinearGradient>
          </MaskedView>
        </View>
        {isRefetching && <ActivityIndicator size="small" color="#71767B" style={styles.headerSpinner} />}
      </View>

      {/* Card stack */}
      <View style={styles.cardArea} onLayout={(e) => setCardAreaHeight(e.nativeEvent.layout.height)}>
        {deck.length === 0 && !isLoading && !isRefetching && feed.length === 0 ? (
          <CaughtUpState />
        ) : (
          topCards
            .slice()
            .reverse()
            .map((item, reversedIndex) => {
              const index = topCards.length - 1 - reversedIndex;
              return (
                <SwipeCard
                  key={item.id}
                  item={item}
                  userVote={sessionVotes.get(item.id) ?? null}
                  isFavorited={favoriteIds.has(item.id)}
                  isFollowing={followingIds.has(item.user_id)}
                  isOwnPost={currentUser?.id === item.user_id}
                  onDismiss={() => handleDismiss(item)}
                  onFavorite={() => handleFavorite(item)}
                  onFollow={() => handleFollow(item)}
                  onUserPress={() => handleUserPress(item)}
                  isTop={index === 0}
                  index={index}
                  containerHeight={cardAreaHeight}
                />
              );
            })
        )}
      </View>

      {/* Action buttons */}
      {topItem && (
        <View style={styles.actionRow}>
          <View style={styles.badGlow}>
            <TouchableOpacity
              style={[styles.voteButton, topItemVoted && styles.buttonVoted]}
              activeOpacity={0.8}
              onPress={() => handleVote(topItem, 'bad')}
              disabled={topItemVoted}
            >
              <LinearGradient
                colors={['#66DDCC', '#0077FF', '#6633CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.35)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="thumbs-down" size={26} color="#FFFFFF" />
              <Text style={styles.voteButtonText}>BAD</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.radGlow}>
            <TouchableOpacity
              style={[styles.voteButton, topItemVoted && styles.buttonVoted]}
              activeOpacity={0.8}
              onPress={() => handleVote(topItem, 'rad')}
              disabled={topItemVoted}
            >
              <LinearGradient
                colors={['#FFCC77', '#FFB300', '#FF5500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.35)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="thumbs-up" size={26} color="#FFFFFF" />
              <Text style={styles.voteButtonText}>RAD</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const CATEGORIES = [
  { key: 'people',  label: 'People',  color: '#60A5FA' },
  { key: 'animals', label: 'Animals', color: '#FB923C' },
  { key: 'food',    label: 'Food',    color: '#F43F5E' },
  { key: 'nature',  label: 'Nature',  color: '#4ADE80' },
  { key: 'memes',   label: 'Memes',   color: '#A78BFA' },
];

function CaughtUpState() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.caughtUpContent}>
      <Text style={styles.caughtUpTitle}>You're all caught up!</Text>
      <Text style={styles.caughtUpSubtitle}>Here's what's trending while you wait</Text>
      {CATEGORIES.map((cat) => (
        <CategorySection key={cat.key} category={cat} />
      ))}
    </ScrollView>
  );
}

function CategorySection({ category }: { category: typeof CATEGORIES[0] }) {
  const { data } = useCategoryPosts(category.key, 3);
  const posts = data?.posts ?? [];
  if (posts.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      <Text style={[styles.categoryLabel, { color: category.color }]}>{category.label}</Text>
      {posts.map((post, i) => (
        <RankCard key={post.id} post={post} rank={i + 1} height={120} />
      ))}
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 0.5,
    borderBottomColor: '#2F2F2F',
  },
  headerWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerOr: {
    color: '#7A8194',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 2,
  },
  invisible: {
    opacity: 0,
  },
  headerSpinner: {
    position: 'absolute',
    right: 16,
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    paddingHorizontal: 40,
    paddingBottom: 16,
    paddingTop: 12,
  },
  badGlow: {
    borderRadius: 40,
    shadowColor: '#0077FF',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  radGlow: {
    borderRadius: 40,
    shadowColor: '#FFB300',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  voteButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  buttonVoted: {
    opacity: 0.25,
  },
  voteButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  caughtUpContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  caughtUpTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  caughtUpSubtitle: {
    color: '#71767B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  categorySection: {
    marginBottom: 28,
    gap: 8,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
});
