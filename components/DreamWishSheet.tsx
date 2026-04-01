/**
 * DreamWishSheet — bottom sheet for making a dream wish.
 * Used from home feed, profile, and dream tab.
 */

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';
import { MASCOT_URLS } from '@/constants/mascots';
import { Toast } from '@/components/Toast';
import { useSetDreamWish } from '@/hooks/useDreamWish';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentWish?: string | null;
}

export function DreamWishSheet({ visible, onClose, currentWish }: Props) {
  const [text, setText] = useState(currentWish ?? '');
  const { mutate: setWish, isPending } = useSetDreamWish();

  function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWish(trimmed, {
      onSuccess: () => {
        Toast.show('Wish set! Your Dream Bot will dream it next', 'sparkles');
        onClose();
      },
    });
  }

  function handleClear() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWish(null, {
      onSuccess: () => {
        setText('');
        Toast.show('Wish cleared', 'checkmark-circle');
        onClose();
      },
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <Pressable style={s.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboardWrap}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.handle} />

            <Image source={{ uri: MASCOT_URLS[2] }} style={s.mascot} contentFit="cover" />

            <Text style={s.title}>
              {currentWish ? 'Your wish is set' : 'Make a wish'}
            </Text>
            <Text style={s.subtitle}>
              {currentWish
                ? 'Your Dream Bot will dream this next. Change it or let it dream.'
                : 'Tell your Dream Bot what to dream about next. It\'ll put its own spin on it.'}
            </Text>

            <TextInput
              style={s.input}
              placeholder="My dog at the beach, flying through space, a cozy rainy day..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              maxLength={200}
              multiline
              textAlignVertical="top"
              autoFocus={!currentWish}
            />

            <Text style={s.charCount}>{text.length}/200</Text>

            <TouchableOpacity
              style={[s.saveButton, (!text.trim() || isPending) && s.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!text.trim() || isPending}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={18} color={!text.trim() ? colors.textSecondary : '#FFFFFF'} />
              <Text style={[s.saveButtonText, !text.trim() && s.saveButtonTextDisabled]}>
                {currentWish ? 'Update wish' : 'Make this wish'}
              </Text>
            </TouchableOpacity>

            {currentWish && (
              <TouchableOpacity style={s.clearButton} onPress={handleClear} activeOpacity={0.7}>
                <Text style={s.clearButtonText}>Clear wish</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, marginBottom: 8,
  },
  mascot: {
    width: 80, height: 80, borderRadius: 20,
  },
  title: {
    color: colors.textPrimary, fontSize: 20, fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary, fontSize: 14, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 8,
  },
  input: {
    width: '100%', minHeight: 80, backgroundColor: colors.background,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    color: colors.textPrimary, fontSize: 15, lineHeight: 21,
  },
  charCount: {
    color: colors.textMuted, fontSize: 12, alignSelf: 'flex-end',
  },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, width: '100%',
  },
  saveButtonDisabled: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  saveButtonText: {
    color: '#FFFFFF', fontSize: 17, fontWeight: '700',
  },
  saveButtonTextDisabled: {
    color: colors.textSecondary,
  },
  clearButton: {
    paddingVertical: 8,
  },
  clearButtonText: {
    color: colors.textSecondary, fontSize: 14, fontWeight: '600',
  },
});
