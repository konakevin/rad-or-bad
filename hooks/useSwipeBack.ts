import { useRef } from 'react';
import { Animated, PanResponder } from 'react-native';
import { router } from 'expo-router';
import { SWIPE_THRESHOLD, SNAP_SPRING, SLIDE_OFF_DURATION } from '@/constants/gestures';

/**
 * Full-screen swipe-right-to-go-back gesture.
 * Uses global swipe constants for consistent feel across the app.
 * Spread panHandlers on the outermost Animated.View of the screen.
 */
export function useSwipeBack() {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2 && gs.vx > 0,
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0) translateX.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 25 || gs.vx > 0.2) {
          Animated.timing(translateX, {
            toValue: 400,
            duration: SLIDE_OFF_DURATION,
            useNativeDriver: true,
          }).start(() => router.back());
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: SNAP_SPRING.stiffness,
            friction: SNAP_SPRING.damping,
          }).start();
        }
      },
    })
  ).current;

  return { translateX, panHandlers: panResponder.panHandlers };
}
