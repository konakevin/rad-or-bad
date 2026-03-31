import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useOnboardingStore } from '@/store/onboarding';
import { colors } from '@/constants/theme';
import { OnboardingHeader } from '@/components/OnboardingHeader';

const SLIDER_WIDTH = 280;
const THUMB_SIZE = 28;

export default function SurpriseFactorScreen() {
  const chaos = useOnboardingStore((s) => s.recipe.axes.chaos);
  const setChaos = useOnboardingStore((s) => s.setChaos);
  const setStep = useOnboardingStore((s) => s.setStep);

  const [sliderValue, setSliderValue] = useState(chaos);

  function handleSliderChange(locationX: number) {
    const clamped = Math.max(0, Math.min(1, locationX / SLIDER_WIDTH));
    setSliderValue(clamped);
    setChaos(clamped);
  }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep(7);
    router.push('/(onboarding)/reveal');
  }

  function handleBack() {
    setStep(5);
    router.back();
  }

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(sliderValue * (SLIDER_WIDTH - THUMB_SIZE), { duration: 100 }) }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: withTiming(sliderValue * SLIDER_WIDTH, { duration: 100 }),
  }));

  const label = sliderValue < 0.25 ? 'Very predictable — stay close to my picks'
    : sliderValue < 0.5 ? 'Mostly on-brand with a few surprises'
    : sliderValue < 0.75 ? 'Adventurous — surprise me often'
    : 'Full chaos — go wild, I love surprises';

  const emoji = sliderValue < 0.25 ? '🎯' : sliderValue < 0.5 ? '🌤' : sliderValue < 0.75 ? '🎲' : '🌪';

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader stepNumber={9} onBack={handleBack} />

      <View style={styles.content}>
        <Text style={styles.title}>How adventurous?</Text>
        <Text style={styles.subtitle}>How much should your AI surprise you?</Text>

        <View style={styles.sliderContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.endLabel}>Predictable</Text>
            <Text style={styles.endLabel}>Surprise Me</Text>
          </View>

          <View
            style={styles.sliderTrack}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => handleSliderChange(e.nativeEvent.locationX)}
            onResponderMove={(e) => handleSliderChange(e.nativeEvent.locationX)}
            onResponderRelease={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Animated.View style={[styles.sliderFill, fillStyle]} />
            <Animated.View style={[styles.sliderThumb, thumbStyle]} />
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.resultLabel}>{label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.7}>
          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          <Text style={styles.nextButtonText}>Create My Vibe</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  progressBar: { flexDirection: 'row', gap: 4 },
  progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.accent, width: 16, borderRadius: 3 },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 48 },
  sliderContainer: {
    alignItems: 'center',
    gap: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SLIDER_WIDTH,
  },
  endLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  sliderThumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  emoji: { fontSize: 24 },
  resultLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  nextButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
  },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
