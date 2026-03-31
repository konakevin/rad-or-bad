/**
 * Reusable onboarding screen with a tile grid.
 * Used for interests, moods, eras, settings, scene atmospheres, spirit companions.
 */

import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { colors } from '@/constants/theme';
import { TOTAL_STEPS } from '@/constants/onboarding';

interface Tile {
  key: string;
  label: string;
  icon: string;
}

interface Props {
  stepNumber: number;
  title: string;
  subtitle: string;
  tiles: Tile[];
  selected: string[];
  onToggle: (key: string) => void;
  onNext: () => void;
  onBack?: () => void;
  minRequired?: number;
  /** If true, only one tile can be selected at a time */
  singleSelect?: boolean;
  /** Accent color for selected tiles */
  accentColor?: string;
}

export function OnboardingTileScreen({
  stepNumber, title, subtitle, tiles, selected, onToggle,
  onNext, onBack, minRequired = 1, singleSelect, accentColor = colors.accent,
}: Props) {
  const isEditing = useOnboardingStore((s) => s.isEditing);
  const canProceed = selected.length >= minRequired;

  function handleToggle(key: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(key);
  }

  function handleNext() {
    if (!canProceed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  }

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader stepNumber={stepNumber} onBack={onBack ?? (isEditing ? () => router.replace('/(tabs)') : undefined)} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.grid}>
          {tiles.map((tile) => {
            const isSelected = selected.includes(tile.key);
            return (
              <TouchableOpacity
                key={tile.key}
                style={[
                  tile.icon
                    ? styles.tile
                    : styles.pill,
                  isSelected && [tile.icon ? styles.tileSelected : styles.pillSelected, { borderColor: accentColor, backgroundColor: `${accentColor}12` }],
                ]}
                onPress={() => handleToggle(tile.key)}
                activeOpacity={0.7}
              >
                {tile.icon ? (
                  <Ionicons
                    name={tile.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={isSelected ? accentColor : colors.textSecondary}
                  />
                ) : null}
                <Text style={[tile.icon ? styles.tileLabel : styles.pillLabel, isSelected && { color: accentColor }]}>
                  {tile.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          onPress={handleNext}
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
  backButton: {
    position: 'absolute', top: 16, left: 16, zIndex: 1,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute', top: 16, right: 16, zIndex: 1,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 16, paddingBottom: 20,
  },
  progressBar: { flexDirection: 'row', gap: 5 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  progressDotActive: { width: 20, borderRadius: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tileSelected: {},
  tileLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pillSelected: {},
  pillLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  nextButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
  },
  nextButtonDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  nextButtonTextDisabled: { color: colors.textSecondary },
});
