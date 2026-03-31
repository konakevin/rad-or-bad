/**
 * Lightweight toast notification.
 * Call Toast.show('message') from anywhere — no provider needed.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ToastData {
  message: string;
  icon?: string;
  duration?: number;
}

type Listener = (data: ToastData) => void;

// Global event bus — show() from anywhere, ToastHost renders it
let listener: Listener | null = null;

export const Toast = {
  show(message: string, icon?: string, duration = 2000) {
    listener?.({ message, icon, duration });
  },
};

/** Mount once in your root layout */
export function ToastHost() {
  const [data, setData] = useState<ToastData | null>(null);
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const insets = useSafeAreaInsets();

  const dismiss = useCallback(() => {
    setData(null);
  }, []);

  useEffect(() => {
    listener = (incoming) => {
      if (timer.current) clearTimeout(timer.current);
      setData(incoming);
      translateY.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(1, { duration: 250 });

      timer.current = setTimeout(() => {
        translateY.value = withTiming(80, { duration: 250 });
        opacity.value = withTiming(0, { duration: 250 });
        setTimeout(() => runOnJS(dismiss)(), 300);
      }, incoming.duration ?? 2000);
    };
    return () => { listener = null; };
  }, [dismiss, translateY, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!data) return null;

  return (
    <Animated.View style={[s.container, { bottom: insets.bottom + 16 }, animStyle]}>
      {data.icon && (
        <Ionicons name={data.icon as keyof typeof Ionicons.glyphMap} size={18} color="#FFFFFF" />
      )}
      <Text style={s.text}>{data.message}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: SCREEN_WIDTH - 48,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
