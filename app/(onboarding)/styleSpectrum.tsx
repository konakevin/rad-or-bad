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

function Slider({ label, leftLabel, rightLabel, value, onChange }: {
  label: string; leftLabel: string; rightLabel: string; value: number; onChange: (v: number) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  function handleChange(locationX: number) {
    const clamped = Math.max(0, Math.min(1, locationX / SLIDER_WIDTH));
    setLocalValue(clamped);
    onChange(clamped);
  }

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(localValue * (SLIDER_WIDTH - THUMB_SIZE), { duration: 80 }) }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: withTiming(localValue * SLIDER_WIDTH, { duration: 80 }),
  }));

  return (
    <View style={sliderStyles.container}>
      <Text style={sliderStyles.label}>{label}</Text>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.endLabel}>{leftLabel}</Text>
        <Text style={sliderStyles.endLabel}>{rightLabel}</Text>
      </View>
      <View
        style={sliderStyles.track}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => handleChange(e.nativeEvent.locationX)}
        onResponderMove={(e) => handleChange(e.nativeEvent.locationX)}
        onResponderRelease={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      >
        <Animated.View style={[sliderStyles.fill, fillStyle]} />
        <Animated.View style={[sliderStyles.thumb, thumbStyle]} />
      </View>
    </View>
  );
}

export default function StyleSpectrumScreen() {
  const recipe = useOnboardingStore((s) => s.recipe);
  const setRealism = useOnboardingStore((s) => s.setRealism);
  const setWeirdness = useOnboardingStore((s) => s.setWeirdness);
  const setScale = useOnboardingStore((s) => s.setScale);

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader stepNumber={3} onBack={() => router.back()} />

      <View style={styles.content}>
        <Text style={styles.title}>Shape your style</Text>
        <Text style={styles.subtitle}>Drag the sliders to tune your visual style</Text>

        <View style={styles.sliders}>
          <Slider
            label="Visual Style"
            leftLabel="Artistic"
            rightLabel="Photorealistic"
            value={recipe.axes.realism}
            onChange={setRealism}
          />
          <Slider
            label="Weirdness"
            leftLabel="Normal"
            rightLabel="Surreal"
            value={recipe.axes.weirdness}
            onChange={setWeirdness}
          />
          <Slider
            label="Scale"
            leftLabel="Intimate Close-up"
            rightLabel="Epic Vista"
            value={recipe.axes.scale}
            onChange={setScale}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(onboarding)/worldBuilder');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const sliderStyles = StyleSheet.create({
  container: { gap: 10 },
  label: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', width: SLIDER_WIDTH },
  endLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  track: {
    width: SLIDER_WIDTH, height: 8, borderRadius: 4,
    backgroundColor: colors.surface, justifyContent: 'center',
  },
  fill: {
    position: 'absolute', left: 0, height: 8, borderRadius: 4, backgroundColor: colors.accent,
  },
  thumb: {
    position: 'absolute', width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
  },
  progressBar: { flexDirection: 'row', gap: 4 },
  progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.accent, width: 16, borderRadius: 3 },
  content: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 48 },
  sliders: { alignItems: 'center', gap: 36 },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  nextButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
  },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
