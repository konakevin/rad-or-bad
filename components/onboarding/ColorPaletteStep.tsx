import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { COLOR_PALETTES } from '@/constants/onboarding';
import { colors } from '@/constants/theme';
import type { ColorPalette } from '@/types/recipe';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const ALL_KEYS = COLOR_PALETTES.map((p) => p.key);

export function ColorPaletteStep({ onNext, onBack }: Props) {
  const selected = useOnboardingStore((s) => s.recipe.color_palettes);
  const toggleColorPalette = useOnboardingStore((s) => s.toggleColorPalette);
  const canProceed = selected.length >= 1;

  const allSelected = ALL_KEYS.every((k) => selected.includes(k));

  function handleSurpriseMe() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // If all selected, deselect all. Otherwise select all.
    if (allSelected) {
      for (const k of ALL_KEYS) {
        if (selected.includes(k)) toggleColorPalette(k as ColorPalette);
      }
    } else {
      for (const k of ALL_KEYS) {
        if (!selected.includes(k)) toggleColorPalette(k as ColorPalette);
      }
    }
  }

  function handleToggle(key: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleColorPalette(key as ColorPalette);
  }

  return (
    <View style={s.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
        <Text style={s.title}>What colors do you dream in?</Text>
        <Text style={s.subtitle}>Pick your palettes or surprise me for all of them</Text>

        <TouchableOpacity
          style={[s.surpriseBtn, allSelected && s.surpriseBtnSelected]}
          onPress={handleSurpriseMe}
          activeOpacity={0.7}
        >
          <Ionicons
            name={allSelected ? 'checkmark-circle' : 'color-palette'}
            size={20}
            color={allSelected ? colors.accent : colors.textSecondary}
          />
          <Text style={[s.surpriseText, allSelected && s.surpriseTextSelected]}>
            Surprise me — all colors
          </Text>
        </TouchableOpacity>

        <View style={s.grid}>
          {COLOR_PALETTES.map((palette) => {
            const isSelected = selected.includes(palette.key);
            return (
              <TouchableOpacity
                key={palette.key}
                style={[s.card, isSelected && s.cardSelected]}
                onPress={() => handleToggle(palette.key)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={palette.colors as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.gradient}
                />
                <Text
                  style={[s.cardLabel, isSelected && s.cardLabelSelected]}
                  numberOfLines={1}
                >
                  {palette.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                )}
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
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
            disabled={!canProceed}
            activeOpacity={0.7}
          >
            <Text style={[s.nextButtonText, !canProceed && s.nextButtonTextDisabled]}>Next</Text>
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
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 20 },
  surpriseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 14,
    marginBottom: 16,
  },
  surpriseBtnSelected: { borderColor: colors.accent, backgroundColor: colors.accentBg },
  surpriseText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  surpriseTextSelected: { color: colors.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 10,
    gap: 8,
  },
  cardSelected: { borderColor: colors.accent, backgroundColor: colors.accentBg },
  gradient: { width: '100%', height: 40, borderRadius: 8 },
  cardLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardLabelSelected: { color: colors.accent },
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
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
  },
  nextButtonDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  nextButtonTextDisabled: { color: colors.textSecondary },
});
