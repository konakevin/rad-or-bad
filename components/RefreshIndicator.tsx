import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';

const PULL_THRESHOLD = 120;

interface RefreshIndicatorProps {
  pullY: SharedValue<number>;
}

export function RefreshIndicator({ pullY }: RefreshIndicatorProps) {
  const [pastThreshold, setPastThreshold] = useState(false);

  useAnimatedReaction(
    () => pullY.value > PULL_THRESHOLD,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setPastThreshold)(current);
        if (current) {
          runOnJS(Haptics.selectionAsync)();
        }
      }
    },
  );

  const animatedStyle = useAnimatedStyle(() => {
    const progress = Math.min(pullY.value / 60, 1);
    const visualY = pullY.value * 0.15;
    return {
      opacity: progress,
      transform: [{ translateY: visualY - 10 }],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <View style={styles.pill}>
        <Text style={styles.text}>
          {pastThreshold ? 'Release to refresh' : 'Pull to refresh'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
