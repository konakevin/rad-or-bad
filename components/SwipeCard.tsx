import { Dimensions, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Image } from 'expo-image';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import type { FeedItem } from '@/hooks/useFeed';
import { getRating } from '@/lib/getRating';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.18;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

const CATEGORY_LABELS: Record<string, string> = {
  people:  '👤 People',
  animals: '🐾 Animals',
  food:    '🍔 Food',
  nature:  '🌿 Nature',
  memes:   '😂 Memes',
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
}

export function SwipeCard({ item, userVote, isFavorited, isFollowing, isOwnPost, onDismiss, onFavorite, onFollow, onUserPress, isTop, index, containerHeight }: SwipeCardProps) {
  const cardHeight = containerHeight > 0 ? containerHeight : SCREEN_HEIGHT * 0.65;
  // Optimistically include the user's own vote in the score calculation
  const rad   = item.rad_votes + (userVote === 'rad' ? 1 : 0);
  const total = item.total_votes + (userVote !== null ? 1 : 0);
  const rating = userVote !== null ? getRating(rad, total) : null;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scoreOpacity = useSharedValue(0);

  // Fade score badge in when the user votes
  useEffect(() => {
    if (userVote !== null) {
      scoreOpacity.value = withTiming(1, { duration: 350 });
    }
  }, [userVote]);

  const gesture = Gesture.Pan()
    .enabled(isTop)
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

        {/* Bookmark badge — top left */}
        <Pressable
          style={styles.starBadge}
          onPress={onFavorite}
          hitSlop={12}
        >
          <Ionicons
            name={isFavorited ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isFavorited ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
          />
        </Pressable>

        {/* Score badge — top right, fades in after voting with optimistic score */}
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

        {/* Card info */}
        <View style={styles.infoContainer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {CATEGORY_LABELS[item.category] ?? item.category}
            </Text>
          </View>
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
          {total > 0 && (
            <Text style={styles.voteCount}>{total} ratings</Text>
          )}
          {item.caption ? (
            <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  starBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },
  ratingBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  ratingPercent: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
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
    padding: 16,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  voteCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  followPill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  followingPill: {
    borderColor: 'rgba(255,255,255,0.2)',
  },
  followPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  followingPillText: {
    color: 'rgba(255,255,255,0.4)',
  },
  caption: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
