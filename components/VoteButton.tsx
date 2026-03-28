import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, withSpring, withDelay, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { gradients } from '@/constants/theme';

const BURST_COUNT = 18;
const BURST_ANGLES = Array.from({ length: BURST_COUNT }, (_, i) => (i * Math.PI * 2) / BURST_COUNT);

const PARTICLE_CONFIGS = [
  { w: 8,  h: 8,  r: 4, dist: 85, delay: 0,  isStreak: false },
  { w: 4,  h: 14, r: 2, dist: 75, delay: 15, isStreak: true  },
  { w: 11, h: 11, r: 6, dist: 92, delay: 5,  isStreak: false },
  { w: 4,  h: 12, r: 2, dist: 68, delay: 25, isStreak: true  },
  { w: 6,  h: 6,  r: 3, dist: 80, delay: 10, isStreak: false },
  { w: 13, h: 13, r: 7, dist: 96, delay: 0,  isStreak: false },
  { w: 4,  h: 16, r: 2, dist: 72, delay: 20, isStreak: true  },
  { w: 7,  h: 7,  r: 4, dist: 85, delay: 8,  isStreak: false },
  { w: 5,  h: 5,  r: 3, dist: 70, delay: 30, isStreak: false },
  { w: 4,  h: 13, r: 2, dist: 78, delay: 12, isStreak: true  },
  { w: 10, h: 10, r: 5, dist: 88, delay: 5,  isStreak: false },
  { w: 6,  h: 6,  r: 3, dist: 76, delay: 18, isStreak: false },
  { w: 4,  h: 15, r: 2, dist: 82, delay: 22, isStreak: true  },
  { w: 8,  h: 8,  r: 4, dist: 93, delay: 3,  isStreak: false },
  { w: 5,  h: 5,  r: 3, dist: 65, delay: 35, isStreak: false },
  { w: 12, h: 12, r: 6, dist: 90, delay: 0,  isStreak: false },
  { w: 4,  h: 11, r: 2, dist: 74, delay: 28, isStreak: true  },
  { w: 7,  h: 7,  r: 4, dist: 80, delay: 10, isStreak: false },
] as const;

type ParticleConfig = typeof PARTICLE_CONFIGS[number];

const RAD_PARTICLE_COLORS = ['#FFEE88','#DDAA66','#FFFFFF','#FFCC44','#DDBB55','#FFF0AA','#DD7766','#FFCC44','#FFFFFF','#DDAA66','#FFEE88','#CCDD55','#FFD700','#FFFFFF','#FFAA33','#FFE055','#DDAA66','#FFFFFF'];
const BAD_PARTICLE_COLORS = ['#AABBFF','#6699EE','#FFFFFF','#BB88EE','#44BBCC','#DDAAFF','#9966FF','#AABBFF','#FFFFFF','#6699EE','#BB88EE','#44BBCC','#CCAAFF','#FFFFFF','#7799FF','#BB88EE','#6699EE','#FFFFFF'];

function Particle({ angle, color, progress, config }: {
  angle: number;
  color: string;
  progress: Animated.SharedValue<number>;
  config: ParticleConfig;
}) {
  const rotationDeg = config.isStreak ? `${(angle * 180 / Math.PI) + 90}deg` : '0deg';
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const dist = config.dist * p;
    const opacity = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    return {
      opacity,
      transform: [
        { translateX: Math.cos(angle) * dist },
        { translateY: Math.sin(angle) * dist },
        { rotate: rotationDeg },
      ],
    };
  });
  return (
    <Animated.View
      style={[{ position: 'absolute', width: config.w, height: config.h, borderRadius: config.r, backgroundColor: color }, style]}
    />
  );
}

function BurstEffect({ progresses, vote }: {
  progresses: Animated.SharedValue<number>[];
  vote: 'rad' | 'bad';
}) {
  const particleColors = vote === 'rad' ? RAD_PARTICLE_COLORS : BAD_PARTICLE_COLORS;
  return (
    <View style={styles.burstContainer} pointerEvents="none">
      {BURST_ANGLES.map((angle, i) => (
        <Particle key={i} angle={angle} color={particleColors[i]} progress={progresses[i]} config={PARTICLE_CONFIGS[i]} />
      ))}
    </View>
  );
}

interface VoteButtonProps {
  vote: 'rad' | 'bad';
  onPress: () => void;
  disabled: boolean;
  /** Size of the circular button. Defaults to 74. */
  size?: number;
  /** Increment to trigger the swipe-up hint pulse. Defaults to 0 (never). */
  jiggleTick?: number;
  /** When true, button shrinks to 0 and fades after press instead of bouncing back. */
  shrinkOnPress?: boolean;
}

export function VoteButton({ vote, onPress, disabled, size = 74, jiggleTick = 0, shrinkOnPress = false }: VoteButtonProps) {
  const p0  = useSharedValue(0); const p1  = useSharedValue(0); const p2  = useSharedValue(0);
  const p3  = useSharedValue(0); const p4  = useSharedValue(0); const p5  = useSharedValue(0);
  const p6  = useSharedValue(0); const p7  = useSharedValue(0); const p8  = useSharedValue(0);
  const p9  = useSharedValue(0); const p10 = useSharedValue(0); const p11 = useSharedValue(0);
  const p12 = useSharedValue(0); const p13 = useSharedValue(0); const p14 = useSharedValue(0);
  const p15 = useSharedValue(0); const p16 = useSharedValue(0); const p17 = useSharedValue(0);
  const progresses = [p0,p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,p13,p14,p15,p16,p17];

  const buttonScale = useSharedValue(1);
  const buttonOpacity = useSharedValue(1);
  const pulseProgress = useSharedValue(0);
  const isRad = vote === 'rad';
  const radius = size / 2;
  const iconSize = Math.round(size * 0.35);
  const pulseColor = isRad ? '#FFCC44' : '#6699EE';

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }], opacity: buttonOpacity.value }));
  const pulseStyle = useAnimatedStyle(() => {
    const p = pulseProgress.value;
    return {
      opacity: (1 - p) * 0.55,
      transform: [{ scale: 0.9 + p * 0.85 }],
    };
  });

  useEffect(() => {
    if (jiggleTick === 0) return;
    pulseProgress.value = 0;
    pulseProgress.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) });
    buttonScale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withSpring(1, { damping: 18, stiffness: 260 }),
    );
  }, [jiggleTick]);

  // When shrinkOnPress + disabled: both buttons shrink and fade out
  // When shrinkOnPress turns off or disabled turns off: reset to visible
  useEffect(() => {
    if (shrinkOnPress && disabled) {
      buttonScale.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) });
      buttonOpacity.value = withDelay(100, withTiming(0, { duration: 300 }));
    } else {
      buttonScale.value = 1;
      buttonOpacity.value = 1;
    }
  }, [shrinkOnPress, disabled]);

  function handlePressIn() {
    // Fire burst particles (same on all views)
    progresses.forEach((p, i) => {
      p.value = 0;
      p.value = withDelay(
        PARTICLE_CONFIGS[i].delay,
        withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) }),
      );
    });

    // Normal: quick press then bounce back
    buttonScale.value = withSequence(
      withTiming(0.84, { duration: 60 }),
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
    );
  }

  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  return (
    <View style={styles.burstWrapper}>
      <BurstEffect progresses={progresses} vote={vote} />
      <Animated.View style={wrapperStyle}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          { width: size, height: size, borderRadius: radius, borderColor: pulseColor },
          pulseStyle,
        ]}
      />
      <Animated.View style={[
        isRad ? styles.radGlow : styles.badGlow,
        { borderRadius: radius },
        buttonStyle,
      ]}>
        <TouchableOpacity
          style={[styles.button, { width: size, height: size, borderRadius: radius }]}
          activeOpacity={0.8}
          onPressIn={handlePressIn}
          onPress={onPress}
          disabled={disabled}
        >
          <LinearGradient
            colors={isRad ? gradients.rad : gradients.bad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name={isRad ? 'thumbs-up' : 'thumbs-down'} size={iconSize} color="#FFFFFF" />
          <Text style={[styles.label, { fontSize: Math.round(size * 0.135) }]}>
            {isRad ? 'RAD' : 'BAD'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  burstWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstContainer: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  radGlow: {
    shadowColor: '#DDAA66',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  badGlow: {
    shadowColor: '#6699EE',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  button: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
