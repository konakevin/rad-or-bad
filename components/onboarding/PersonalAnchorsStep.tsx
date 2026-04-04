/**
 * PersonalAnchorsStep — 4 free-text fields for personal creative anchors.
 * At least one must be filled to proceed.
 */

import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import type { PersonalAnchors } from '@/types/vibeProfile';
import { colors } from '@/constants/theme';

interface Props { onNext: () => void; onBack: () => void; }

const FIELDS: { key: keyof PersonalAnchors; label: string; placeholder: string; icon: string }[] = [
  { key: 'place',      label: 'Places you love',          placeholder: 'A rooftop at sunset, my grandma\'s kitchen, the beach at night...', icon: 'location' },
  { key: 'object',     label: 'Some objects you love',      placeholder: 'A vintage camera, my guitar, a worn book...', icon: 'cube' },
  { key: 'era',        label: 'Eras you vibe with',        placeholder: '80s synthwave, medieval, the future...', icon: 'time' },
  { key: 'dream_vibe', label: 'How should your dreams feel?', placeholder: 'Cozy and magical, epic but intimate...', icon: 'sparkles' },
];

export function PersonalAnchorsStep({ onNext, onBack }: Props) {
  const anchors = useOnboardingStore((s) => s.profile.personal_anchors);
  const setAnchor = useOnboardingStore((s) => s.setAnchor);

  const filled = Object.values(anchors).filter((v) => v.trim().length > 0).length;
  const canProceed = filled >= 1;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Make it personal</Text>
        <Text style={s.subtitle}>These help your bot dream things that feel uniquely yours. Fill in at least one.</Text>

        {FIELDS.map((field) => (
          <View key={field.key} style={s.fieldCard}>
            <View style={s.fieldHeader}>
              <Ionicons name={field.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.accent} />
              <Text style={s.fieldLabel}>{field.label}</Text>
            </View>
            <TextInput
              style={s.input}
              placeholder={field.placeholder}
              placeholderTextColor={colors.textMuted}
              value={anchors[field.key]}
              onChangeText={(v) => setAnchor(field.key, v)}
              maxLength={80}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ))}
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
            <Ionicons name="arrow-forward" size={18} color={canProceed ? '#FFFFFF' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 15, marginBottom: 24, lineHeight: 22 },
  fieldCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  fieldLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  input: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    padding: 0,
  },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 16, borderRadius: 14,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accentBorder,
  },
  backBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
  },
  nextBtnDisabled: { backgroundColor: colors.border },
  nextBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  nextBtnTextDisabled: { color: colors.textSecondary },
});
