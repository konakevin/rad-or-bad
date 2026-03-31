import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';

export default function WelcomeScreen() {
  function handleStart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(onboarding)/interests');
  }

  return (
    <SafeAreaView style={styles.root}>

      <View style={styles.content}>
        <View style={styles.iconStack}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={44} color={colors.accent} />
          </View>
        </View>

        <Text style={styles.title}>Meet your Dream Bot</Text>

        <Text style={styles.body}>
          You're about to create your own little Dream Bot — a personal AI that learns your taste and creates stunning art just for you, every single day.
        </Text>

        <View style={styles.steps}>
          <StepRow
            icon="color-palette"
            color={colors.accent}
            title="Teach it your style"
            subtitle="Pick your interests, mood, and personality"
          />
          <StepRow
            icon="moon"
            color={colors.accent}
            title="It dreams while you sleep"
            subtitle="Wake up to a new creation on your profile every day"
          />
          <StepRow
            icon="globe-outline"
            color={colors.accent}
            title="Share your dreams"
            subtitle="See what others are dreaming and find kindred spirits"
          />
        </View>

        <Text style={styles.footnote}>
          Takes about 30 seconds. You can always change it later.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.7}>
          <Text style={styles.startButtonText}>Create My Character</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function StepRow({ icon, color, title, subtitle }: {
  icon: string; color: string; title: string; subtitle: string;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={color} />
      </View>
      <View style={styles.stepText}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  iconStack: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 32,
  },
  steps: {
    gap: 18,
    marginBottom: 28,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  stepSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  footnote: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
