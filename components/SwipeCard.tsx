import { Dimensions, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GestureDetector, Gesture, TouchableOpacity, Pressable } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import type { FeedItem, FriendVote } from '@/hooks/useFeed';
import { GradientUsername } from '@/components/GradientUsername';
import { getRating } from '@/lib/getRating';
import { formatCount } from '@/lib/formatCount';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/constants/categories';
import { animateScoreIn } from '@/lib/scoreAnimation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH;

function needsBlurBackground(mediaWidth: number | null, mediaHeight: number | null, cardHeight: number): boolean {
  if (!mediaWidth || !mediaHeight) return false;
  return (mediaWidth / mediaHeight) > (CARD_WIDTH / cardHeight);
}
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.18;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

interface SwipeCardProps {
  item: FeedItem;
  userVote: 'rad' | 'bad' | null;
  isFavorited: boolean;
  isFollowing: boolean;
  isOwnPost: boolean;
  isAlreadyVoted?: boolean;
  onDismiss: () => void;
  onDismissStart?: () => void;
  onFavorite: () => void;
  onFollow: () => void;
  onUserPress: () => void;
  onSwipeUpBlocked?: () => void;
  hideRank?: boolean;
  isTop: boolean;
  index: number;
  containerHeight: number;
  showSwipeHint: boolean;
  swipeEnabled?: boolean;
  hasMilestone?: boolean;
  friendVotes?: FriendVote[];
  autoDismissDelay?: number | null;
}

function CategoryPill({ category }: { category: string }) {
  const label = CATEGORY_LABELS[category] ?? category;
  const color = CATEGORY_COLORS[category] ?? '#FFFFFF';
  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/top?category=${category}`)}
      hitSlop={8}
      style={[styles.categoryPill, { backgroundColor: `${color}26`, borderColor: `${color}66` }]}
    >
      <Text style={[styles.categoryPillText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function FriendAvatarBubble({ friend, userVote, index }: {
  friend: FriendVote;
  userVote: 'rad' | 'bad' | null;
  index: number;
}) {
  const hasVoted = userVote !== null;
  const isMatch = hasVoted && friend.vote === userVote;
  const streak = friend.streak ?? 0;

  const borderColor = !hasVoted ? 'rgba(255,255,255,0.4)' : isMatch ? 'rgba(76, 170, 100, 1)' : 'rgba(180, 120, 120, 1)';

  const initial = friend.username[0]?.toUpperCase() ?? '?';

  return (
    <View style={styles.friendBubbleWrap}>
      <View style={[styles.friendBubble, { borderColor }]}>
        {friend.avatar_url ? (
          <Image source={{ uri: friend.avatar_url }} style={styles.friendBubbleImage} />
        ) : (
          <View style={styles.friendBubbleInner}>
            <Text style={styles.friendBubbleInitial}>{initial}</Text>
          </View>
        )}
        {/* Check / X overlay */}
        {hasVoted && (
          <View style={styles.friendBubbleIconOverlay}>
            <View style={[styles.friendBubbleIconBg, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
              <Ionicons
                name={isMatch ? 'checkmark' : 'close'}
                size={isMatch ? 28 : 32}
                color={isMatch ? '#6ECF8E' : '#CC9999'}
              />
            </View>
          </View>
        )}
      </View>

      {/* Streak count badge — only on matched */}
      {hasVoted && isMatch && streak > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakBadgeText}>{streak}</Text>
        </View>
      )}
    </View>
  );
}

export function SwipeCard({ item, userVote, isFavorited, isFollowing, isOwnPost, isAlreadyVoted = false, onDismiss, onDismissStart, onFavorite, onFollow, onUserPress, onSwipeUpBlocked, hideRank = false, isTop, index, containerHeight, showSwipeHint, swipeEnabled = true, hasMilestone = false, friendVotes, autoDismissDelay }: SwipeCardProps) {
  const cardHeight = containerHeight > 0 ? containerHeight : SCREEN_HEIGHT * 0.65;
  const isVideo = item.media_type === 'video';
  const [muted, setMuted] = useState(true);

  // Video player — only created for video posts
  const videoPlayer = useVideoPlayer(isVideo ? item.image_url : null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // Play/pause based on whether this card is on top
  useEffect(() => {
    if (!isVideo) return;
    if (isTop) {
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  }, [isTop, isVideo]);

  // Sync muted state
  useEffect(() => {
    if (!isVideo) return;
    videoPlayer.muted = muted;
  }, [muted, isVideo]);

  // Optimistically include the user's own vote in the score calculation
  const rad   = item.rad_votes + (userVote === 'rad' ? 1 : 0);
  const total = item.total_votes + (userVote !== null ? 1 : 0);
  const rating = userVote !== null ? getRating(rad, total) : null;
  const [catsExpanded, setCatsExpanded] = useState(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const canSwipeUp = useSharedValue(userVote !== null || isOwnPost || isAlreadyVoted);
  useEffect(() => {
    canSwipeUp.value = userVote !== null || isOwnPost || isAlreadyVoted;
  }, [userVote, isOwnPost, isAlreadyVoted]);
  const scoreOpacity = useSharedValue(0);
  const scoreScale = useSharedValue(0.4);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTranslateY = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

  // Pop score badge in when the user votes, then auto-dismiss after 0.9s.
  // Skipped for externally-voted cards — they stay until the user swipes up.
  useEffect(() => {
    if (userVote !== null) {
      if (isAlreadyVoted) {
        // Already voted externally — show score instantly, no dismiss
        scoreOpacity.value = 1;
        scoreScale.value = 1;
      } else {
        animateScoreIn(scoreOpacity, scoreScale);
        // autoDismissDelay: number = custom delay, null = no auto-dismiss, undefined = default (430ms)
        const delay = autoDismissDelay !== undefined ? autoDismissDelay : (hasMilestone ? null : 430);
        if (delay !== null) {
          dismissTimer.current = setTimeout(() => {
            translateY.value = withTiming(-SCREEN_HEIGHT * 1.3, { duration: 260 }, () => {
              runOnJS(onDismiss)();
            });
          }, delay);
        }
      }
    }
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [userVote]);

  // Pulse chevron up twice then fade out
  useEffect(() => {
    if (!showSwipeHint) return;
    hintOpacity.value = withTiming(1, { duration: 300 });
    hintTranslateY.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 400 }),
        withTiming(0, { duration: 400 }),
      ),
      2,
      false,
      () => {
        hintOpacity.value = withTiming(0, { duration: 400 });
      }
    );
  }, [showSwipeHint]);

  function cancelDismissTimer() {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }

  const gesture = Gesture.Pan()
    .enabled(isTop && swipeEnabled)
    .onBegin(() => {
      runOnJS(cancelDismissTimer)();
    })
    .onUpdate((e) => {
      if (!canSwipeUp.value) return;
      if (e.translationY < 0) {
        // Upward — left lean is free, rightward drift is heavily resisted
        translateX.value = e.translationX < 0 ? e.translationX : e.translationX * 0.08;
        translateY.value = e.translationY;
      } else {
        // Downward pull — resist everything
        translateX.value = e.translationX * 0.08;
        translateY.value = e.translationY * 0.15;
      }
    })
    .onEnd((e) => {
      const swipedUp = e.translationY < -DISMISS_THRESHOLD && canSwipeUp.value;
      if (swipedUp) {
        if (onDismissStart) runOnJS(onDismissStart)();
        // Only carry leftward lean on exit, never rightward
        const exitX = Math.min(e.translationX, 0) * 3;
        translateX.value = withTiming(exitX, { duration: 300 });
        translateY.value = withTiming(-SCREEN_HEIGHT * 1.3, { duration: 300 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        // User tried to swipe up without voting — nudge the vote buttons
        if (e.translationY < -60 && !canSwipeUp.value && onSwipeUpBlocked) {
          runOnJS(onSwipeUpBlocked)();
        }
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const scoreStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
    transform: [{ scale: scoreScale.value }],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
    transform: [{ translateY: hintTranslateY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, { height: cardHeight }, cardStyle]}>
        {(() => {
          const blurBg = needsBlurBackground(item.width, item.height, cardHeight);
          return (
            <>
              {isVideo ? (
                <VideoView
                  player={videoPlayer}
                  style={styles.image}
                  contentFit={blurBg ? 'contain' : 'cover'}
                  nativeControls={false}
                />
              ) : (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.image}
                  contentFit={blurBg ? 'contain' : 'cover'}
                  transition={200}
                />
              )}
            </>
          );
        })()}

        {/* Score badge — top right, fades in after voting */}
        {rating !== null && (
          <Animated.View style={[styles.ratingBadge, scoreStyle]}>
            <MaskedView maskElement={
              <Text style={styles.ratingPercent}>{rating.percent}%</Text>
            }>
              <LinearGradient
                colors={rating.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.ratingPercent, styles.invisible]}>{rating.percent}%</Text>
              </LinearGradient>
            </MaskedView>
          </Animated.View>
        )}

        {/* Friend avatar bubbles — show before vote (faces), animate to center on match after */}
        {friendVotes && friendVotes.length > 0 && (
          <View style={styles.friendAvatarGrid}>
            {friendVotes.slice(0, 5).map((friend, i) => (
              <FriendAvatarBubble key={friend.username} friend={friend} userVote={userVote} index={i} />
            ))}
          </View>
        )}

        {/* Mute toggle for videos */}
        {isVideo && (
          <TouchableOpacity
            style={styles.muteButton}
            onPress={() => setMuted((m) => !m)}
            activeOpacity={0.7}
            hitSlop={12}
          >
            <Ionicons
              name={muted ? 'volume-mute' : 'volume-high'}
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}

        {/* Card info — gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
          style={styles.infoContainer}
        >
          <View style={styles.infoBlock}>
            {/* Row 1: username | follow */}
            <View style={styles.userRow}>
              <Pressable onPress={onUserPress} hitSlop={8}>
                <GradientUsername username={item.username} rank={item.user_rank} style={styles.username} photoOverlay hideRank={hideRank} avatarUrl={item.avatar_url} showAvatar avatarSize={24} />
              </Pressable>
              {!isOwnPost && (
                <Pressable
                  onPress={onFollow}
                  hitSlop={8}
                  style={[styles.followPill, isFollowing && styles.followingPill]}
                >
                  <Text style={[styles.followPillText, isFollowing && styles.followingPillText]}>
                    {isFollowing ? 'Following' : '+ Follow'}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Row 2: caption */}
            {item.caption ? (
              <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
            ) : null}

            {/* Row 3: category · star count · save */}
            {(() => {
              const cats = item.categories ?? [];
              const visible = cats.slice(0, 2);
              const hidden = cats.slice(2);
              return (
                <View>
                  <View style={styles.metaRow}>
                    <View style={styles.metaLeft}>
                      {visible.map((cat) => (
                        <CategoryPill key={cat} category={cat} />
                      ))}
                      {hidden.length > 0 && (
                        <Pressable onPress={() => setCatsExpanded((v) => !v)} hitSlop={8} style={styles.plusNPill}>
                          <Text style={styles.plusNText}>{catsExpanded ? '−' : `+${hidden.length}`}</Text>
                        </Pressable>
                      )}
                      {total > 0 && (
                        <>
                          <Text style={styles.metaDot}>·</Text>
                          <Ionicons name="star" size={12} color="rgba(255,255,255,0.65)" />
                          <Text style={styles.metaText}>{formatCount(total)}</Text>
                        </>
                      )}
                    </View>
                    {!isOwnPost && (
                      <TouchableOpacity onPress={onFavorite} hitSlop={12} style={styles.saveButton} activeOpacity={0.6}>
                        <Ionicons
                          name={isFavorited ? 'bookmark' : 'bookmark-outline'}
                          size={22}
                          color={isFavorited ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  {catsExpanded && hidden.length > 0 && (
                    <View style={styles.expandedCats}>
                      {hidden.map((cat) => (
                        <CategoryPill key={cat} category={cat} />
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        </LinearGradient>

        {/* Swipe-up chevron pill for already-voted / milestone / streak match cards */}
        {(isAlreadyVoted || hasMilestone) && <SwipeUpChevron />}

        {/* One-time swipe-up hint for new users */}
        <Animated.View style={[styles.hintContainer, hintStyle]} pointerEvents="none">
          <View style={styles.hintPill}>
            <Ionicons name="chevron-up" size={28} color="#FFFFFF" />
            <Text style={styles.hintText}>Swipe up to skip</Text>
          </View>
        </Animated.View>

      </Animated.View>
    </GestureDetector>
  );
}

function SwipeUpChevron() {
  const chevronY = useSharedValue(0);

  useEffect(() => {
    chevronY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 500 }),
        withTiming(0, { duration: 500 }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: chevronY.value }],
  }));

  return (
    <Animated.View style={[styles.chevronContainer, animStyle]} pointerEvents="none">
      <View style={styles.chevronPill}>
        <Ionicons name="chevron-up" size={32} color="#FFFFFF" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  saveButton: {
    padding: 4,
  },
  muteButton: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  friendAvatarGrid: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'column',
    gap: 4,
    overflow: 'visible',
    zIndex: 50,
  },
  friendBubbleWrap: {
    position: 'relative',
  },
  friendBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },
  friendBubbleInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendBubbleImage: {
    width: '100%',
    height: '100%',
  },
  friendBubbleInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  friendBubbleIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendBubbleIconBg: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#000000',
  },
  streakBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  ratingBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ratingPercent: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },
  ratingLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  invisible: {
    opacity: 0,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  infoBlock: {
    gap: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  username: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  followPill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 5,
  },
  followingPill: {
    borderColor: 'rgba(255,255,255,0.15)',
  },
  followPillText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  followingPillText: {
    color: 'rgba(255,255,255,0.3)',
  },
  caption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  plusNPill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  plusNText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  expandedCats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  metaDot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
  },
  categoryPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintPill: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  hintText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chevronContainer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  chevronPill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
  },
});
