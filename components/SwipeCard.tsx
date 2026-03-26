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
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useEffect, useRef } from 'react';
import { Image } from 'expo-image';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import type { FeedItem } from '@/hooks/useFeed';
import { getRating } from '@/lib/getRating';
import { formatCount } from '@/lib/formatCount';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH;
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.18;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

const CATEGORY_LABELS: Record<string, string> = {
  people:  'People',
  animals: 'Animals',
  food:    'Food',
  nature:  'Nature',
  memes:   'Memes',
};

const CATEGORY_COLORS: Record<string, string> = {
  people:  '#6699EE',
  animals: '#DDAA66',
  food:    '#DD7766',
  nature:  '#77CC88',
  memes:   '#BB88EE',
};

interface SwipeCardProps {
  item: FeedItem;
  userVote: 'rad' | 'bad' | null;
  isFavorited: boolean;
  isFollowing: boolean;
  isOwnPost: boolean;
  onDismiss: () => void;
  onFavorite: () => void;
  onFollow: () => void;
  onUserPress: () => void;
  isTop: boolean;
  index: number;
  containerHeight: number;
  showSwipeHint: boolean;
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

export function SwipeCard({ item, userVote, isFavorited, isFollowing, isOwnPost, onDismiss, onFavorite, onFollow, onUserPress, isTop, index, containerHeight, showSwipeHint }: SwipeCardProps) {
  const cardHeight = containerHeight > 0 ? containerHeight : SCREEN_HEIGHT * 0.65;
  // Optimistically include the user's own vote in the score calculation
  const rad   = item.rad_votes + (userVote === 'rad' ? 1 : 0);
  const total = item.total_votes + (userVote !== null ? 1 : 0);
  const rating = userVote !== null ? getRating(rad, total) : null;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scoreOpacity = useSharedValue(0);
  const scoreScale = useSharedValue(0.4);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTranslateY = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

  // Pop score badge in when the user votes, then auto-dismiss after 0.9s
  useEffect(() => {
    if (userVote !== null) {
      scoreOpacity.value = withTiming(1, { duration: 80 });
      scoreScale.value = withSpring(1, { damping: 31, stiffness: 400 });
      dismissTimer.current = setTimeout(() => {
        translateY.value = withTiming(-SCREEN_HEIGHT * 1.3, { duration: 300 }, () => {
          runOnJS(onDismiss)();
        });
      }, 900);
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
    .enabled(isTop)
    .onBegin(() => {
      runOnJS(cancelDismissTimer)();
    })
    .onUpdate((e) => {
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
      const swipedUp = e.translationY < -DISMISS_THRESHOLD;
      if (swipedUp) {
        // Only carry leftward lean on exit, never rightward
        const exitX = Math.min(e.translationX, 0) * 3;
        translateX.value = withTiming(exitX, { duration: 300 });
        translateY.value = withTiming(-SCREEN_HEIGHT * 1.3, { duration: 300 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const scale = isTop
      ? 1
      : interpolate(index, [1, 3], [0.97, 0.93], Extrapolation.CLAMP);
    const translateYOffset = isTop ? 0 : index * 6;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + translateYOffset },
        { scale },
      ],
    };
  });

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
        <Image
          source={{ uri: item.image_url }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />

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

        {/* Card info — gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
          style={styles.infoContainer}
        >
          <View style={styles.infoBlock}>
            {/* Row 1: username | follow */}
            <View style={styles.userRow}>
              <Pressable onPress={onUserPress} hitSlop={8}>
                <Text style={styles.username}>@{item.username}</Text>
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
            <View style={styles.metaRow}>
              <View style={styles.metaLeft}>
                <CategoryPill category={item.category} />
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
          </View>
        </LinearGradient>

        {/* Swipe-up hint chevron */}
        <Animated.View style={[styles.hintContainer, hintStyle]} pointerEvents="none">
          <Ionicons name="chevron-up" size={28} color="rgba(255,255,255,0.85)" />
          <Text style={styles.hintText}>Swipe up to skip</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  saveButton: {
    padding: 4,
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
    gap: 4,
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
