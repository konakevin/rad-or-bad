/**
 * DreamReveal — shared reveal carousel for dream results.
 * Used by both the Dream tab and Dream Like This screen.
 *
 * Features: horizontal carousel, dot indicators, dismiss badges,
 * fullscreen preview with pinch-to-zoom, dreaming overlay.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';
import { Toast } from '@/components/Toast';
import type { DreamAlbumItem } from '@/hooks/useDreamAlbum';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 48;
const ITEM_SPACING = 16;
const SNAP_WIDTH = PREVIEW_WIDTH + ITEM_SPACING;

interface Props {
  album: DreamAlbumItem[];
  activeIndex: number;
  albumRef: React.RefObject<FlatList>;
  dreaming: boolean;

  onIndexChange: (index: number) => void;
  onRemove: (index: number) => void;
  onPost?: (index: number) => void;

  /** Compact mode — shrinks carousel to thumbnail when keyboard is open */
  compact?: boolean;

  /** Shared values for reveal animation on the latest dream */
  imgOpacity: { value: number };
  imgScale: { value: number };

  /** Footer content rendered below the carousel */
  children?: React.ReactNode;
}

export function DreamReveal({
  album,
  activeIndex,
  albumRef,
  dreaming,
  onIndexChange,
  onRemove,
  onPost,
  compact,
  imgOpacity,
  imgScale,
  children,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  // Reveal animation for latest dream
  const revealStyle = useAnimatedStyle(() => ({
    opacity: imgOpacity.value,
    transform: [{ scale: imgScale.value }],
  }));

  // Fullscreen animation
  const fsScale = useSharedValue(0);
  const fsOpacity = useSharedValue(0);
  const fsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.5 + fsScale.value * 0.5 }],
    opacity: fsOpacity.value,
  }));
  const fsOverlayStyle = useAnimatedStyle(() => ({
    opacity: fsOpacity.value,
  }));

  // Pinch to zoom
  const pinchScale = useSharedValue(1);
  const pinchTransX = useSharedValue(0);
  const pinchTransY = useSharedValue(0);
  const pinchFocalX = useSharedValue(0);
  const pinchFocalY = useSharedValue(0);
  const pinchStartX = useSharedValue(0);
  const pinchStartY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      pinchFocalX.value = e.focalX - SCREEN_WIDTH / 2;
      pinchFocalY.value = e.focalY - SCREEN_HEIGHT / 2;
      pinchStartX.value = e.focalX;
      pinchStartY.value = e.focalY;
    })
    .onUpdate((e) => {
      const sc = Math.max(1, Math.min(5, e.scale));
      pinchScale.value = sc;
      pinchTransX.value = pinchFocalX.value * (1 - sc) + (e.focalX - pinchStartX.value);
      pinchTransY.value = pinchFocalY.value * (1 - sc) + (e.focalY - pinchStartY.value);
    })
    .onEnd(() => {
      pinchScale.value = withTiming(1, { duration: 200 });
      pinchTransX.value = withTiming(0, { duration: 200 });
      pinchTransY.value = withTiming(0, { duration: 200 });
    });

  const pinchStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pinchTransX.value },
      { translateY: pinchTransY.value },
      { scale: pinchScale.value },
    ],
  }));

  const shareImage = useCallback(async (url: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({ url, message: 'Check out my dream!' });
    } catch {
      Toast.show('Could not share', 'close-circle');
    }
  }, []);

  function openFullscreen(index: number) {
    onIndexChange(index);
    setFullscreen(true);
    fsScale.value = 0;
    fsOpacity.value = 0;
    fsScale.value = withTiming(1, { duration: 300 });
    fsOpacity.value = withTiming(1, { duration: 250 });
  }

  function closeFullscreen() {
    fsScale.value = withTiming(0, { duration: 250 });
    fsOpacity.value = withTiming(0, { duration: 250 });
    setTimeout(() => setFullscreen(false), 260);
  }

  return (
    <>
      <View
        style={
          compact
            ? { height: 190, justifyContent: 'center' }
            : { flex: 1, justifyContent: 'center', maxHeight: SCREEN_HEIGHT * 0.35 }
        }
      >
        <FlatList
          ref={albumRef}
          data={album}
          keyExtractor={(item, i) => `${i}-${item.url.slice(-20)}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SNAP_WIDTH}
          snapToAlignment="start"
          decelerationRate="fast"
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          getItemLayout={(_, index) => ({
            length: SNAP_WIDTH,
            offset: SNAP_WIDTH * index,
            index,
          })}
          onScroll={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP_WIDTH);
            const clamped = Math.max(0, Math.min(idx, album.length - 1));
            if (clamped !== activeIndex) onIndexChange(clamped);
          }}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => openFullscreen(index)}
              onLongPress={() => shareImage(item.url)}
              delayLongPress={500}
              style={{
                width: compact ? 120 : PREVIEW_WIDTH,
                marginRight: compact ? 8 : ITEM_SPACING,
              }}
            >
              <Animated.View
                style={[s.revealBorder, index === album.length - 1 ? revealStyle : undefined]}
              >
                <Image
                  source={{ uri: item.url }}
                  style={compact ? s.revealImgCompact : s.revealImg}
                  contentFit="cover"
                  transition={300}
                />
                {dreaming && (
                  <View style={s.dreamingOverlay}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={s.dreamingText}>Dreaming...</Text>
                  </View>
                )}
                {!dreaming && !compact && (
                  <>
                    {album.length > 1 && (
                      <TouchableOpacity
                        style={s.dismissBadge}
                        onPress={() => onRemove(index)}
                        hitSlop={8}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                    {onPost && (
                      <TouchableOpacity
                        style={s.postBadge}
                        onPress={() => onPost(index)}
                        hitSlop={8}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </Animated.View>
            </TouchableOpacity>
          )}
        />
        {album.length > 1 && !compact && (
          <View style={s.dotRow}>
            {album.map((_, i) => (
              <View key={i} style={[s.dot, i === activeIndex && s.dotActive]} />
            ))}
          </View>
        )}
      </View>

      {/* Fullscreen preview modal */}
      <Modal visible={fullscreen} transparent animationType="none" statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeFullscreen}>
          <Animated.View style={[s.fsOverlay, fsOverlayStyle]}>
            <GestureDetector gesture={pinchGesture}>
              <Animated.View style={[s.fsImageWrap, fsStyle]}>
                <Animated.View style={[{ width: '100%', height: '80%' }, pinchStyle]}>
                  <Image
                    source={{ uri: album[activeIndex]?.url ?? '' }}
                    style={{ width: '100%', height: '100%', borderRadius: 4 }}
                    contentFit="contain"
                  />
                </Animated.View>
              </Animated.View>
            </GestureDetector>
            <TouchableOpacity style={s.fsClose} onPress={closeFullscreen} activeOpacity={0.7}>
              <View style={s.fsCloseCircle}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Footer — provided by parent */}
      {children}
    </>
  );
}

const s = StyleSheet.create({
  revealBorder: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  revealImg: {
    width: PREVIEW_WIDTH,
    height: Math.min(PREVIEW_WIDTH * 1.3, 300),
    borderRadius: 20,
    overflow: 'hidden',
  },
  revealImgCompact: {
    width: 120,
    height: 170,
    borderRadius: 12,
  },
  dreamingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  dreamingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  dismissBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { backgroundColor: '#FFFFFF' },
  fsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsImageWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  fsClose: { position: 'absolute', top: 60, right: 20 },
  fsCloseCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
