import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
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
import { router } from 'expo-router';

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
        {deck.length === 0 ? (
          <EmptyState onRefresh={handleRefresh} loading={isRefetching} />
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
          <TouchableOpacity
            style={[styles.passButton, topItemVoted && styles.buttonVoted]}
            activeOpacity={0.8}
            onPress={() => handleVote(topItem, 'bad')}
            disabled={topItemVoted}
          >
            <Text style={styles.passIcon}>👎</Text>
            <Text style={[styles.passButtonText, topItemVoted && styles.buttonTextVoted]}>
              BAD
            </Text>
          </TouchableOpacity>

          <Text style={styles.remaining}>{deck.length} left</Text>

          <TouchableOpacity
            style={[styles.gasButton, topItemVoted && styles.buttonVoted]}
            activeOpacity={0.8}
            onPress={() => handleVote(topItem, 'rad')}
            disabled={topItemVoted}
          >
            <Text style={styles.gasIcon}>🔥</Text>
            <Text style={[styles.gasButtonText, topItemVoted && styles.buttonTextVoted]}>
              RAD
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {deck.length > 0 && (
        <Text style={styles.hint}>
          {topItemVoted ? 'swipe up to move on' : 'vote with the buttons · swipe up to skip'}
        </Text>
      )}
    </SafeAreaView>
  );
}

function EmptyState({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🏜️</Text>
      <Text style={styles.emptyTitle}>You've rated everything</Text>
      <Text style={styles.emptySubtitle}>
        Check back later for new posts, or upload something yourself.
      </Text>
      <TouchableOpacity
        style={styles.refreshCta}
        onPress={onRefresh}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.refreshCtaText}>Refresh</Text>
        )}
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: 8,
    paddingTop: 12,
  },
  passButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#71767B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gasButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#FF4500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonVoted: {
    borderColor: '#2F2F2F',
    opacity: 0.4,
  },
  passIcon: { fontSize: 22 },
  passButtonText: {
    color: '#71767B',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  gasIcon: { fontSize: 22 },
  gasButtonText: {
    color: '#FF4500',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  buttonTextVoted: {
    color: '#3E4144',
  },
  remaining: {
    color: '#3E4144',
    fontSize: 13,
  },
  hint: {
    color: '#3E4144',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#71767B',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshCta: {
    backgroundColor: '#FF4500',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  refreshCtaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
