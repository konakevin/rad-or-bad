import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, findNodeHandle, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { colors } from '@/constants/theme';

const SLIDER_WIDTH = 280;
const THUMB_SIZE = 28;

interface Props { onNext: () => void; onBack: () => void; }

export function SurpriseFactorStep({ onNext, onBack }: Props) {
  const chaos = useOnboardingStore((s) => s.recipe.axes.chaos);
  const setChaos = useOnboardingStore((s) => s.setChaos);
  const [sliderValue, setSliderValue] = useState(chaos);
  const trackRef = useRef<View>(null);
  const trackLeft = useRef(0);

  function measureAndHandle(pageX: number) {
    const relative = pageX - trackLeft.current;
    const clamped = Math.max(0, Math.min(1, relative / SLIDER_WIDTH));
    setSliderValue(clamped);
    setChaos(clamped);
  }

  function handleGrant(pageX: number) {
    const node = findNodeHandle(trackRef.current);
    if (node) {
      UIManager.measureInWindow(node, (x: number) => {
        trackLeft.current = x;
        const relative = pageX - x;
        const clamped = Math.max(0, Math.min(1, relative / SLIDER_WIDTH));
        setSliderValue(clamped);
        setChaos(clamped);
      });
    }
  }

  function handleRelease() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const label = sliderValue < 0.25 ? 'Very predictable — stay close to my picks'
    : sliderValue < 0.5 ? 'Mostly on-brand with a few surprises'
    : sliderValue < 0.75 ? 'Adventurous — surprise me often'
    : 'Full chaos — go wild, I love surprises';

  const emoji = sliderValue < 0.25 ? '🎯' : sliderValue < 0.5 ? '🌤' : sliderValue < 0.75 ? '🎲' : '🌪';

  return (
    <View style={s.root}>
      <View style={s.content}>
        <Text style={s.title}>How adventurous?</Text>
        <Text style={s.subtitle}>How much should your AI surprise you?</Text>

        <View style={s.sliderContainer}>
          <View style={s.labelRow}>
            <Text style={s.endLabel}>Predictable</Text>
            <Text style={s.endLabel}>Surprise Me</Text>
          </View>

          <View
            style={s.hitArea}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => handleGrant(e.nativeEvent.pageX)}
            onResponderMove={(e) => measureAndHandle(e.nativeEvent.pageX)}
            onResponderRelease={handleRelease}
          >
            <View ref={trackRef} style={s.sliderTrack}>
              <View style={[s.sliderFill, { width: sliderValue * SLIDER_WIDTH }]} />
              <View style={[s.sliderThumb, { transform: [{ translateX: sliderValue * (SLIDER_WIDTH - THUMB_SIZE) }] }]} />
            </View>
          </View>

          <View style={s.resultRow}>
            <Text style={s.emoji}>{emoji}</Text>
            <Text style={s.resultLabel}>{label}</Text>
          </View>
        </View>
      </View>

      <View style={s.footer}>
        <View style={s.footerRow}>
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={s.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.nextButton} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }} activeOpacity={0.7}>
            <Text style={s.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 4 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 48 },
  sliderContainer: { alignItems: 'center', gap: 24 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', width: SLIDER_WIDTH },
  endLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  hitArea: { paddingVertical: 16 },
  sliderTrack: {
    width: SLIDER_WIDTH, height: 8, borderRadius: 4,
    backgroundColor: colors.surface, justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute', left: 0, height: 8, borderRadius: 4, backgroundColor: colors.accent,
  },
  sliderThumb: {
    position: 'absolute', width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  emoji: { fontSize: 24 },
  resultLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 16, borderRadius: 14,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accentBorder,
  },
  backBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  nextButton: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
  },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
