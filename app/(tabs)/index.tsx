import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withSpring, Easing } from 'react-native-reanimated';

const TREADMILL_COLORS = [
  '#BB88EE', '#6699EE', '#44BBCC', '#77CC88',
  '#CCDD55', '#DDBB55', '#DDAA66', '#DD7766',
  '#BB88EE', '#6699EE', '#44BBCC', '#77CC88',
  '#CCDD55', '#DDBB55', '#DDAA66', '#DD7766',
  '#BB88EE',
] as const;
const TREADMILL_WIDTH = 1280;
const TREADMILL_SCROLL = 640;

const BURST_COUNT = 12;
const BURST_ANGLES = Array.from({ length: BURST_COUNT }, (_, i) => (i * Math.PI * 2) / BURST_COUNT);
const RAD_PARTICLE_COLORS  = ['#FFEE88', '#DDAA66', '#FFFFFF', '#FFCC44', '#DDBB55', '#FFF0AA', '#DD7766', '#FFCC44', '#FFFFFF', '#DDAA66', '#FFEE88', '#CCDD55'];
const BAD_PARTICLE_COLORS  = ['#AABBFF', '#6699EE', '#FFFFFF', '#BB88EE', '#44BBCC', '#DDAAFF', '#9966FF', '#AABBFF', '#FFFFFF', '#6699EE', '#BB88EE', '#44BBCC'];
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFeed, type FeedItem } from '@/hooks/useFeed';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useVote } from '@/hooks/useVote';
import { useUserVote } from '@/hooks/useUserVote';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, gradients } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';


export default function FeedScreen() {
  const currentUser = useAuthStore((s) => s.user);
  const { data: flags } = useFeatureFlags();
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
  const externalVotes = useFeedStore((s) => s.externalVotes);
  const [deck, setDeck] = useState<FeedItem[]>([]);
  const [sessionVotes, setSessionVotes] = useState<Map<string, 'rad' | 'bad'>>(new Map());
  const [cardAreaHeight, setCardAreaHeight] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [headerRowSize, setHeaderRowSize] = useState({ width: 0, height: 0 });
  const loadedFeedKey = useRef('');
  const sessionVotesRef = useRef(sessionVotes);
  const headerTreadmillX = useSharedValue(-(Math.random() * TREADMILL_SCROLL));
  const headerTreadmillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: headerTreadmillX.value }] }));
  useEffect(() => {
    headerTreadmillX.value = withRepeat(
      withTiming(0, { duration: 16000, easing: Easing.linear }),
      -1, true,
    );
  }, []);
  useEffect(() => { sessionVotesRef.current = sessionVotes; }, [sessionVotes]);
  const spinnerColor = colors.textSecondary;

  // Show swipe hint once ever
  useEffect(() => {
    AsyncStorage.getItem('swipe_hint_seen').then((val) => {
      if (!val) setShowSwipeHint(true);
    });
  }, []);

  // When a new upload happens, wipe the deck so the feed refetches from scratch
  useEffect(() => {
    if (resetToken === 0) return;
    loadedFeedKey.current = '';
    setDeck([]);
    setSessionVotes(new Map());
  }, [resetToken]);

  // Prepend the user's own new post to the top of the deck after upload.
  // Seeded into sessionVotes as 'rad' so the 100% score badge shows immediately
  // (the DB also auto-votes rad at creation time). SwipeCard suppresses the
  // auto-dismiss timer for own posts so it stays until manually swiped away.
  useEffect(() => {
    if (!pendingPost) return;
    setDeck((prev) => {
      const alreadyIn = prev.some((d) => d.id === pendingPost.id);
      if (alreadyIn) return prev;
      return [pendingPost as FeedItem, ...prev];
    });
    setPendingPost(null);
  }, [pendingPost]);

  useEffect(() => {
    const newKey = feed.map((f) => f.id).join(',');
    if (newKey && newKey !== loadedFeedKey.current) {
      loadedFeedKey.current = newKey;
      const feedIds = new Set(feed.map((f) => f.id));
      setDeck((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        const freshItems = feed.filter((f) => !existingIds.has(f.id));
        // Remove items no longer in the feed that weren't voted this session —
        // they were voted externally (e.g. detail screen). Keep own posts
        // (feed RPC excludes them) and session-voted cards still animating out.
        const retained = prev.filter((item) =>
          feedIds.has(item.id) ||
          sessionVotesRef.current.has(item.id) ||
          item.user_id === currentUser?.id ||
          useFeedStore.getState().externalVotes.has(item.id)
        );
        return [...retained, ...freshItems];
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
    if (showSwipeHint) {
      setShowSwipeHint(false);
      AsyncStorage.setItem('swipe_hint_seen', '1');
    }
  }, [showSwipeHint]);

  // Tab icon pressed → refetch feed (keeps session votes intact)
  useEffect(() => {
    if (refreshToken === 0) return;
    loadedFeedKey.current = '';
    refetch();
  }, [refreshToken]);

  const topCards = deck.slice(0, 3);
  const topItem = topCards[0];
  const topItemVoted = topItem ? sessionVotes.has(topItem.id) : false;

  // Check if the top card was voted on outside this session (e.g. from the detail view).
  // useUserVote is invalidated by useVote.onSuccess so this stays in sync automatically.
  const { data: topItemDbVote } = useUserVote(topItem?.id ?? '');
  const topItemExternallyVoted = topItem
    ? (!!topItemDbVote || externalVotes.has(topItem.id)) && !sessionVotes.has(topItem.id)
    : false;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={spinnerColor} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        {/* Hidden sizer — measures the row before the masked version renders */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', opacity: 0 }}
          onLayout={(e) => setHeaderRowSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
          <View style={styles.headerWordRow}>
            <Text style={styles.headerTitle}>RAD</Text>
            <Text style={styles.headerOr}>OR</Text>
            <Text style={styles.headerTitle}>BAD</Text>
          </View>
        </View>

        {headerRowSize.width > 0 && (
          <MaskedView
            style={{ width: headerRowSize.width, height: headerRowSize.height }}
            maskElement={
              <View style={styles.headerWordRow}>
                <Text style={styles.headerTitle}>RAD</Text>
                <Text style={styles.headerOr}>OR</Text>
                <Text style={styles.headerTitle}>BAD</Text>
              </View>
            }
          >
            <Animated.View style={headerTreadmillStyle}>
              <LinearGradient
                colors={TREADMILL_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: TREADMILL_WIDTH, height: headerRowSize.height }}
              />
            </Animated.View>
          </MaskedView>
        )}
        {isRefetching && <ActivityIndicator size="small" color={colors.textSecondary} style={styles.headerSpinner} />}
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
                  userVote={sessionVotes.get(item.id) ?? (index === 0 && topItemExternallyVoted ? (topItemDbVote ?? externalVotes.get(item.id) ?? null) : null)}
                  isFavorited={favoriteIds.has(item.id)}
                  isFollowing={followingIds.has(item.user_id)}
                  isOwnPost={currentUser?.id === item.user_id}
                  isAlreadyVoted={index === 0 && topItemExternallyVoted}
                  onDismiss={() => handleDismiss(item)}
                  onFavorite={() => handleFavorite(item)}
                  onFollow={() => handleFollow(item)}
                  onUserPress={() => handleUserPress(item)}
                  isTop={index === 0}
                  index={index}
                  containerHeight={cardAreaHeight}
                  showSwipeHint={index === 0 && showSwipeHint}
                  swipeEnabled={true}
                />
              );
            })
        )}
      </View>

      {/* Action buttons / already-voted state */}
      {topItem && (
        topItemExternallyVoted ? (
          <AlreadyVotedRow />
        ) : (
          <View style={styles.actionRow}>
            <VoteButtonWithBurst vote="bad" onPress={() => handleVote(topItem, 'bad')} disabled={topItemVoted} />
            <VoteButtonWithBurst vote="rad" onPress={() => handleVote(topItem, 'rad')} disabled={topItemVoted} />
          </View>
        )
      )}

    </SafeAreaView>
  );
}

function Particle({ angle, distance, color, progress }: { angle: number; distance: number; color: string; progress: Animated.SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const dist = distance * p;
    const opacity = 1 - p;
    return {
      opacity,
      transform: [
        { translateX: Math.cos(angle) * dist },
        { translateY: Math.sin(angle) * dist },
        { scale: 0.4 + p * 0.6 },
      ],
    };
  });
  return <Animated.View style={[styles.burstParticle, { backgroundColor: color }, style]} />;
}

function BurstEffect({ progresses, vote }: { progresses: Animated.SharedValue<number>[]; vote: 'rad' | 'bad' }) {
  const colors = vote === 'rad' ? RAD_PARTICLE_COLORS : BAD_PARTICLE_COLORS;
  const distances = useMemo(() => BURST_ANGLES.map((_, i) => 70 + (i % 4) * 18), []);
  return (
    <View style={styles.burstContainer} pointerEvents="none">
      {BURST_ANGLES.map((angle, i) => (
        <Particle key={i} angle={angle} distance={distances[i]} color={colors[i]} progress={progresses[i]} />
      ))}
    </View>
  );
}

function VoteButtonWithBurst({ vote, onPress, disabled }: { vote: 'rad' | 'bad'; onPress: () => void; disabled: boolean }) {
  // Pre-create one shared value per particle so animation fires on the UI thread immediately
  const p0 = useSharedValue(0); const p1 = useSharedValue(0); const p2 = useSharedValue(0);
  const p3 = useSharedValue(0); const p4 = useSharedValue(0); const p5 = useSharedValue(0);
  const p6 = useSharedValue(0); const p7 = useSharedValue(0); const p8 = useSharedValue(0);
  const p9 = useSharedValue(0); const p10 = useSharedValue(0); const p11 = useSharedValue(0);
  const progresses = [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11];

  const buttonScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));
  const isRad = vote === 'rad';

  function handlePress() {
    progresses.forEach((p) => {
      p.value = 0;
      p.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
    });
    buttonScale.value = withSequence(
      withTiming(0.84, { duration: 5 }),
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
    );
    onPress();
  }

  return (
    <View style={styles.burstWrapper}>
      <BurstEffect progresses={progresses} vote={vote} />
      <Animated.View style={[isRad ? styles.radGlow : styles.badGlow, buttonStyle]}>
        <TouchableOpacity style={styles.voteButton} activeOpacity={0.8} onPress={handlePress} disabled={disabled}>
          <LinearGradient
            colors={isRad ? gradients.rad : gradients.bad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name={isRad ? 'thumbs-up' : 'thumbs-down'} size={26} color="#FFFFFF" />
          <Text style={styles.voteButtonText}>{isRad ? 'RAD' : 'BAD'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function AlreadyVotedRow() {
  const chevronY = useSharedValue(0);
  const treadmillX = useSharedValue(-(Math.random() * TREADMILL_SCROLL));
  const [labelWidth, setLabelWidth] = useState(0);

  useEffect(() => {
    chevronY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,  { duration: 500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    );
    treadmillX.value = withRepeat(
      withTiming(0, { duration: 16000, easing: Easing.linear }),
      -1, true,
    );
  }, []);

  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ translateY: chevronY.value }] }));
  const treadmillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: treadmillX.value }] }));

  return (
    <View style={styles.alreadyVotedRow}>
      <Animated.View style={chevronStyle}>
        <Ionicons name="chevron-up" size={24} color="rgba(255,255,255,0.5)" />
      </Animated.View>
      <View style={styles.alreadyVotedTextGroup}>
        {/* Hidden sizer to measure label width before showing masked version */}
        <View pointerEvents="none" style={{ position: 'absolute', opacity: 0 }}>
          <Text style={styles.alreadyVotedLabel} onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}>
            You already rated this one
          </Text>
        </View>
        <MaskedView
          style={labelWidth > 0 ? { width: labelWidth, height: 24 } : { opacity: 0 }}
          maskElement={<Text style={styles.alreadyVotedLabel}>You already rated this one</Text>}
        >
          <Animated.View style={treadmillStyle}>
            <LinearGradient
              colors={TREADMILL_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: TREADMILL_WIDTH, height: 24 }}
            />
          </Animated.View>
        </MaskedView>
        <Text style={styles.alreadyVotedSub}>Swipe up to continue</Text>
      </View>
    </View>
  );
}

function CaughtUpState() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.caughtUpScroll} contentContainerStyle={styles.caughtUpContent}>
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
  const albumIds = useMemo(() => posts.map((p) => p.id), [posts]);
  if (posts.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      <Text style={[styles.categoryLabel, { color: category.color }]}>{category.label}</Text>
      {posts.map((post, i) => (
        <RankCard key={post.id} post={post} rank={i + 1} albumIds={albumIds} height={130} />
      ))}
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  headerWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerOr: {
    color: colors.textSecondary,
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
    gap: 40,
    paddingHorizontal: 40,
    paddingBottom: 4,
    paddingTop: 12,
  },
  badGlow: {
    borderRadius: 37,
    shadowColor: '#6699EE',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  radGlow: {
    borderRadius: 37,
    shadowColor: '#DDAA66',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  voteButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  voteButtonText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  alreadyVotedRow: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 8,
    paddingBottom: 12,
    paddingTop: 8,
    height: 74 + 12 + 4,
  },
  alreadyVotedTextGroup: {
    alignItems: 'center',
    gap: 3,
  },
  alreadyVotedLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  alreadyVotedSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '500',
  },
  caughtUpScroll: {
    alignSelf: 'stretch',
  },
  caughtUpContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  caughtUpTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  caughtUpSubtitle: {
    color: colors.textSecondary,
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
  burstWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstContainer: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstParticle: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
  },
});
