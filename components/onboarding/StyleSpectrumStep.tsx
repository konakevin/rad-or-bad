import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, findNodeHandle, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { colors } from '@/constants/theme';

const SLIDER_WIDTH = 280;
const THUMB_SIZE = 28;
interface Props { onNext: () => void; onBack: () => void; }

function Slider({ label, leftLabel, rightLabel, value, onChange }: {
  label: string; leftLabel: string; rightLabel: string; value: number; onChange: (v: number) => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const trackRef = useRef<View>(null);
  const trackLeft = useRef(0);

  function measureAndHandle(pageX: number) {
    const relative = pageX - trackLeft.current;
    const clamped = Math.max(0, Math.min(1, relative / SLIDER_WIDTH));
    setLocalValue(clamped);
    onChange(clamped);
  }

  function handleGrant(pageX: number) {
    // Measure track position fresh on every touch start
    const node = findNodeHandle(trackRef.current);
    if (node) {
      UIManager.measureInWindow(node, (x: number) => {
        trackLeft.current = x;
        const relative = pageX - x;
        const clamped = Math.max(0, Math.min(1, relative / SLIDER_WIDTH));
        setLocalValue(clamped);
        onChange(clamped);
      });
    }
  }

  function handleRelease() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View style={sliderStyles.container}>
      <Text style={sliderStyles.label}>{label}</Text>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.endLabel}>{leftLabel}</Text>
        <Text style={sliderStyles.endLabel}>{rightLabel}</Text>
      </View>
      <View
        style={sliderStyles.hitArea}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => handleGrant(e.nativeEvent.pageX)}
        onResponderMove={(e) => measureAndHandle(e.nativeEvent.pageX)}
        onResponderRelease={handleRelease}
      >
        <View ref={trackRef} style={sliderStyles.track}>
          <View style={[sliderStyles.fill, { width: localValue * SLIDER_WIDTH }]} />
          <View style={[sliderStyles.thumb, { transform: [{ translateX: localValue * (SLIDER_WIDTH - THUMB_SIZE) }] }]} />
        </View>
      </View>
    </View>
  );
}

// Compress slider 0–1 to 0.25–0.75 so no axis is ever fully locked
function toStored(slider: number): number {
  return 0.25 + slider * 0.5;
}
function toSlider(stored: number): number {
  return Math.max(0, Math.min(1, (stored - 0.25) / 0.5));
}

export function StyleSpectrumStep({ onNext, onBack }: Props) {
  const recipe = useOnboardingStore((s) => s.recipe);
  const setRealism = useOnboardingStore((s) => s.setRealism);
  const setWeirdness = useOnboardingStore((s) => s.setWeirdness);
  const setScale = useOnboardingStore((s) => s.setScale);

  return (
    <View style={s.root}>
      <View style={s.content}>
        <Text style={s.title}>Tune your style</Text>
        <Text style={s.subtitle}>Your dreams will tend this direction, but your bot will still surprise you</Text>

        <View style={s.sliders}>
          <Slider
            label="Visual Style"
            leftLabel="Artistic"
            rightLabel="Photorealistic"
            value={toSlider(recipe.axes.realism)}
            onChange={(v) => setRealism(toStored(v))}
          />
          <Slider
            label="Weirdness"
            leftLabel="Normal"
            rightLabel="Surreal"
            value={toSlider(recipe.axes.weirdness)}
            onChange={(v) => setWeirdness(toStored(v))}
          />
          <Slider
            label="Scale"
            leftLabel="Intimate Close-up"
            rightLabel="Epic Vista"
            value={toSlider(recipe.axes.scale)}
            onChange={(v) => setScale(toStored(v))}
          />
        </View>
      </View>

      <View style={s.footer}>
        <View style={s.footerRow}>
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={s.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.nextButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
            activeOpacity={0.7}
          >
            <Text style={s.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { gap: 10 },
  label: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', width: SLIDER_WIDTH },
  endLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  hitArea: {
    paddingVertical: 16,
  },
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 4 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 48 },
  sliders: { alignItems: 'center', gap: 36 },
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
