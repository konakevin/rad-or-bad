/**
 * DreamCard — shared full-screen image card used across all feed screens.
 * Supports double-tap to like with animated heart burst.
 */

import { useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

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
}

interface Props {
  item: DreamPostItem;
  bottomPadding: number;
  isLiked: boolean;
  onLike: () => void;
}

export function DreamCard({ item, bottomPadding, isLiked, onLike }: Props) {
  const lastTap = useRef(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  function handlePress() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!isLiked) onLike();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  return (
    <Pressable style={s.card} onPress={handlePress}>
      <Image source={{ uri: item.image_url }} style={s.fullImage} contentFit="cover" transition={200} />

      <Animated.View style={[s.heartBurst, heartStyle]} pointerEvents="none">
        <Ionicons name="heart" size={80} color="#FFFFFF" />
      </Animated.View>

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
          {item.is_ai_generated && <Ionicons name="sparkles" size={14} color="#FFD700" />}
        </TouchableOpacity>
        {item.caption && <Text style={s.caption} numberOfLines={2}>{item.caption}</Text>}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  fullImage: { ...StyleSheet.absoluteFillObject },
  heartBurst: {
    position: 'absolute', top: '50%', left: '50%',
    marginTop: -40, marginLeft: -40,
  },
  postInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 70,
    paddingHorizontal: 16, gap: 8,
  },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarFallback: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  username: {
    color: '#FFFFFF', fontSize: 15, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  caption: {
    color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
});
