import { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, withDelay, withRepeat, Easing,
} from 'react-native-reanimated';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { FriendVote } from '@/hooks/useFeed';

// ── Confetti (lighter version of MilestoneBurst) ─────────────────────────────

const CONFETTI_COLORS = [
  '#FFD700', '#FFC044', '#FFEE88', '#FFD700', '#FFFFFF',
  '#FFAA33', '#FFCC44', '#FFD700', '#FFF0AA', '#FFC044',
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

interface ParticleConfig {
  angle: number;
  distanceFactor: number;
  size: number;
  color: string;
  delayMs: number;
  rotationDeg: number;
}

const MAX_PARTICLES = 30;
const PARTICLE_CONFIGS: ParticleConfig[] = Array.from({ length: MAX_PARTICLES }, (_, i) => ({
  angle: (i / MAX_PARTICLES) * Math.PI * 2 + (seededRandom(i) - 0.5) * 0.6,
  distanceFactor: 0.4 + seededRandom(i + 100) * 0.6,
  size: 4 + seededRandom(i + 200) * 4,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delayMs: Math.floor(seededRandom(i + 300) * 120),
  rotationDeg: Math.floor(seededRandom(i) * 360),
}));

function ConfettiParticle({ config, spread, duration, trigger }: {
  config: ParticleConfig; spread: number; duration: number; trigger: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (trigger === 0) return;
    progress.value = 0;
    progress.value = withDelay(
      config.delayMs,
      withTiming(1, { duration: duration * (0.8 + config.distanceFactor * 0.4), easing: Easing.out(Easing.cubic) }),
    );
  }, [trigger]);

  const dist = config.distanceFactor * spread;
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const easedP = 1 - Math.pow(1 - p, 2);
    const d = dist * easedP;
    const opacity = p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.4) / 0.6);
    return {
      opacity,
      transform: [
        { translateX: Math.cos(config.angle) * d },
        { translateY: Math.sin(config.angle) * d - easedP * 15 },
        { rotate: `${config.rotationDeg * p}deg` },
        { scale: 1 - p * 0.4 },
      ],
    };
  });

  const isRect = seededRandom(config.delayMs) > 0.5;
  const w = isRect ? config.size * 0.5 : config.size;
  const h = config.size;
  const r = isRect ? 1.5 : config.size / 2;

  return (
    <Animated.View style={[{ position: 'absolute', width: w, height: h, borderRadius: r, backgroundColor: config.color }, style]} />
  );
}

// ── Avatar fly-in ────────────────────────────────────────────────────────────

function FlyInAvatar({ friend, index, trigger }: { friend: FriendVote; index: number; trigger: number }) {
  const translateX = useSharedValue(index % 2 === 0 ? -200 : 200);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    if (trigger === 0) return;
    const delay = 200 + index * 80;
    opacity.value = withDelay(delay, withTiming(1, { duration: 150 }));
    translateX.value = withDelay(delay, withTiming((index - 1) * 36, { duration: 350, easing: Easing.out(Easing.back(1.5)) }));
    scale.value = withDelay(delay, withSequence(
      withTiming(1.15, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 100 }),
    ));
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const initial = friend.username[0]?.toUpperCase() ?? '?';

  return (
    <Animated.View style={[styles.avatarContainer, style]}>
      {friend.avatar_url ? (
        <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface StreakMatchBurstProps {
  match: {
    matched: FriendVote[];
    mismatched: FriendVote[];
    vote: 'rad' | 'bad';
  } | null;
}

export function StreakMatchBurst({ match }: StreakMatchBurstProps) {
  const triggerCount = useRef(0);
  const prevMatch = useRef<typeof match>(null);

  const hasMatches = (match?.matched.length ?? 0) > 0;
  const friends = hasMatches ? (match?.matched ?? []) : (match?.mismatched ?? []);
  const streakIntensity = hasMatches ? Math.min(friends.length * 2, 10) : 0;

  // Confetti config based on intensity
  const particleCount = hasMatches ? Math.min(10 + streakIntensity * 2, MAX_PARTICLES) : 0;
  const spread = 100 + streakIntensity * 10;
  const duration = 800;

  // Animation values
  const textScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const labelTranslateY = useSharedValue(8);
  const shakeX = useSharedValue(0);
  const chevronY = useSharedValue(0);

  if (match && match !== prevMatch.current) {
    prevMatch.current = match;
    triggerCount.current += 1;
  }

  const currentTrigger = triggerCount.current;

  useEffect(() => {
    if (!match) return;

    if (hasMatches) {
      // Match celebration
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      textOpacity.value = withTiming(1, { duration: 50 });
      textScale.value = withSequence(
        withTiming(2.0, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(0.85, { duration: 100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.08, { duration: 100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.97, { duration: 80 }),
        withTiming(1.0, { duration: 60 }),
      );
    } else {
      // Mismatch — drop in with shake
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      textOpacity.value = withTiming(1, { duration: 80 });
      textScale.value = withSequence(
        withTiming(1.3, { duration: 100, easing: Easing.out(Easing.quad) }),
        withTiming(1.0, { duration: 80 }),
      );

      shakeX.value = withSequence(
        withDelay(100, withTiming(8, { duration: 40 })),
        withTiming(-6, { duration: 40 }),
        withTiming(4, { duration: 35 }),
        withTiming(-2, { duration: 35 }),
        withTiming(0, { duration: 30 }),
      );
    }

    // Label slides in after
    labelOpacity.value = withDelay(350, withTiming(1, { duration: 200 }));
    labelTranslateY.value = withDelay(350, withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) }));

    // Chevron bob
    chevronY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    );
  }, [match]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }, { translateX: shakeX.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateY: labelTranslateY.value }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: chevronY.value }],
  }));

  const particles = useMemo(() =>
    PARTICLE_CONFIGS.slice(0, particleCount).map((cfg, i) => (
      <ConfettiParticle key={i} config={cfg} spread={spread} duration={duration} trigger={currentTrigger} />
    )),
    [currentTrigger, particleCount, spread],
  );

  if (!match) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Dim overlay */}
      <View style={[styles.dimOverlay, !hasMatches && styles.dimOverlayLight]} />

      {/* Confetti (match only) */}
      {hasMatches && (
        <View style={styles.particleCenter}>
          {particles}
        </View>
      )}

      {/* Main text */}
      <Animated.View style={[styles.textContainer, textStyle]}>
        {hasMatches ? (
          <>
            <Text style={[styles.mainText, styles.mainTextShadow]}>STREAK!</Text>
            <MaskedView
              style={StyleSheet.absoluteFill}
              maskElement={<Text style={styles.mainText}>STREAK!</Text>}
            >
              <LinearGradient colors={['#FFD700', '#FFC044', '#FFAA33', '#FFD700']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={[styles.mainText, { opacity: 0 }]}>STREAK!</Text>
              </LinearGradient>
            </MaskedView>
          </>
        ) : (
          <View style={styles.mismatchRow}>
            <Ionicons name="heart-dislike" size={32} color={colors.textSecondary} />
            <Text style={styles.brokenText}>BROKEN</Text>
          </View>
        )}
      </Animated.View>

      {/* Friend avatars (match: fly in, mismatch: static) */}
      <View style={styles.avatarRow}>
        {friends.slice(0, 5).map((f, i) => (
          <FlyInAvatar key={f.username} friend={f} index={i} trigger={currentTrigger} />
        ))}
      </View>

      {/* Message label */}
      <Animated.View style={[styles.labelContainer, labelStyle]}>
        {hasMatches ? (
          <Text style={styles.matchMessage}>
            {friends.length === 1
              ? `You and @${friends[0].username} both voted ${match.vote}!`
              : `You matched with ${friends.map(f => `@${f.username}`).join(' & ')}!`
            }
          </Text>
        ) : (
          <Text style={styles.mismatchMessage}>
            {friends.length === 1
              ? `You and @${friends[0].username} voted differently`
              : `${friends.map(f => `@${f.username}`).join(' & ')} voted differently`
            }
          </Text>
        )}
      </Animated.View>

      {/* Chevron */}
      <Animated.View style={[styles.chevronContainer, chevronStyle]}>
        <View style={styles.chevronPill}>
          <Ionicons name="chevron-up" size={32} color="#FFFFFF" />
        </View>
      </Animated.View>
    </View>
  );
}

const colors = {
  textSecondary: '#9CA3AF',
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 100,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  dimOverlayLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  particleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  mainText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  mainTextShadow: {
    color: '#000000',
    textShadowColor: '#000000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 1,
  },
  mismatchRow: {
    alignItems: 'center',
    gap: 8,
  },
  brokenText: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 4,
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginBottom: 12,
  },
  avatarContainer: {
    marginHorizontal: -4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#2D2D44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  labelContainer: {
    paddingHorizontal: 24,
  },
  matchMessage: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mismatchMessage: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  chevronContainer: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
  },
  chevronPill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
  },
});
