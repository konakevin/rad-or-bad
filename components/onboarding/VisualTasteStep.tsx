/**
 * VisualTasteStep — pick aesthetics (min 3) and art styles (min 2).
 * Two tile grids in one scrollable view with section headers.
 */

import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { AESTHETIC_TILES, ART_STYLE_TILES, LIMITS } from '@/constants/onboarding';
import type { Aesthetic, ArtStyle } from '@/types/vibeProfile';
import { colors } from '@/constants/theme';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function VisualTasteStep({ onNext, onBack }: Props) {
  const aesthetics = useOnboardingStore((s) => s.profile.aesthetics);
  const artStyles = useOnboardingStore((s) => s.profile.art_styles);
  const toggleAesthetic = useOnboardingStore((s) => s.toggleAesthetic);
  const toggleArtStyle = useOnboardingStore((s) => s.toggleArtStyle);

  const canProceed =
    aesthetics.length >= LIMITS.aesthetics.min && artStyles.length >= LIMITS.art_styles.min;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Pick your aesthetics</Text>
        <Text style={s.subtitle}>Choose at least 3 that feel like you</Text>

        <View style={s.grid}>
          {AESTHETIC_TILES.map((tile) => {
            const selected = aesthetics.includes(tile.key);
            return (
              <TouchableOpacity
                key={tile.key}
                style={[s.tile, selected && s.tileSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleAesthetic(tile.key as Aesthetic);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tile.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={selected ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[s.tileLabel, selected && s.tileLabelSelected]}>{tile.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.title, { marginTop: 32 }]}>Pick your art styles</Text>
        <Text style={s.subtitle}>Choose at least 2 styles you love</Text>

        <View style={s.grid}>
          {ART_STYLE_TILES.map((tile) => {
            const selected = artStyles.includes(tile.key);
            return (
              <TouchableOpacity
                key={tile.key}
                style={[s.tile, selected && s.tileSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleArtStyle(tile.key as ArtStyle);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tile.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={selected ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[s.tileLabel, selected && s.tileLabelSelected]}>{tile.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <View style={s.footerRow}>
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={s.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, !canProceed && s.nextBtnDisabled]}
            onPress={() => {
              if (!canProceed) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
            activeOpacity={canProceed ? 0.7 : 1}
          >
            <Text style={[s.nextBtnText, !canProceed && s.nextBtnTextDisabled]}>Next</Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={canProceed ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 15, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tileSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tileLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tileLabelSelected: { color: '#FFFFFF' },
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
  nextBtnDisabled: { backgroundColor: colors.border },
  nextBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  nextBtnTextDisabled: { color: colors.textSecondary },
});
