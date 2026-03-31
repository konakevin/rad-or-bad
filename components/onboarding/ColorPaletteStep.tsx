import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { COLOR_PALETTES, LIMITS } from '@/constants/onboarding';
import { colors } from '@/constants/theme';
import type { ColorPalette } from '@/types/recipe';

interface Props { onNext: () => void; onBack: () => void; }

export function ColorPaletteStep({ onNext, onBack }: Props) {
  const selected = useOnboardingStore((s) => s.recipe.color_palettes);
  const toggleColorPalette = useOnboardingStore((s) => s.toggleColorPalette);
  const canProceed = selected.length >= LIMITS.colorPalettes.min;

  return (
    <View style={s.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
        <Text style={s.title}>Pick your palette</Text>
        <Text style={s.subtitle}>Choose the colors that speak to you</Text>

        <View style={s.grid}>
          {COLOR_PALETTES.map((palette) => {
            const isSelected = selected.includes(palette.key);
            return (
              <TouchableOpacity
                key={palette.key}
                style={[s.card, isSelected && s.cardSelected]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleColorPalette(palette.key as ColorPalette); }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={palette.colors as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.gradient}
                />
                <Text style={[s.cardLabel, isSelected && s.cardLabelSelected]}>{palette.label}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
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
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 24 },
  grid: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, padding: 14, gap: 14,
  },
  cardSelected: { borderColor: colors.accent, backgroundColor: colors.accentBg },
  gradient: { width: 48, height: 48, borderRadius: 12 },
  cardLabel: { flex: 1, color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  cardLabelSelected: { color: colors.textPrimary },
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
