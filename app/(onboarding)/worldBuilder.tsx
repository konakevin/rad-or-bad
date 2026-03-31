import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { ERA_TILES, SETTING_TILES, TOTAL_STEPS } from '@/constants/onboarding';
import { colors } from '@/constants/theme';
import type { Era, Setting } from '@/types/recipe';

export default function WorldBuilderScreen() {
  const eras = useOnboardingStore((s) => s.recipe.eras);
  const settings = useOnboardingStore((s) => s.recipe.settings);
  const toggleEra = useOnboardingStore((s) => s.toggleEra);
  const toggleSetting = useOnboardingStore((s) => s.toggleSetting);

  const canProceed = eras.length >= 1 && settings.length >= 1;

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader stepNumber={4} onBack={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Where do your dreams live?</Text>
        <Text style={styles.subtitle}>Pick the eras and places you're drawn to</Text>

        <Text style={styles.sectionLabel}>Time Period</Text>
        <View style={styles.grid}>
          {ERA_TILES.map((tile) => {
            const selected = eras.includes(tile.key);
            return (
              <TouchableOpacity
                key={tile.key}
                style={[styles.tile, selected && styles.tileSelected]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleEra(tile.key as Era); }}
                activeOpacity={0.7}
              >
                <Ionicons name={tile.icon as keyof typeof Ionicons.glyphMap} size={22} color={selected ? '#44CCFF' : colors.textSecondary} />
                <Text style={[styles.tileLabel, selected && { color: '#44CCFF' }]}>{tile.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Setting</Text>
        <View style={styles.grid}>
          {SETTING_TILES.map((tile) => {
            const selected = settings.includes(tile.key);
            return (
              <TouchableOpacity
                key={tile.key}
                style={[styles.tileLarge, selected && styles.tileLargeSelected]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleSetting(tile.key as Setting); }}
                activeOpacity={0.7}
              >
                <Ionicons name={tile.icon as keyof typeof Ionicons.glyphMap} size={22} color={selected ? '#44CCFF' : colors.textSecondary} />
                <Text style={[styles.tileLabel, selected && { color: '#44CCFF' }]}>{tile.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(onboarding)/moodBoard'); }}
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 24 },
  sectionLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '30%', aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  tileSelected: { borderColor: '#44CCFF', backgroundColor: 'rgba(68, 204, 255, 0.1)' },
  tileLarge: {
    width: '47%', paddingVertical: 18, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  tileLargeSelected: { borderColor: '#44CCFF', backgroundColor: 'rgba(68, 204, 255, 0.1)' },
  tileLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  nextButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
  },
  nextButtonDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  nextButtonTextDisabled: { color: colors.textSecondary },
});
