/**
 * MoodSlidersStep — 4 bipolar mood sliders.
 * peaceful↔chaotic, cute↔terrifying, minimal↔maximal, realistic↔surreal
 */

import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, findNodeHandle, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import type { MoodAxes } from '@/types/vibeProfile';
import { colors } from '@/constants/theme';

const SLIDER_WIDTH = 280;
const THUMB_SIZE = 28;

interface SliderProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (v: number) => void;
}

function BipolarSlider({ label, leftLabel, rightLabel, value, onChange }: SliderProps) {
  const trackRef = useRef<View>(null);
  const trackLeft = useRef(0);

  function handleGrant(pageX: number) {
    const node = findNodeHandle(trackRef.current);
    if (node) {
      UIManager.measureInWindow(node, (x: number) => {
        trackLeft.current = x;
        const clamped = Math.max(0, Math.min(1, (pageX - x) / SLIDER_WIDTH));
        onChange(clamped);
      });
    }
  }

  function handleMove(pageX: number) {
    const clamped = Math.max(0, Math.min(1, (pageX - trackLeft.current) / SLIDER_WIDTH));
    onChange(clamped);
  }

  return (
    <View style={s.sliderBlock}>
      <Text style={s.sliderTitle}>{label}</Text>
      <View style={s.poleRow}>
        <Text style={s.poleLabel}>{leftLabel}</Text>
        <Text style={s.poleLabel}>{rightLabel}</Text>
      </View>
      <View
        style={s.hitArea}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => handleGrant(e.nativeEvent.pageX)}
        onResponderMove={(e) => handleMove(e.nativeEvent.pageX)}
        onResponderRelease={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      >
        <View ref={trackRef} style={s.track}>
          <View style={[s.fill, { width: value * SLIDER_WIDTH }]} />
          <View
            style={[s.thumb, { transform: [{ translateX: value * (SLIDER_WIDTH - THUMB_SIZE) }] }]}
          />
        </View>
      </View>
    </View>
  );
}

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const SLIDERS: { axis: keyof MoodAxes; label: string; left: string; right: string }[] = [
  { axis: 'peaceful_chaotic', label: 'Energy', left: 'Peaceful', right: 'Chaotic' },
  { axis: 'cute_terrifying', label: 'Tone', left: 'Cute', right: 'Terrifying' },
  { axis: 'minimal_maximal', label: 'Detail', left: 'Minimal', right: 'Maximal' },
  { axis: 'realistic_surreal', label: 'Reality', left: 'Realistic', right: 'Surreal' },
];

export function MoodSlidersStep({ onNext, onBack }: Props) {
  const moods = useOnboardingStore((s) => s.profile.moods);
  const setMoodAxis = useOnboardingStore((s) => s.setMoodAxis);

  return (
    <View style={s.root}>
      <View style={s.content}>
        <Text style={s.title}>Dial in your mood</Text>
        <Text style={s.subtitle}>Slide each one to match your vibe</Text>

        <View style={s.sliders}>
          {SLIDERS.map((slider) => (
            <BipolarSlider
              key={slider.axis}
              label={slider.label}
              leftLabel={slider.left}
              rightLabel={slider.right}
              value={moods[slider.axis]}
              onChange={(v) => setMoodAxis(slider.axis, v)}
            />
          ))}
        </View>
      </View>

      <View style={s.footer}>
        <View style={s.footerRow}>
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={s.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.nextBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
            activeOpacity={0.7}
          >
            <Text style={s.nextBtnText}>Next</Text>
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
  subtitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 32 },
  sliders: { gap: 28, alignItems: 'center' },
  sliderBlock: { width: SLIDER_WIDTH, gap: 8 },
  sliderTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  poleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  poleLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  hitArea: { paddingVertical: 12 },
  track: {
    width: SLIDER_WIDTH,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  thumb: {
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
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  backBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
