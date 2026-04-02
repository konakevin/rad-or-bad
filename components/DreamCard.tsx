/**
 * DreamCard — shared full-screen image card.
 * - Double-tap to like
 * - Swipe left to visit profile (disable via prop)
 * - Long press to save image
 * - Pinch to zoom
 */

import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, withSpring, withRepeat, withDelay, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, ui } from '@/constants/theme';
import { handleImageLongPress } from '@/lib/imageLongPress';
import { Toast } from '@/components/Toast';
import { useAuthStore } from '@/store/auth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DreamPostItem {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  username: string;
  avatar_url: string | null;
  is_ai_generated: boolean;
  ai_prompt?: string | null;
  created_at: string;
  comment_count?: number;
  like_count?: number;
  from_wish?: string | null;
  recipe_id?: string | null;
  twin_count?: number;
  fuse_count?: number;
  twin_of?: string | null;
  fuse_of?: string | null;
}

interface Props {
  item: DreamPostItem;
  bottomPadding: number;
  isLiked: boolean;
  onLike: () => void;
  onToggleLike: () => void;
  onComment?: () => void;
  onShare?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  disableSwipeToProfile?: boolean;
  onDelete?: () => void;
  onFuse?: () => void;
  onFamily?: () => void;
}

/** A single sparkle particle that floats along the border edge */
// Seeded random so sparkle positions are stable per index
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function getSparklePosition(index: number, total: number, seed: number) {
  const perimeter = 2 * (SCREEN_WIDTH + SCREEN_HEIGHT);
  const step = perimeter / total;
  const pos = (step * index + seededRandom(index + seed + 7) * step * 0.6) % perimeter;
  const jitter = seededRandom(index + seed + 13) * 14;

  if (pos < SCREEN_WIDTH) {
    return { left: pos, top: jitter };
  } else if (pos < SCREEN_WIDTH + SCREEN_HEIGHT) {
    return { left: SCREEN_WIDTH - jitter, top: pos - SCREEN_WIDTH };
  } else if (pos < 2 * SCREEN_WIDTH + SCREEN_HEIGHT) {
    return { left: 2 * SCREEN_WIDTH + SCREEN_HEIGHT - pos, top: SCREEN_HEIGHT - jitter };
  } else {
    return { left: jitter, top: perimeter - pos };
  }
}

function WishSparkle({ index, total, seed }: { index: number; total: number; seed: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  const { left, top } = getSparklePosition(index, total, seed);
  const delay = seededRandom(index + seed + 3) * 5000;
  const duration = 2500 + seededRandom(index + seed + 11) * 2500;
  const size = 3 + seededRandom(index + 17) * 4;

  useEffect(() => {
    opacity.value = withDelay(delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration * 0.3 }),
          withTiming(0, { duration: duration * 0.7 }),
        ),
        -1, true,
      ),
    );
    scale.value = withDelay(delay,
      withRepeat(
        withSequence(
          withTiming(1.5, { duration: duration * 0.3 }),
          withTiming(0.3, { duration: duration * 0.7 }),
        ),
        -1, true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const color = index % 3 === 0 ? 'rgba(255,223,150,0.95)'
    : index % 3 === 1 ? 'rgba(196,181,253,0.95)'
    : 'rgba(255,255,255,0.9)';

  return (
    <Animated.View style={[{
      position: 'absolute', left, top,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
      shadowColor: color, shadowRadius: 6, shadowOpacity: 1,
      shadowOffset: { width: 0, height: 0 },
    }, style]} />
  );
}

export function DreamCard({ item, bottomPadding, isLiked, onLike, onToggleLike, onComment, onShare, isSaved, onToggleSave, disableSwipeToProfile, onDelete, onFuse, onFamily }: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const isOwnPost = currentUser?.id === item.user_id;
  const lastTap = useRef(0);
  const swiped = useRef(false);

  // Wish fairy dust — shimmering hazy border with sparkle particles
  const isWish = !!item.from_wish;
  const hazeOpacity = useSharedValue(0.3);
  useEffect(() => {
    if (isWish) {
      hazeOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 2000 }),
          withTiming(0.3, { duration: 2000 }),
        ),
        -1, true,
      );
    }
  }, [isWish]);
  const hazeStyle = useAnimatedStyle(() => ({
    opacity: hazeOpacity.value,
  }));

  // Heart burst
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  // Pinch to zoom — simple focal point approach
  const zoomScale = useSharedValue(1);
  const zoomTransX = useSharedValue(0);
  const zoomTransY = useSharedValue(0);
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: zoomTransX.value },
      { translateY: zoomTransY.value },
      { scale: zoomScale.value },
    ],
  }));

  function goToProfile() {
    if (swiped.current) return;
    swiped.current = true;
    if (isOwnPost) {
      router.navigate('/(tabs)/profile');
    } else {
      router.push(`/user/${item.user_id}?viewedPost=${item.id}`);
    }
    setTimeout(() => { swiped.current = false; }, 500);
  }

  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onToggleLike();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (isLiked) { lastTap.current = 0; return; }
      heartScale.value = 0;
      heartOpacity.value = 1;
      heartScale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withTiming(1, { duration: 100 }),
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 200 }),
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 200 }),
      );
    }
    lastTap.current = now;
  }

  function handleLongPress() {
    handleImageLongPress({ id: item.id, imageUrl: item.image_url, onDelete });
  }

  // Gestures
  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-15, 15])
    .enabled(!disableSwipeToProfile)
    .onEnd((e) => {
      if (e.translationX < -25 || e.velocityX < -200) {
        runOnJS(goToProfile)();
      }
    });

  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      focalX.value = e.focalX - SCREEN_WIDTH / 2;
      focalY.value = e.focalY - SCREEN_HEIGHT / 2;
      startFocalX.value = e.focalX;
      startFocalY.value = e.focalY;
    })
    .onUpdate((e) => {
      const s = Math.max(1, Math.min(5, e.scale));
      zoomScale.value = s;
      const panX = e.focalX - startFocalX.value;
      const panY = e.focalY - startFocalY.value;
      zoomTransX.value = focalX.value * (1 - s) + panX;
      zoomTransY.value = focalY.value * (1 - s) + panY;
    })
    .onEnd(() => {
      zoomScale.value = withTiming(1, { duration: 200 });
      zoomTransX.value = withTiming(0, { duration: 200 });
      zoomTransY.value = withTiming(0, { duration: 200 });
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={s.card}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDoubleTap}
          onLongPress={handleLongPress}
          delayLongPress={500}
        >
          <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
            <Image source={{ uri: item.image_url }} style={s.fullImage} contentFit="cover" cachePolicy="memory-disk" />
          </Animated.View>

          {/* Wish shimmer border */}
          {isWish && (
            <View style={s.wishGlow} pointerEvents="none">
              {/* Shimmering hazy edge glow */}
              <Animated.View style={[StyleSheet.absoluteFill, hazeStyle]}>
                <LinearGradient
                  colors={['rgba(196,181,253,0.45)', 'rgba(255,223,150,0.2)', 'transparent']}
                  style={s.wishEdgeTop}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(255,223,150,0.2)', 'rgba(196,181,253,0.45)']}
                  style={s.wishEdgeBottom}
                />
                <LinearGradient
                  colors={['rgba(196,181,253,0.4)', 'rgba(255,223,150,0.15)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.wishEdgeLeft}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(255,223,150,0.15)', 'rgba(196,181,253,0.4)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.wishEdgeRight}
                />
              </Animated.View>
              {/* Sparkle particles evenly around the border */}
              {Array.from({ length: 36 }).map((_, i) => (
                <WishSparkle key={i} index={i} total={36} seed={item.id.charCodeAt(0) + item.id.charCodeAt(1) * 7} />
              ))}
            </View>
          )}

          {/* Heart burst */}
          <Animated.View style={[s.heartBurst, heartStyle]} pointerEvents="none">
            <Ionicons name="heart" size={80} color="#FFFFFF" />
          </Animated.View>

          {/* Post info */}
          <View style={[s.postInfo, { paddingBottom: bottomPadding }]}>
            <TouchableOpacity
              style={s.usernameRow}
              onPress={() => isOwnPost ? router.navigate('/(tabs)/profile') : router.push(`/user/${item.user_id}?viewedPost=${item.id}`)}
              activeOpacity={0.7}
            >
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarText}>{(item.username || '?')[0].toUpperCase()}</Text>
                </View>
              )}
              <Text style={s.username}>{item.username ?? 'dreamer'}</Text>
            </TouchableOpacity>
            {item.from_wish && (
              <TouchableOpacity
                onPress={() => Toast.show(`Wished: "${item.from_wish}"`, 'color-wand-outline')}
                activeOpacity={0.7}
                hitSlop={8}
              >
                <Ionicons name="color-wand-outline" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Side actions */}
          <View style={[s.sideActions, { bottom: bottomPadding + 10 }]}>
            <TouchableOpacity style={ui.sideButton} onPress={onToggleLike} activeOpacity={0.7}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={28} color={isLiked ? colors.like : '#FFFFFF'} />
              {(item.like_count ?? 0) > 0 && (
                <Text style={ui.sideCount}>{item.like_count}</Text>
              )}
            </TouchableOpacity>
            {onComment && (
              <TouchableOpacity style={ui.sideButton} onPress={onComment} activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
                {(item.comment_count ?? 0) > 0 && (
                  <Text style={ui.sideCount}>{item.comment_count}</Text>
                )}
              </TouchableOpacity>
            )}
            {onToggleSave && (
              <TouchableOpacity style={ui.sideButton} onPress={onToggleSave} activeOpacity={0.7}>
                <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={ui.sideButton} onPress={onShare ?? (() => router.push(`/sharePost?uploadId=${item.id}`))} activeOpacity={0.7}>
              <Ionicons name="paper-plane-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {item.is_ai_generated && onFamily && (
              <TouchableOpacity style={ui.sideButton} onPress={onFamily} activeOpacity={0.7}>
                <Ionicons name="albums-outline" size={24} color="#FFFFFF" />
                {((item.twin_count ?? 0) + (item.fuse_count ?? 0)) > 0 && (
                  <Text style={ui.sideCount}>{(item.twin_count ?? 0) + (item.fuse_count ?? 0)}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  card: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' },
  fullImage: { ...StyleSheet.absoluteFillObject },
  wishGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  wishEdgeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  wishEdgeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  wishEdgeLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 30, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  wishEdgeRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 30, borderTopRightRadius: 20, borderBottomRightRadius: 20 },
  heartBurst: { position: 'absolute', top: '50%', left: '50%', marginTop: -40, marginLeft: -40 },
  sideActions: { position: 'absolute', right: 12, alignItems: 'center', gap: 20 },
  postInfo: { position: 'absolute', bottom: 0, left: 0, right: 70, paddingHorizontal: 16, gap: 8 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  username: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
});
