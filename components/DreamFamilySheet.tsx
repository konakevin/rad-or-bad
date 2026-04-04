/**
 * DreamFamilySheet — shows twins and fuses of a dream post.
 * Image slides up to thumbnail, family content flows below — matches CommentOverlay pattern.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { useDreamFamily, type FamilyMember } from '@/hooks/useDreamFamily';
import { useAlbumStore } from '@/store/album';
import type { DreamPostItem } from '@/components/DreamCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMB_HEIGHT = Math.round(SCREEN_HEIGHT * 0.28);
const THUMB_WIDTH = Math.round((THUMB_HEIGHT * 9) / 16);
const THUMB_MARGIN_TOP = 8;
const GRID_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - 48 - GRID_GAP) / 2;
const ANIM_DURATION = 250;
const EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

type Tab = 'twins' | 'fuses';

interface Props {
  visible: boolean;
  onClose: () => void;
  post: DreamPostItem;
  uploadId: string;
  isAiGenerated: boolean;
  aiPrompt: string | null;
  onTwin: () => void;
  onFuse: () => void;
  hideTabBar?: boolean;
}

function FamilyTile({ item }: { item: FamilyMember }) {
  return (
    <TouchableOpacity
      style={s.tile}
      onPress={() => {
        useAlbumStore.getState().clearAlbum();
        router.push(`/photo/${item.id}`);
      }}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.image_url }}
        style={s.tileImage}
        contentFit="cover"
        transition={150}
      />
      <View style={s.tileInfo}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={s.tileAvatar} />
        ) : (
          <View style={s.tileAvatarFallback}>
            <Text style={s.tileAvatarText}>{(item.username || '?')[0].toUpperCase()}</Text>
          </View>
        )}
        <Text style={s.tileUsername} numberOfLines={1}>
          {item.username}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function DreamFamilySheet({
  visible,
  onClose,
  post,
  uploadId,
  isAiGenerated,
  aiPrompt,
  onTwin,
  onFuse,
  hideTabBar,
}: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('twins');
  const { data, isLoading } = useDreamFamily(uploadId, visible);
  const twins = data?.twins ?? [];
  const fuses = data?.fuses ?? [];
  const items = tab === 'twins' ? twins : fuses;

  // ── Animation ────────────────────────────────────────────────────────────
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const closing = useRef(false);

  useEffect(() => {
    if (visible) {
      closing.current = false;
      progress.value = withTiming(1, { duration: ANIM_DURATION, easing: EASING });
    }
  }, [visible]);

  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    progress.value = withTiming(0, { duration: ANIM_DURATION, easing: EASING }, () => {
      runOnJS(onClose)();
    });
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([10, 300])
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      if (e.translationY > 0) dragY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 500) {
        runOnJS(dismiss)();
      } else {
        dragY.value = withTiming(0, { duration: 200 });
      }
    });

  const HEADER_HEIGHT = insets.top + THUMB_HEIGHT + THUMB_MARGIN_TOP + 52;
  const thumbLeft = (SCREEN_WIDTH - THUMB_WIDTH) / 2;

  const imageStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const dy = dragY.value;
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width: interpolate(p, [0, 1], [SCREEN_WIDTH, THUMB_WIDTH]),
      height: interpolate(p, [0, 1], [SCREEN_HEIGHT, THUMB_HEIGHT]),
      borderRadius: interpolate(p, [0, 1], [0, 12]),
      transform: [
        { translateX: interpolate(p, [0, 1], [0, thumbLeft]) },
        { translateY: interpolate(p, [0, 1], [0, insets.top + THUMB_MARGIN_TOP]) + dy * 0.3 },
      ],
      zIndex: 10,
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.6, 1]),
    transform: [{ translateY: dragY.value }],
  }));

  const paneStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [SCREEN_HEIGHT, 0]) + dragY.value },
    ],
  }));

  const metaStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.6, 1], [0, 1]),
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[s.overlay, overlayStyle]} pointerEvents="box-none">
        {/* Tap header to dismiss */}
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT }}
          onPress={dismiss}
          activeOpacity={1}
        />

        {/* Floating thumbnail */}
        <Animated.View style={imageStyle}>
          <TouchableOpacity onPress={dismiss} activeOpacity={0.9} style={{ flex: 1 }}>
            <Image
              source={{ uri: post.image_url }}
              style={{ width: '100%', height: '100%', borderRadius: 12 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Username + close below thumbnail */}
        <Animated.View
          style={[
            s.thumbMeta,
            { top: insets.top + THUMB_MARGIN_TOP + THUMB_HEIGHT + 8 },
            metaStyle,
          ]}
        >
          <View style={s.thumbUserRow}>
            {post.avatar_url ? (
              <Image source={{ uri: post.avatar_url }} style={s.thumbAvatar} />
            ) : (
              <View style={s.thumbAvatarFallback}>
                <Text style={s.thumbAvatarText}>{(post.username || '?')[0].toUpperCase()}</Text>
              </View>
            )}
            <Text style={s.thumbUsername} numberOfLines={1}>
              {post.username}
            </Text>
            <Text style={s.thumbLabel}>Dream Family</Text>
          </View>
          <TouchableOpacity onPress={dismiss} hitSlop={12}>
            <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Content pane */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[s.pane, { top: HEADER_HEIGHT }, paneStyle]}>
            {/* Handle */}
            <View style={s.handleRow}>
              <View style={s.handle} />
            </View>

            {/* Tabs */}
            <View style={s.tabs}>
              <TouchableOpacity
                style={[s.tab, tab === 'twins' && s.tabActive]}
                onPress={() => setTab('twins')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="dice-outline"
                  size={16}
                  color={tab === 'twins' ? colors.textPrimary : colors.textSecondary}
                />
                <Text style={[s.tabText, tab === 'twins' && s.tabTextActive]}>
                  Twins{twins.length > 0 ? ` (${twins.length})` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, tab === 'fuses' && s.tabActive]}
                onPress={() => setTab('fuses')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="git-merge-outline"
                  size={16}
                  color={tab === 'fuses' ? colors.textPrimary : colors.textSecondary}
                />
                <Text style={[s.tabText, tab === 'fuses' && s.tabTextActive]}>
                  Fuses{fuses.length > 0 ? ` (${fuses.length})` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Grid */}
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={s.gridRow}
              contentContainerStyle={s.grid}
              renderItem={({ item }) => <FamilyTile item={item} />}
              ListEmptyComponent={
                <View style={s.empty}>
                  {isLoading ? (
                    <ActivityIndicator color={colors.textSecondary} />
                  ) : (
                    <>
                      <Ionicons
                        name={tab === 'twins' ? 'dice-outline' : 'git-merge-outline'}
                        size={36}
                        color="rgba(255,255,255,0.15)"
                      />
                      <Text style={s.emptyText}>
                        {tab === 'twins' ? 'No twins yet' : 'No fuses yet'}
                      </Text>
                      <Text style={s.emptySubtext}>
                        {tab === 'twins'
                          ? 'Twin this dream to see parallel versions'
                          : 'Fuse with this dream to blend styles'}
                      </Text>
                    </>
                  )}
                </View>
              }
            />

            {/* Action buttons */}
            {isAiGenerated && (
              <View style={[s.actions, { paddingBottom: insets.bottom + (hideTabBar ? 16 : 75) }]}>
                {aiPrompt && (
                  <TouchableOpacity
                    style={s.actionButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      dismiss();
                      setTimeout(onTwin, 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="dice-outline" size={18} color="#FFFFFF" />
                    <Text style={s.actionText}>Twin this dream</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[s.actionButton, s.actionButtonSecondary]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    dismiss();
                    setTimeout(onFuse, 300);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="git-merge-outline" size={18} color={colors.accent} />
                  <Text style={[s.actionText, s.actionTextSecondary]}>Fuse with this dream</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  // ── Thumbnail meta ─────────────────────────────────────────────────────────
  thumbMeta: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 11,
  },
  thumbUserRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumbAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  thumbAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  thumbUsername: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  thumbLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  // ── Content pane ───────────────────────────────────────────────────────────
  pane: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.card,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  tile: {
    width: TILE_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  tileImage: {
    width: TILE_SIZE,
    height: TILE_SIZE * 1.4,
  },
  tileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  tileAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  tileAvatarFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileAvatarText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  tileUsername: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    gap: 8,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actions: {
    paddingHorizontal: 16,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  actionTextSecondary: {
    color: colors.accent,
  },
});
