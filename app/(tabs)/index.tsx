import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import { useFeed, useFriendsFeed, useFollowingFeed, type FeedItem } from '@/hooks/useFeed';
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
import { colors } from '@/constants/theme';
import { VoteButton } from '@/components/VoteButton';
import { MilestoneBurst } from '@/components/MilestoneBurst';
import { checkMilestone, type MilestoneHit } from '@/lib/milestones';
import { useFriendVotesOnPost } from '@/hooks/useFriendVotesOnPost';
import { CATEGORIES } from '@/constants/categories';


export default function FeedScreen() {
  const currentUser = useAuthStore((s) => s.user);
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [feedMode, setFeedMode] = useState<'default' | 'friends' | 'friendsPosts'>(mode === 'friends' ? 'friends' : 'default');

  // Reset mode when route param changes
  useEffect(() => {
    if (mode === 'friends') setFeedMode('friends');
  }, [mode]);

  const { data: flags } = useFeatureFlags();
  const defaultFeed = useFeed();
  const friendsFeed = useFriendsFeed();
  const followingFeed = useFollowingFeed();
  const activeFeed = feedMode === 'friends' ? friendsFeed : feedMode === 'friendsPosts' ? followingFeed : defaultFeed;
  const { data: feed = [], isLoading, refetch, isRefetching } = activeFeed;
  const { mutate: castVote } = useVote();
  // Post-vote friend reveal (Everyone/Following modes only)
  const { data: friendVotesOnPost = [] } = useFriendVotesOnPost(
    feedMode !== 'friends' ? friendRevealPostId : null
  );
  const { data: favoriteIds = new Set<string>() } = useFavoriteIds();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { mutate: toggleFollow } = useToggleFollow();
  const resetToken = useFeedStore((s) => s.resetToken);
  const refreshToken = useFeedStore((s) => s.refreshToken);
  const localStreaks = useFeedStore((s) => s.localStreaks);
  const updateStreak = useFeedStore((s) => s.updateStreak);
  const clearLocalStreaks = useFeedStore((s) => s.clearLocalStreaks);
  const pendingPost = useFeedStore((s) => s.pendingPost);
  const setPendingPost = useFeedStore((s) => s.setPendingPost);
  const externalVotes = useFeedStore((s) => s.externalVotes);
  const [deck, setDeck] = useState<FeedItem[]>([]);
  const [sessionVotes, setSessionVotes] = useState<Map<string, 'rad' | 'bad'>>(new Map());
  const [cardAreaHeight, setCardAreaHeight] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [streakUnlocked, setStreakUnlocked] = useState(false);
  const [showStreakIntro, setShowStreakIntro] = useState(false);
  const [totalVoteCount, setTotalVoteCount] = useState(0);
  const [jiggleTick, setJiggleTick] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const [milestoneHit, setMilestoneHit] = useState<(MilestoneHit & { postId: string }) | null>(null);
  const [friendRevealPostId, setFriendRevealPostId] = useState<string | null>(null);
  const [headerRowSize, setHeaderRowSize] = useState({ width: 0, height: 0 });
  const loadedFeedKey = useRef('');
  const sessionVotesRef = useRef(sessionVotes);
  const headerTreadmillX = useSharedValue(-(Math.random() * TREADMILL_SCROLL));
  const headerTreadmillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: headerTreadmillX.value }] }));
  useEffect(() => {
    headerTreadmillX.value = withRepeat(
      withTiming(0, { duration: 45000, easing: Easing.linear }),
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

  // Streak unlock gate
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('total_vote_count'),
      AsyncStorage.getItem('streak_intro_seen'),
    ]).then(([count, introSeen]) => {
      const n = parseInt(count ?? '0', 10);
      setTotalVoteCount(n);
      setStreakUnlocked(n >= 10);
      // If they just hit 10 and haven't seen the intro, we'll show it when they tap Streak
      if (n >= 10 && !introSeen) setShowStreakIntro(true);
    });
  }, []);

  // When feed mode changes, wipe the deck and refetch (keep sessionVotes to filter voted posts)
  useEffect(() => {
    loadedFeedKey.current = '';
    setDeck([]);
    setMilestoneHit(null);
    setFriendRevealPostId(null);
    clearLocalStreaks();
    // Force refetch to ensure fresh data
    refetch();
  }, [feedMode]);

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
    console.log(`[FEED] mode=${feedMode} feed.length=${feed.length} isLoading=${isLoading} deck.length=${deck.length}`);
    const newKey = feed.map((f) => f.id).join(',');
    if (newKey && newKey !== loadedFeedKey.current) {
      loadedFeedKey.current = newKey;
      const feedIds = new Set(feed.map((f) => f.id));
      setDeck((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        const voted = sessionVotesRef.current;
        // Only add items we haven't voted on this session
        const freshItems = feed.filter((f) => !existingIds.has(f.id) && !voted.has(f.id));
        // Remove items no longer in the feed that weren't voted this session —
        // they were voted externally (e.g. detail screen). Keep own posts
        // (feed RPC excludes them) and session-voted cards still animating out.
        const retained = prev.filter((item) =>
          feedIds.has(item.id) ||
          voted.has(item.id) ||
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

      // Track total votes for streak unlock
      const newCount = totalVoteCount + 1;
      setTotalVoteCount(newCount);
      AsyncStorage.setItem('total_vote_count', String(newCount));
      if (newCount >= 10 && !streakUnlocked) {
        setStreakUnlocked(true);
        setShowStreakIntro(true);
      }

      const hit = vote === 'rad' ? checkMilestone(item.rad_votes) : null;
      if (hit) setMilestoneHit({ ...hit, postId: item.id });

      // Streak feed: compare vote with friends' votes + update local streaks
      // Streak feed: optimistically update local streak counts
      if (feedMode === 'friends' && item.friend_votes?.length) {
        for (const f of item.friend_votes) {
          updateStreak(f.username, f.vote === vote, f.streak ?? 0);
        }
      }

      // Everyone/Following feed: trigger friend votes check
      if (feedMode !== 'friends') {
        setFriendRevealPostId(item.id);
      }
    },
    [castVote, sessionVotes, feedMode, totalVoteCount, streakUnlocked]
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
    router.push(`/user/${item.user_id}?viewedPost=${item.id}`);
  }, []);

  const handleSwipeUpBlocked = useCallback(() => {
    setJiggleTick((t) => t + 1);
  }, []);

  // Swipe up to dismiss (skip or after voting)
  const handleDismiss = useCallback((item: FeedItem) => {
    setDeck((prev) => prev.filter((c) => c.id !== item.id));
    setMilestoneHit(null);
    setFriendRevealPostId(null);
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

  // Show top 3 from deck. The top card stays even after voting (for animations).
  // Behind it, skip any voted cards so the next card is always fresh.
  const topCard = deck[0];
  const behindCards = deck.slice(1).filter((item) => !sessionVotes.has(item.id)).slice(0, 2);
  const topCards = topCard ? [topCard, ...behindCards] : [];
  const topItem = topCards[0];
  const topItemVoted = topItem ? sessionVotes.has(topItem.id) : false;
  // Reset dismissing flag when top item changes
  useEffect(() => { setDismissing(false); }, [topItem?.id]);

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

      {/* Feed mode toggle */}
      <View style={styles.feedToggleRow}>
        <TouchableOpacity
          style={[styles.feedToggle, feedMode === 'default' && styles.feedToggleActive]}
          onPress={() => setFeedMode('default')}
          activeOpacity={0.7}
        >
          <Ionicons name="globe" size={14} color={feedMode === 'default' ? colors.textPrimary : colors.textSecondary} />
          <Text style={[styles.feedToggleText, feedMode === 'default' && styles.feedToggleTextActive]}>Everyone</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedToggle, feedMode === 'friendsPosts' && styles.feedToggleActive]}
          onPress={() => setFeedMode('friendsPosts')}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={14} color={feedMode === 'friendsPosts' ? colors.textPrimary : colors.textSecondary} />
          <Text style={[styles.feedToggleText, feedMode === 'friendsPosts' && styles.feedToggleTextActive]}>Following</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedToggle, feedMode === 'friends' && styles.feedToggleActive]}
          onPress={() => {
            if (streakUnlocked && showStreakIntro) {
              setShowStreakIntro(false);
              AsyncStorage.setItem('streak_intro_seen', '1');
            }
            setFeedMode('friends');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="flash" size={14} color={feedMode === 'friends' ? '#FFD700' : colors.textSecondary} />
          <Text style={[styles.feedToggleText, feedMode === 'friends' && styles.feedToggleTextActive]}>Streak</Text>
        </TouchableOpacity>
      </View>

      {/* Card stack */}
      <View style={styles.cardArea} onLayout={(e) => setCardAreaHeight(e.nativeEvent.layout.height)}>
        {feedMode === 'friends' && !streakUnlocked ? (
          <StreakLockedState votesNeeded={10 - totalVoteCount} onGoVote={() => setFeedMode('default')} />
        ) : deck.length === 0 && !isLoading && !isRefetching && feed.length === 0 ? (
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
                  userVote={sessionVotes.get(item.id) ?? (index === 0 && topItemExternallyVoted ? (topItemDbVote ?? externalVotes.get(item.id) ?? null) : null)}
                  isFavorited={favoriteIds.has(item.id)}
                  isFollowing={followingIds.has(item.user_id)}
                  isOwnPost={currentUser?.id === item.user_id}
                  isAlreadyVoted={index === 0 && topItemExternallyVoted}
                  onDismiss={() => handleDismiss(item)}
                  onDismissStart={index === 0 ? () => { setDismissing(true); setMilestoneHit(null); } : undefined}
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
                  hasMilestone={index === 0 && milestoneHit?.postId === item.id}
                  friendVotes={index === 0 ? (feedMode === 'friends' ? item.friend_votes?.map((f) => ({ ...f, streak: localStreaks.get(f.username) ?? f.streak })) : friendRevealPostId === item.id ? friendVotesOnPost : undefined) : undefined}
                  autoDismissDelay={index === 0 && feedMode === 'friends' ? 1200 + (item.friend_votes?.length ?? 0) * 250 : undefined}
                />
              );
            })
          }
          <MilestoneBurst hit={milestoneHit?.postId === topItem?.id ? milestoneHit : null} />
        </>)}
      </View>

      {/* Action buttons / already-voted / milestone state */}
      {topItem && (
        milestoneHit?.postId === topItem.id && !dismissing ? (
          <GradientMessageRow message={milestoneHit.message} />
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
      {showStreakIntro && feedMode === 'friends' && (
        <View style={styles.introOverlay}>
          <View style={styles.introCard}>
            <Ionicons name="flash" size={40} color="#FFD700" />
            <Text style={styles.introTitle}>Streak Mode Unlocked!</Text>
            <Text style={styles.introBody}>
              See posts your friends already voted on. Vote and find out if you agree — build streaks with friends who think like you!
            </Text>
            <TouchableOpacity
              style={styles.introButton}
              onPress={() => {
                setShowStreakIntro(false);
                AsyncStorage.setItem('streak_intro_seen', '1');
              }}
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
          {/* Star drip particles */}
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
        <Text style={styles.lockedButtonText}>Go vote</Text>
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
