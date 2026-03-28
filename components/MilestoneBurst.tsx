import { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, withRepeat, withDelay, Easing,
} from 'react-native-reanimated';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { MilestoneHit } from '@/lib/milestones';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Tier config ──────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  1: { count: 20, spread: 130, duration: 900 },
  2: { count: 28, spread: 160, duration: 1000 },
  3: { count: 36, spread: 190, duration: 1100 },
  4: { count: 45, spread: 220, duration: 1200 },
} as const;

const MAX_PARTICLES = 45;

const CONFETTI_COLORS = [
  '#FFD700', '#FFC044', '#FFEE88', '#FFD700', '#FFFFFF',
  '#FFAA33', '#FFCC44', '#FFD700', '#FFF0AA', '#FFC044',
  '#FFFFFF', '#FFD700', '#FFEE88', '#FFAA33',
];

// ── Pre-generate stable particle configs for max count ───────────────────────
interface ParticleConfig {
  angle: number;
  distanceFactor: number; // 0.5–1.0, multiplied by tier spread
  size: number;
  color: string;
  delayMs: number;
  rotationDeg: number;
  isRect: boolean;
}

// Seeded so layout is stable across renders (no Math.random in render)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const PARTICLE_CONFIGS: ParticleConfig[] = Array.from({ length: MAX_PARTICLES }, (_, i) => {
  const r1 = seededRandom(i);
  const r2 = seededRandom(i + 100);
  const r3 = seededRandom(i + 200);
  const r4 = seededRandom(i + 300);
  return {
    angle: (i / MAX_PARTICLES) * Math.PI * 2 + (r1 - 0.5) * 0.6,
    distanceFactor: 0.4 + r2 * 0.6,
    size: 4 + r3 * 4,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delayMs: Math.floor(r4 * 150),
    rotationDeg: Math.floor(r1 * 360),
    isRect: r2 > 0.5,
  };
});

// ── Single particle (each owns its own shared value) ─────────────────────────
function ConfettiParticle({ config, spread, duration, trigger }: {
  config: ParticleConfig;
  spread: number;
  duration: number;
  trigger: number;
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
    // Ease the distance with a curve so particles decelerate smoothly
    const easedP = 1 - Math.pow(1 - p, 2);
    const d = dist * easedP;
    const opacity = p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.4) / 0.6);
    return {
      opacity,
      transform: [
        { translateX: Math.cos(config.angle) * d },
        { translateY: Math.sin(config.angle) * d - easedP * 20 },
        { rotate: `${config.rotationDeg * p}deg` },
        { scale: 1 - p * 0.4 },
      ],
    };
  });

  const w = config.isRect ? config.size * 0.5 : config.size;
  const h = config.size;
  const r = config.isRect ? 1.5 : config.size / 2;

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: w, height: h, borderRadius: r, backgroundColor: config.color },
        style,
      ]}
    />
  );
}

// ── Twinkle stars ────────────────────────────────────────────────────────────
const TWINKLE_COUNT = 10;

// Pre-generate a pool of positions so each star cycles through them on the UI thread
const POSITIONS_PER_STAR = 6;
const TWINKLE_STAR_CONFIGS = Array.from({ length: TWINKLE_COUNT }, (_, i) => ({
  size: 12,
  duration: 750 + seededRandom(i * 5 + 501) * 550,
  initialDelay: seededRandom(i * 5 + 502) * 1000,
  cyclePause: 600 + seededRandom(i * 5 + 503) * 600,
}));

const TWINKLE_POOL = Array.from({ length: TWINKLE_COUNT }, (_, star) =>
  Array.from({ length: POSITIONS_PER_STAR }, (__, pos) => ({
    left: 5 + seededRandom(star * 100 + pos * 7) * 90,
    top: 5 + seededRandom(star * 100 + pos * 7 + 1) * 55,
  }))
);

function TwinkleStar({ index, trigger }: { index: number; trigger: number }) {
  const cfg = TWINKLE_STAR_CONFIGS[index];
  const positions = TWINKLE_POOL[index];
  const progress = useSharedValue(0);
  const posIndex = useSharedValue(0);

  useEffect(() => {
    if (trigger === 0) return;
    const cycleDuration = cfg.duration + cfg.cyclePause;

    // Cycle through position indices
    posIndex.value = 0;
    posIndex.value = withDelay(cfg.initialDelay, withRepeat(
      withSequence(
        ...positions.map((_, i) =>
          withSequence(
            withTiming(i, { duration: 0 }),
            withDelay(cycleDuration, withTiming(i, { duration: 0 })),
          )
        ),
      ),
      -1, false,
    ));

    // Opacity + scale pulse loop
    progress.value = 0;
    progress.value = withDelay(cfg.initialDelay, withRepeat(
      withSequence(
        withTiming(1, { duration: cfg.duration * 0.3, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: cfg.duration * 0.7 }),
        withDelay(cfg.cyclePause, withTiming(0, { duration: 0 })),
      ),
      -1, false,
    ));
  }, [trigger]);

  const style = useAnimatedStyle(() => {
    const idx = Math.round(posIndex.value) % positions.length;
    const pos = positions[idx];
    return {
      opacity: progress.value,
      transform: [
        { scale: 0.3 + progress.value * 0.7 },
        { rotate: '45deg' },
      ],
      left: `${pos.left}%`,
      top: `${pos.top}%`,
    };
  });

  const size = cfg.size;
  return (
    <Animated.View style={[{
      position: 'absolute',
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    }, style]}>
      <View style={{ position: 'absolute', width: size * 1.4, height: size * 1.4, borderRadius: size * 0.7, backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <View style={{ position: 'absolute', width: size * 0.18, height: size, borderRadius: size * 0.09, backgroundColor: '#FFFFFF', shadowColor: '#FFFFFF', shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }} />
      <View style={{ position: 'absolute', width: size, height: size * 0.18, borderRadius: size * 0.09, backgroundColor: '#FFFFFF', shadowColor: '#FFFFFF', shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }} />
    </Animated.View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
interface MilestoneBurstProps {
  hit: MilestoneHit | null;
}

export function MilestoneBurst({ hit }: MilestoneBurstProps) {
  // Trigger counter — increments each time a milestone fires, drives particle useEffects
  const triggerCount = useRef(0);
  const prevHit = useRef<MilestoneHit | null>(null);

  const tier = (hit?.tier ?? 1) as 1 | 2 | 3 | 4;
  const { count, spread, duration } = TIER_CONFIG[tier];

  // Animation values
  const textScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const labelTranslateY = useSharedValue(8);
  const shakeX = useSharedValue(0);
  const pulseScale = useSharedValue(0);
  const pulseOpacity = useSharedValue(0);
  const chevronY = useSharedValue(0);
  const chevronOpacity = useSharedValue(0);

  // Detect new milestone hit
  if (hit && hit !== prevHit.current) {
    prevHit.current = hit;
    triggerCount.current += 1;
  }

  const currentTrigger = triggerCount.current;

  useEffect(() => {
    if (!hit) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Number slams in with overshoot bounce
    textOpacity.value = withTiming(1, { duration: 50 });
    textScale.value = withSequence(
      withTiming(2.0, { duration: 120, easing: Easing.out(Easing.quad) }),  // slam in big
      withTiming(0.85, { duration: 100, easing: Easing.inOut(Easing.quad) }), // squish
      withTiming(1.08, { duration: 100, easing: Easing.inOut(Easing.quad) }), // overshoot
      withTiming(0.97, { duration: 80 }),                                      // settle
      withTiming(1.0, { duration: 60 }),                                       // rest
    );

    // Energy pulse ring — blasts out from number on impact
    pulseScale.value = 1;
    pulseOpacity.value = 0.8;
    pulseScale.value = withDelay(80, withTiming(5, { duration: 350, easing: Easing.out(Easing.cubic) }));
    pulseOpacity.value = withDelay(80, withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }));



    // Label + chevron appear together after number settles (460ms)
    const settleDelay = 460;
    labelOpacity.value = withDelay(settleDelay, withTiming(1, { duration: 200 }));
    labelTranslateY.value = withDelay(settleDelay, withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) }));

    chevronOpacity.value = withDelay(settleDelay, withTiming(1, { duration: 200 }));
    chevronY.value = withDelay(settleDelay, withRepeat(
      withSequence(
        withTiming(-8, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,  { duration: 500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    ));

  }, [hit]);

  const numberStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateY: labelTranslateY.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    opacity: chevronOpacity.value,
    transform: [{ translateY: chevronY.value }],
  }));


  // Always render all MAX_PARTICLES (hook count stays stable).
  // Particles beyond the tier's count just won't get triggered.
  const particles = useMemo(() =>
    PARTICLE_CONFIGS.slice(0, count).map((cfg, i) => (
      <ConfettiParticle
        key={i}
        config={cfg}
        spread={spread}
        duration={duration}
        trigger={currentTrigger}
      />
    )),
    [currentTrigger, count, spread, duration],
  );

  if (!hit) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Confetti particles */}
      <View style={styles.particleCenter}>
        {particles}
      </View>

      {/* Dark overlay to make everything pop */}
      <View style={styles.dimOverlay} />

      {/* Energy pulse ring */}
      <Animated.View style={[styles.pulseRing, pulseStyle]} />

      {/* Milestone number + RADS + message — all centered together */}
      <Animated.View style={[styles.textContainer, numberStyle]}>
        <View>
          <Text style={[styles.milestoneNumber, styles.milestoneNumberShadow]}>{hit.milestone}</Text>
          <MaskedView
            style={StyleSheet.absoluteFill}
            maskElement={<Text style={styles.milestoneNumber}>{hit.milestone}</Text>}
          >
            <LinearGradient
              colors={['#FFD700', '#FFC044', '#FFAA33', '#FFD700']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.milestoneNumber, { opacity: 0 }]}>{hit.milestone}</Text>
            </LinearGradient>
          </MaskedView>
        </View>
        <Animated.View style={[labelStyle, { alignItems: 'center' }]}>
          <Text style={styles.milestoneLabel}>{hit.message}</Text>
          <Text style={styles.milestoneSubtext}>Swipe up to continue</Text>
        </Animated.View>
      </Animated.View>

      {/* Swipe-up chevron hint */}
      <Animated.View style={[styles.chevronContainer, chevronStyle]}>
        <View style={styles.chevronPill}>
          <Ionicons name="chevron-up" size={32} color="#FFFFFF" />
        </View>
      </Animated.View>

      {/* Twinkle stars scattered across card */}
      {Array.from({ length: TWINKLE_COUNT }, (_, i) => (
        <TwinkleStar key={i} index={i} trigger={currentTrigger} />
      ))}

    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 100,
  },
  particleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  textContainer: {
    alignItems: 'center',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255, 215, 0, 0.8)',
  },
  milestoneNumber: {
    fontSize: 96,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  milestoneNumberShadow: {
    color: '#000000',
    textShadowColor: '#000000',
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 1,
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
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  milestoneSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
