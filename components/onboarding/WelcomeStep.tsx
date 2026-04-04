import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';
import { MASCOT_URLS } from '@/constants/mascots';

interface Props { onNext: () => void; onBack: () => void; }

function StepRow({ icon, color, title, subtitle }: {
  icon: string; color: string; title: string; subtitle: string;
}) {
  return (
    <View style={s.stepRow}>
      <View style={[s.stepIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={color} />
      </View>
      <View style={s.stepText}>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export function WelcomeStep({ onNext }: Props) {
  function handleStart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  }

  return (
    <View style={s.root}>
      <View style={s.content}>
        <View style={s.iconStack}>
          <Image
            source={{ uri: MASCOT_URLS[0] }}
            style={s.mascot}
            contentFit="cover"
          />
        </View>

        <Text style={s.title}>Meet your DreamBot</Text>

        <Text style={s.body}>
          You{"'"}re about to create your own little DreamBot — a personal AI that learns your taste and creates stunning art just for you, every single day.
        </Text>

        <View style={s.steps}>
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

        <Text style={s.footnote}>
          Takes about 30 seconds. You can always change it later.
        </Text>
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.startButton} onPress={handleStart} activeOpacity={0.7}>
          <Text style={s.startButtonText}>Create My DreamBot</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  iconStack: { alignItems: 'center', marginBottom: 28 },
  mascot: {
    width: 160, height: 160, borderRadius: 32,
  },
  title: {
    color: colors.textPrimary, fontSize: 28, fontWeight: '800',
    textAlign: 'center', marginBottom: 14,
  },
  body: {
    color: colors.textSecondary, fontSize: 16, lineHeight: 23,
    textAlign: 'center', marginBottom: 32,
  },
  steps: { gap: 18, marginBottom: 28 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { flex: 1, gap: 2 },
  stepTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  stepSubtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  footnote: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
