import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { COLOR_PALETTES, LIMITS, TOTAL_STEPS } from '@/constants/onboarding';
import { colors } from '@/constants/theme';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import type { ColorPalette } from '@/types/recipe';

export default function ColorPaletteScreen() {
  const selected = useOnboardingStore((s) => s.recipe.color_palettes);
  const toggleColorPalette = useOnboardingStore((s) => s.toggleColorPalette);
  const canProceed = selected.length >= LIMITS.colorPalettes.min;

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader stepNumber={7} onBack={() => router.back()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Pick your palette</Text>
        <Text style={styles.subtitle}>Choose the colors that speak to you</Text>

        <View style={styles.grid}>
          {COLOR_PALETTES.map((palette) => {
            const isSelected = selected.includes(palette.key);
            return (
              <TouchableOpacity
                key={palette.key}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleColorPalette(palette.key as ColorPalette); }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={palette.colors as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.gradient}
                />
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>{palette.label}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(onboarding)/personality'); }}
          disabled={!canProceed}
          activeOpacity={0.7}
        >
          <Text style={[styles.nextButtonText, !canProceed && styles.nextButtonTextDisabled]}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color={canProceed ? '#FFFFFF' : colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
  },
  progressBar: { flexDirection: 'row', gap: 4 },
  progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.accent, width: 16, borderRadius: 3 },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 24 },
  grid: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, padding: 14, gap: 14,
  },
  cardSelected: { borderColor: colors.accent, backgroundColor: 'rgba(255, 215, 0, 0.08)' },
  gradient: { width: 48, height: 48, borderRadius: 12 },
  cardLabel: { flex: 1, color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  cardLabelSelected: { color: colors.textPrimary },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  nextButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
  },
  nextButtonDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  nextButtonTextDisabled: { color: colors.textSecondary },
});
