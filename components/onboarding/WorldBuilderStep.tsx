import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { ERA_TILES, SETTING_TILES } from '@/constants/onboarding';
import { colors } from '@/constants/theme';
import type { Era, Setting } from '@/types/recipe';

interface Props { onNext: () => void; onBack: () => void; }

export function WorldBuilderStep({ onNext, onBack }: Props) {
  const eras = useOnboardingStore((s) => s.recipe.eras);
  const settings = useOnboardingStore((s) => s.recipe.settings);
  const toggleEra = useOnboardingStore((s) => s.toggleEra);
  const toggleSetting = useOnboardingStore((s) => s.toggleSetting);

  const canProceed = eras.length >= 1 && settings.length >= 1;

  return (
    <View style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <Text style={s.title}>Where do your dreams live?</Text>
        <Text style={s.subtitle}>Pick the eras and places you're drawn to</Text>

        <Text style={s.sectionLabel}>Time Period</Text>
        <View style={s.grid}>
          {ERA_TILES.map((tile) => {
            const selected = eras.includes(tile.key);
            return (
              <TouchableOpacity
                key={tile.key}
                style={[s.tile, selected && s.tileSelected]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleEra(tile.key as Era); }}
                activeOpacity={0.7}
              >
                <Ionicons name={tile.icon as keyof typeof Ionicons.glyphMap} size={22} color={selected ? colors.accent : colors.textSecondary} />
                <Text style={[s.tileLabel, selected && { color: colors.accent }]}>{tile.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.sectionLabel, { marginTop: 16 }]}>Setting</Text>
        <View style={s.grid}>
          {SETTING_TILES.map((tile) => {
            const selected = settings.includes(tile.key);
            return (
              <TouchableOpacity
                key={tile.key}
                style={[s.tileLarge, selected && s.tileLargeSelected]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleSetting(tile.key as Setting); }}
                activeOpacity={0.7}
              >
                <Ionicons name={tile.icon as keyof typeof Ionicons.glyphMap} size={22} color={selected ? colors.accent : colors.textSecondary} />
                <Text style={[s.tileLabel, selected && { color: colors.accent }]}>{tile.label}</Text>
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
            style={[s.nextButton, !canProceed && s.nextButtonDisabled]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNext(); }}
            disabled={!canProceed}
            activeOpacity={0.7}
          >
            <Text style={[s.nextButtonText, !canProceed && s.nextButtonTextDisabled]}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color={canProceed ? '#FFFFFF' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 24 },
  sectionLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '30%', aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 8,
  },
  tileSelected: { borderColor: colors.accent, backgroundColor: colors.accentBg },
  tileLarge: {
    width: '47%', paddingVertical: 18, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  tileLargeSelected: { borderColor: colors.accent, backgroundColor: colors.accentBg },
  tileLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center' },
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
  nextButtonDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  nextButtonTextDisabled: { color: colors.textSecondary },
});
