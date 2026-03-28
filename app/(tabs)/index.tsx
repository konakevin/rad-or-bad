import { useState, useEffect, useCallback, useMemo } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay, Easing } from 'react-native-reanimated';

const TREADMILL_COLORS = [
  '#BB88EE', '#6699EE', '#44BBCC', '#77CC88',
  '#CCDD55', '#DDBB55', '#DDAA66', '#DD7766',
  '#BB88EE', '#6699EE', '#44BBCC', '#77CC88',
  '#CCDD55', '#DDBB55', '#DDAA66', '#DD7766',
  '#BB88EE',
] as const;
const TREADMILL_WIDTH = 1280;
const TREADMILL_SCROLL = 640;

import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { FeedItem } from '@/hooks/useFeed';
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
import { colors } from '@/constants/theme';
import { VoteButton } from '@/components/VoteButton';
import { CATEGORIES } from '@/constants/categories';

// Extracted hooks — each owns one concern
import { useActiveFeed } from '@/hooks/useActiveFeed';
import { useFeedDeck } from '@/hooks/useFeedDeck';
import { useMilestoneDetection } from '@/hooks/useMilestoneDetection';
import { useStreakVoting } from '@/hooks/useStreakVoting';
import { useStreakUnlock } from '@/hooks/useStreakUnlock';


export default function FeedScreen() {
  const currentUser = useAuthStore((s) => s.user);
  const externalVotes = useFeedStore((s) => s.externalVotes);
  const refreshToken = useFeedStore((s) => s.refreshToken);
  const resetToken = useFeedStore((s) => s.resetToken);

  // ── Extracted hooks ──────────────────────────────────────────────────────
  const activeFeed = useActiveFeed();
  const deck = useFeedDeck(activeFeed.feed, currentUser?.id);
  const milestone = useMilestoneDetection();
  const streakVoting = useStreakVoting();
  const streakUnlock = useStreakUnlock();

  // ── Remaining local state (UI-only, minimal) ────────────────────────────
  const [cardAreaHeight, setCardAreaHeight] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [jiggleTick, setJiggleTick] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const [headerRowSize, setHeaderRowSize] = useState({ width: 0, height: 0 });

  // ── Query hooks (not extracted — they're simple selectors) ───────────────
  const { mutate: castVote } = useVote();
  const { data: favoriteIds = new Set<string>() } = useFavoriteIds();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { mutate: toggleFollow } = useToggleFollow();

  // ── Header treadmill animation ───────────────────────────────────────────
  const headerTreadmillX = useSharedValue(-(Math.random() * TREADMILL_SCROLL));
  const headerTreadmillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: headerTreadmillX.value }] }));
  useEffect(() => {
    headerTreadmillX.value = withRepeat(
      withTiming(0, { duration: 45000, easing: Easing.linear }),
      -1, true,
    );
  }, []);

  // ── After upload, switch to Explore feed ──────────────────────────────────
  useEffect(() => {
    if (resetToken === 0) return;
    activeFeed.setFeedMode('default');
  }, [resetToken]);

  // ── One-time swipe hint ──────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('swipe_hint_seen').then((val) => {
      if (!val) setShowSwipeHint(true);
    });
  }, []);

  // ── Feed mode change → reset deck ────────────────────────────────────────
  useEffect(() => {
    deck.resetDeck();
    milestone.clear();
    activeFeed.refetch();
  }, [activeFeed.feedMode]);

  // ── Tab icon pressed → refetch ───────────────────────────────────────────
  useEffect(() => {
    if (refreshToken === 0) return;
    deck.resetDeck();
    activeFeed.refetch();
  }, [refreshToken]);

  // ── Reset dismissing flag when top item changes ──────────────────────────
  useEffect(() => { setDismissing(false); }, [deck.topItem?.id]);

  // ── External vote detection ──────────────────────────────────────────────
  const { data: topItemDbVote } = useUserVote(deck.topItem?.id ?? '');
  const topItemExternallyVoted = deck.topItem
    ? (!!topItemDbVote || externalVotes.has(deck.topItem.id)) && !deck.sessionVotes.has(deck.topItem.id)
    : false;

  // ── Handlers (clean delegation to hooks) ─────────────────────────────────

  const handleVote = useCallback((item: FeedItem, vote: 'rad' | 'bad') => {
    if (deck.sessionVotes.has(item.id)) return;

    Haptics.impactAsync(
      vote === 'rad' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    castVote({ uploadId: item.id, vote });
    deck.recordVote(item.id, vote);
    streakUnlock.recordVote();
    milestone.checkAndTrigger(vote, item.rad_votes, item.id);

    if (activeFeed.feedMode === 'friends') {
      streakVoting.processVote(item, vote);
    }
  }, [deck.sessionVotes, activeFeed.feedMode]);

  const handleDismiss = useCallback((item: FeedItem) => {
    deck.dismissCard(item.id);
    milestone.clear();
    if (showSwipeHint) {
      setShowSwipeHint(false);
      AsyncStorage.setItem('swipe_hint_seen', '1');
    }
  }, [showSwipeHint]);

  const handleFavorite = useCallback((item: FeedItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite({ uploadId: item.id, currentlyFavorited: favoriteIds.has(item.id) });
  }, [toggleFavorite, favoriteIds]);

  const handleFollow = useCallback((item: FeedItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow({ userId: item.user_id, currentlyFollowing: followingIds.has(item.user_id) });
  }, [toggleFollow, followingIds]);

  const handleUserPress = useCallback((item: FeedItem) => {
    router.push(`/user/${item.user_id}?viewedPost=${item.id}`);
  }, []);

  const handleSwipeUpBlocked = useCallback(() => {
    setJiggleTick((t) => t + 1);
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────
  const { topItem, topCards } = deck;
  const topItemVoted = deck.topItemVoted;
  const { feedMode } = activeFeed;

  // ── Loading state ────────────────────────────────────────────────────────
  if (activeFeed.isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.textSecondary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
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
        {activeFeed.isRefetching && <ActivityIndicator size="small" color={colors.textSecondary} style={styles.headerSpinner} />}
      </View>

      {/* Feed mode toggle */}
      <View style={styles.feedToggleRow}>
        <TouchableOpacity
          style={[styles.feedToggle, feedMode === 'default' && styles.feedToggleActive]}
          onPress={() => activeFeed.setFeedMode('default')}
          activeOpacity={0.7}
        >
          <Ionicons name="globe" size={14} color={feedMode === 'default' ? colors.textPrimary : colors.textSecondary} />
          <Text style={[styles.feedToggleText, feedMode === 'default' && styles.feedToggleTextActive]}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedToggle, feedMode === 'friendsPosts' && styles.feedToggleActive]}
          onPress={() => activeFeed.setFeedMode('friendsPosts')}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={14} color={feedMode === 'friendsPosts' ? colors.textPrimary : colors.textSecondary} />
          <Text style={[styles.feedToggleText, feedMode === 'friendsPosts' && styles.feedToggleTextActive]}>Following</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedToggle, feedMode === 'friends' && styles.feedToggleActive]}
          onPress={() => {
            if (streakUnlock.streakUnlocked && streakUnlock.showStreakIntro) {
              streakUnlock.dismissIntro();
            }
            activeFeed.setFeedMode('friends');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="flash" size={14} color={feedMode === 'friends' ? '#FFD700' : colors.textSecondary} />
          <Text style={[styles.feedToggleText, feedMode === 'friends' && styles.feedToggleTextActive]}>Streak</Text>
        </TouchableOpacity>
      </View>

      {/* Card stack */}
      <View style={styles.cardArea} onLayout={(e) => { if (!cardAreaHeight) setCardAreaHeight(e.nativeEvent.layout.height); }}>
        {!cardAreaHeight ? null : feedMode === 'friends' && !streakUnlock.streakUnlocked ? (
          <StreakLockedState votesNeeded={10 - streakUnlock.totalVoteCount} onGoVote={() => activeFeed.setFeedMode('default')} />
        ) : deck.deck.length === 0 && !activeFeed.isLoading && !activeFeed.isRefetching && activeFeed.feed.length === 0 ? (
          <CaughtUpState />
        ) : (<>
          {topCards
            .slice()
            .reverse()
            .map((item, reversedIndex) => {
              const index = topCards.length - 1 - reversedIndex;
              return (
                <SwipeCard
                  key={item.id}
                  item={item}
                  userVote={deck.sessionVotes.get(item.id) ?? (index === 0 && topItemExternallyVoted ? (topItemDbVote ?? externalVotes.get(item.id) ?? null) : null)}
                  isFavorited={favoriteIds.has(item.id)}
                  isFollowing={followingIds.has(item.user_id)}
                  isOwnPost={currentUser?.id === item.user_id}
                  isAlreadyVoted={index === 0 && topItemExternallyVoted}
                  onDismiss={() => handleDismiss(item)}
                  onDismissStart={index === 0 ? () => { setDismissing(true); milestone.clear(); } : undefined}
                  onFavorite={() => handleFavorite(item)}
                  onFollow={() => handleFollow(item)}
                  onUserPress={() => handleUserPress(item)}
                  onSwipeUpBlocked={index === 0 ? handleSwipeUpBlocked : undefined}
                  hideRank={true}
                  isTop={index === 0}
                  index={index}
                  containerHeight={cardAreaHeight}
                  showSwipeHint={index === 0 && showSwipeHint}
                  swipeEnabled={true}
                  hasMilestone={index === 0 && milestone.isActive(item.id)}
                  friendVotes={feedMode === 'friends' ? streakVoting.applyLocalStreaks(item.friend_votes) : undefined}
                  autoDismissDelay={index === 0 && milestone.isActive(item.id) ? null : undefined}
                  milestoneHit={index === 0 && milestone.milestoneHit?.postId === item.id ? milestone.milestoneHit : null}
                />
              );
            })
          }
        </>)}
      </View>

      {/* Action buttons / already-voted */}
      {topItem && (
        topItem.user_id === currentUser?.id && !dismissing ? (
          <GradientMessageRow message="Upload complete!" />
        ) : topItemExternallyVoted && !dismissing ? (
          <GradientMessageRow message="You already rated this one" />
        ) : (
          <View style={styles.actionRow}>
            <VoteButton vote="bad" onPress={() => handleVote(topItem, 'bad')} disabled={topItemVoted} jiggleTick={jiggleTick} />
            <VoteButton vote="rad" onPress={() => handleVote(topItem, 'rad')} disabled={topItemVoted} jiggleTick={jiggleTick} />
          </View>
        )
      )}

      {/* Streak unlock intro overlay */}
      {streakUnlock.showStreakIntro && feedMode === 'friends' && (
        <View style={styles.introOverlay}>
          <View style={styles.introCard}>
            <Ionicons name="flash" size={40} color="#FFD700" />
            <Text style={styles.introTitle}>Streak Mode Unlocked!</Text>
            <Text style={styles.introBody}>
              See posts your friends already voted on. Vote and find out if you agree — build streaks with friends who think like you!
            </Text>
            <TouchableOpacity
              style={styles.introButton}
              onPress={streakUnlock.dismissIntro}
              activeOpacity={0.7}
            >
              <Text style={styles.introButtonText}>Let's go!</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}


// ── Sub-components (unchanged) ─────────────────────────────────────────────

function GradientMessageRow({ message }: { message: string }) {
  const treadmillX = useSharedValue(-(Math.random() * TREADMILL_SCROLL));
  const [labelWidth, setLabelWidth] = useState(0);

  useEffect(() => {
    treadmillX.value = withRepeat(
      withTiming(0, { duration: 16000, easing: Easing.linear }),
      -1, true,
    );
  }, []);

  const treadmillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: treadmillX.value }] }));

  return (
    <View style={styles.alreadyVotedRow}>
      <View style={styles.alreadyVotedTextGroup}>
        <View pointerEvents="none" style={{ position: 'absolute', opacity: 0 }}>
          <Text style={styles.milestoneMessage} onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}>
            {message}
          </Text>
        </View>
        <View style={{ overflow: 'visible' }}>
          <MaskedView
            style={labelWidth > 0 ? { width: labelWidth, height: 22 } : { opacity: 0 }}
            maskElement={<Text style={styles.milestoneMessage}>{message}</Text>}
          >
            <Animated.View style={treadmillStyle}>
              <LinearGradient
                colors={TREADMILL_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: TREADMILL_WIDTH, height: 22 }}
              />
            </Animated.View>
          </MaskedView>
          {labelWidth > 0 && (
            <View pointerEvents="none" style={{ position: 'absolute', top: 16, left: labelWidth / 2, overflow: 'visible' }}>
              {DRIP_CONFIGS.map((cfg, i) => (
                <StarDripParticle key={i} config={cfg} labelWidth={labelWidth} />
              ))}
            </View>
          )}
        </View>
        <Text style={[styles.alreadyVotedSub, { marginTop: 10 }]}>Swipe up to continue</Text>
      </View>
    </View>
  );
}

const DRIP_COLORS = [
  '#D4AAFF', '#99BBFF', '#77DDEE', '#99EEBB',
  '#DDEE88', '#FFDD99', '#FFCC88', '#FFAA99',
];
const DRIP_COUNT = 18;

function seededRand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const STAR_DRIP_COLORS = [...DRIP_COLORS, '#FFFFFF', '#FFFFFF', '#FFFFFF'];

const DRIP_CONFIGS = Array.from({ length: DRIP_COUNT }, (_, i) => ({
  xFraction: i >= DRIP_COUNT - 4
    ? (i % 2 === 0 ? 0.0 + seededRand(i * 7 + 1) * 0.04 : 1.0 - seededRand(i * 7 + 1) * 0.04)
    : seededRand(i * 7 + 1),
  size: 4 + seededRand(i * 7 + 2) * 6,
  color: STAR_DRIP_COLORS[i % STAR_DRIP_COLORS.length],
  fallDistance: 28 + seededRand(i * 7 + 3) * 35,
  delay: Math.floor(seededRand(i * 7 + 4) * 600),
  duration: 800 + Math.floor(seededRand(i * 7 + 5) * 600),
}));

function StarDripParticle({ config, labelWidth }: { config: typeof DRIP_CONFIGS[number]; labelWidth: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(config.delay, withTiming(1, { duration: config.duration, easing: Easing.in(Easing.quad) })),
      ),
      -1, false,
    );
  }, []);

  const x = (config.xFraction - 0.5) * labelWidth;
  const s = config.size;
  const isWhite = config.color === '#FFFFFF';
  const glowColor = isWhite ? '#FFFFFF' : config.color;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.4) / 0.6),
      transform: [
        { translateX: x },
        { translateY: p * config.fallDistance },
        { scale: 1 - p * 0.4 },
        { rotate: '45deg' },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ position: 'absolute', width: s * 1.6, height: s * 1.6, borderRadius: s * 0.8, backgroundColor: `${glowColor}20` }} />
      <View style={{ position: 'absolute', width: s * 0.22, height: s, borderRadius: s * 0.11, backgroundColor: config.color, shadowColor: glowColor, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />
      <View style={{ position: 'absolute', width: s, height: s * 0.22, borderRadius: s * 0.11, backgroundColor: config.color, shadowColor: glowColor, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />
    </Animated.View>
  );
}

function StreakLockedState({ votesNeeded, onGoVote }: { votesNeeded: number; onGoVote: () => void }) {
  return (
    <View style={styles.lockedContainer}>
      <Ionicons name="flash-outline" size={48} color="rgba(255,215,0,0.4)" />
      <Text style={styles.lockedTitle}>Streak Mode</Text>
      <Text style={styles.lockedBody}>
        Vote on {votesNeeded} more {votesNeeded === 1 ? 'post' : 'posts'} to unlock! See what your friends voted on and build streaks by voting the same way.
      </Text>
      <TouchableOpacity style={styles.lockedButton} onPress={onGoVote} activeOpacity={0.7}>
        <Ionicons name="flash" size={16} color="#FFD700" />
        <Text style={styles.lockedButtonText}>Go vote</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
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
  feedToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 6,
  },
  feedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  feedToggleActive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  feedToggleText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  feedToggleTextActive: {
    color: colors.textPrimary,
  },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  lockedTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  lockedBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  lockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  lockedButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  introCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  introTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  introBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  introButton: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 4,
  },
  introButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
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
  alreadyVotedRow: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'column',
    overflow: 'visible',
    paddingBottom: 12,
    paddingTop: 15,
    height: 74 + 12 + 4,
  },
  alreadyVotedTextGroup: {
    alignItems: 'center',
    gap: 3,
  },
  milestoneMessage: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  alreadyVotedSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
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
});
