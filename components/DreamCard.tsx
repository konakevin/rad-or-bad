/**
 * DreamCard — shared full-screen image card.
 * - Double-tap to like
 * - Swipe left to visit profile (disable via prop)
 * - Long press to save image
 * - Pinch to zoom
 */

import { useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, withSpring, runOnJS,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system/next';
import { colors, ui } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DreamPostItem {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  username: string;
  avatar_url: string | null;
  is_ai_generated: boolean;
  created_at: string;
  comment_count?: number;
}

interface Props {
  item: DreamPostItem;
  bottomPadding: number;
  isLiked: boolean;
  onLike: () => void;
  onToggleLike: () => void;
  onComment?: () => void;
  onShare?: () => void;
  disableSwipeToProfile?: boolean;
}

export function DreamCard({ item, bottomPadding, isLiked, onLike, onToggleLike, onComment, onShare, disableSwipeToProfile }: Props) {
  const lastTap = useRef(0);
  const swiped = useRef(false);

  // Heart burst
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  // Pinch to zoom
  const pinchScale = useSharedValue(1);
  const pinchFocalX = useSharedValue(0);
  const pinchFocalY = useSharedValue(0);
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pinchFocalX.value },
      { translateY: pinchFocalY.value },
      { scale: pinchScale.value },
      { translateX: -pinchFocalX.value },
      { translateY: -pinchFocalY.value },
    ],
  }));

  function goToProfile() {
    if (swiped.current) return;
    swiped.current = true;
    router.push(`/user/${item.user_id}`);
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

  async function handleLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Save Image', 'Save this dream to your photos?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: async () => {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow access to save images.');
            return;
          }
          try {
            const file = new File(Paths.cache, `${item.id}.jpg`);
            await (file as unknown as { downloadAsync: (url: string) => Promise<void> }).downloadAsync(item.image_url);
            await MediaLibrary.saveToLibraryAsync(file.uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        },
      },
    ]);
  }

  // Gestures
  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-20, 20])
    .enabled(!disableSwipeToProfile)
    .onEnd((e) => {
      if (e.translationX < -40 || e.velocityX < -300) {
        runOnJS(goToProfile)();
      }
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      pinchScale.value = Math.max(1, Math.min(4, e.scale));
      pinchFocalX.value = e.focalX - SCREEN_WIDTH / 2;
      pinchFocalY.value = e.focalY - SCREEN_HEIGHT / 2;
    })
    .onEnd(() => {
      pinchScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      pinchFocalX.value = withSpring(0, { damping: 15, stiffness: 150 });
      pinchFocalY.value = withSpring(0, { damping: 15, stiffness: 150 });
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

          {/* Heart burst */}
          <Animated.View style={[s.heartBurst, heartStyle]} pointerEvents="none">
            <Ionicons name="heart" size={80} color="#FFFFFF" />
          </Animated.View>

          {/* Post info */}
          <View style={[s.postInfo, { paddingBottom: bottomPadding }]}>
            <TouchableOpacity
              style={s.usernameRow}
              onPress={() => router.push(`/user/${item.user_id}`)}
              activeOpacity={0.7}
            >
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarText}>{item.username[0].toUpperCase()}</Text>
                </View>
              )}
              <Text style={s.username}>{item.username}</Text>
              {item.is_ai_generated && <Ionicons name="sparkles" size={14} color={colors.accent} />}
            </TouchableOpacity>
            {item.caption && <Text style={s.caption} numberOfLines={2}>{item.caption}</Text>}
          </View>

          {/* Side actions */}
          <View style={[s.sideActions, { bottom: bottomPadding + 10 }]}>
            <TouchableOpacity style={ui.sideButton} onPress={onToggleLike} activeOpacity={0.7}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={28} color={isLiked ? colors.like : '#FFFFFF'} />
            </TouchableOpacity>
            {onComment && (
              <TouchableOpacity style={ui.sideButton} onPress={onComment} activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
                {(item.comment_count ?? 0) > 0 && (
                  <Text style={ui.sideCount}>{item.comment_count}</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={ui.sideButton} onPress={onShare ?? (() => router.push(`/sharePost?uploadId=${item.id}`))} activeOpacity={0.7}>
              <Ionicons name="paper-plane-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  card: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#000' },
  fullImage: { ...StyleSheet.absoluteFillObject },
  heartBurst: { position: 'absolute', top: '50%', left: '50%', marginTop: -40, marginLeft: -40 },
  sideActions: { position: 'absolute', right: 12, alignItems: 'center', gap: 20 },
  postInfo: { position: 'absolute', bottom: 0, left: 0, right: 70, paddingHorizontal: 16, gap: 8 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  username: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  caption: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
});
