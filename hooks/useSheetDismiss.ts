import { useRef } from 'react';
import { Animated, PanResponder, Keyboard } from 'react-native';
import { router } from 'expo-router';

const DISMISS_THRESHOLD = 100;

/**
 * Swipe-down-to-dismiss for bottom sheet modals.
 * Returns translateY animated value and panHandlers to spread onto the sheet wrapper.
 */
export function useSheetDismiss() {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderGrant: () => {
        Keyboard.dismiss();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: 800,
            duration: 200,
            useNativeDriver: true,
          }).start(() => router.back());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 200,
            friction: 20,
          }).start();
        }
      },
    })
  ).current;

  return { translateY, panHandlers: panResponder.panHandlers };
}
