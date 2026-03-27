/**
 * VoteHintPill
 *
 * An animated "vote to reveal rating" pill that displays a scrolling rainbow
 * gradient (the treadmill palette) masked through hint text and an eye-off icon.
 *
 * Originally shown above the compact vote buttons on the photo detail screen to
 * entice the user to vote before their score is revealed. The treadmill animation
 * runs in a seamless ping-pong loop and stops once hasVoted is true.
 *
 * To reactivate, import and drop in above the vote buttons:
 *
 *   import { VoteHintPill } from '@/components/VoteHintPill';
 *   <VoteHintPill hasVoted={hasVoted} />
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

// 8-color treadmill palette repeated twice + closing stop so the ping-pong
// loop resets invisibly (position 0 and position 640 share the same color).
const TREADMILL_COLORS = [
  '#BB88EE', '#6699EE', '#44BBCC', '#77CC88',
  '#CCDD55', '#DDBB55', '#DDAA66', '#DD7766',
  '#BB88EE', '#6699EE', '#44BBCC', '#77CC88',
  '#CCDD55', '#DDBB55', '#DDAA66', '#DD7766',
  '#BB88EE', // closes the loop
] as const;
const TREADMILL_WIDTH = 1280; // full gradient width in px (80px per stop)
const TREADMILL_SCROLL = 640; // scroll exactly one period before reset

interface VoteHintPillProps {
  hasVoted: boolean;
}

export function VoteHintPill({ hasVoted }: VoteHintPillProps) {
  const [hintWidth, setHintWidth] = useState(0);
  const treadmillX = useSharedValue(-(Math.random() * TREADMILL_SCROLL));

  useEffect(() => {
    if (hasVoted) {
      cancelAnimation(treadmillX);
      return;
    }
    treadmillX.value = withRepeat(
      withTiming(0, { duration: 16000, easing: Easing.linear }),
      -1,
      true
    );
  }, [hasVoted]);

  const treadmillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: treadmillX.value }],
  }));

  return (
    <>
      {/* Hidden sizer — measures the pill content width before rendering the masked version */}
      <View
        pointerEvents="none"
        onLayout={(e) => setHintWidth(e.nativeEvent.layout.width)}
        style={{ position: 'absolute', opacity: 0, flexDirection: 'row', alignItems: 'center', gap: 7 }}
      >
        <Ionicons name="eye-off-outline" size={16} color="#FFFFFF" />
        <Text style={styles.pillText}>vote to reveal rating</Text>
      </View>

      <View style={[styles.pill, hintWidth > 0 && { width: hintWidth + 24 }]}>
        <MaskedView maskElement={
          <View style={styles.pillInner}>
            <Ionicons name="eye-off-outline" size={16} color="#FFFFFF" />
            <Text style={styles.pillText}>vote to reveal rating</Text>
          </View>
        }>
          <Animated.View style={treadmillStyle}>
            <LinearGradient
              colors={TREADMILL_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: TREADMILL_WIDTH, height: 18 }}
            />
          </Animated.View>
        </MaskedView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
