/**
 * DreamWishSheet — fullscreen form for making a dream wish.
 */

import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';
import { Toast } from '@/components/Toast';
import { useSetDreamWish } from '@/hooks/useDreamWish';
import { useShareableVibers } from '@/hooks/useShareableVibers';
import {
  MOOD_OPTIONS, WEATHER_OPTIONS, ENERGY_OPTIONS, VIBE_OPTIONS,
  EMPTY_MODIFIERS, type WishModifier, type WishModifiers,
} from '@/constants/wishModifiers';

function ModifierDropdown({ label, options, selected, onSelect, onOpenPicker }: {
  label: string;
  options: WishModifier[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  onOpenPicker: (label: string, options: WishModifier[], selected: string | null, onSelect: (key: string | null) => void) => void;
}) {
  const selectedItem = options.find((o) => o.key === selected);

  return (
    <View style={s.dropdownRow}>
      <Text style={s.dropdownLabel}>{label}</Text>
      <TouchableOpacity
        style={s.dropdown}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onOpenPicker(label, options, selected, onSelect); }}
        activeOpacity={0.7}
      >
        <Text style={[s.dropdownValue, !selectedItem && s.dropdownPlaceholder]}>
          {selectedItem?.label ?? 'Any'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  currentWish?: string | null;
  currentModifiers?: WishModifiers | null;
  currentRecipientIds?: string[];
}

export function DreamWishSheet({ visible, onClose, currentWish, currentModifiers, currentRecipientIds }: Props) {
  const [text, setText] = useState(currentWish ?? '');
  const [modifiers, setModifiers] = useState<WishModifiers>(currentModifiers ?? EMPTY_MODIFIERS);
  const [recipientIds, setRecipientIds] = useState<Set<string>>(new Set(currentRecipientIds ?? []));
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [picker, setPicker] = useState<{ label: string; options: WishModifier[]; selected: string | null; onSelect: (k: string | null) => void } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Sync state when sheet opens
  useEffect(() => {
    if (visible) {
      setText(currentWish ?? '');
      setModifiers(currentModifiers ?? EMPTY_MODIFIERS);
      setRecipientIds(new Set(currentRecipientIds ?? []));
      setPicker(null);
      setShowClearConfirm(false);
    }
  }, [visible]);
  const { mutate: setWish, isPending } = useSetDreamWish();
  const { data: friends = [] } = useShareableVibers();
  const insets = useSafeAreaInsets();

  // Dirty checking — only enable save if form has content and something changed
  const hasText = text.trim().length > 0;
  const isNew = !currentWish;
  const isDirty = isNew || (
    text.trim() !== (currentWish ?? '') ||
    JSON.stringify(modifiers) !== JSON.stringify(currentModifiers ?? EMPTY_MODIFIERS) ||
    JSON.stringify([...recipientIds].sort()) !== JSON.stringify([...(currentRecipientIds ?? [])].sort())
  );
  const canSave = hasText && isDirty && !isPending;

  function updateModifier(key: keyof WishModifiers, value: string | null) {
    setModifiers((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const hasModifiers = Object.values(modifiers).some(Boolean);
    setWish(
      { wish: trimmed, modifiers: hasModifiers ? modifiers : null, recipientIds: recipientIds.size > 0 ? Array.from(recipientIds) : null },
      {
        onSuccess: () => {
          const msg = recipientIds.size > 0
            ? `Wish set! Sending to ${recipientIds.size} friend${recipientIds.size > 1 ? 's' : ''} tonight`
            : 'Wish set! Your Dream Bot will dream it next';
          Toast.show(msg, 'sparkles', 3500);
          onClose();
        },
      },
    );
  }

  function handleClear() {
    setShowClearConfirm(true);
  }

  function doClear() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWish(
      { wish: null, modifiers: null, recipientIds: null },
      {
        onSuccess: () => {
          setText('');
          setModifiers(EMPTY_MODIFIERS);
          setRecipientIds(new Set());
          Toast.show('Wish cleared', 'checkmark-circle');
          onClose();
        },
      },
    );
  }

  return (
    <Modal visible={visible} animationType="fade">
      <View style={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{currentWish ? 'Edit your wish' : 'Make a wish'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={s.subtitle}>What should Dream Bot dream tonight?</Text>

        <ScrollView style={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Modifiers (optional) */}
          <Text style={s.sectionLabel}>Set the vibe (optional)</Text>
          <View style={s.dropdownGrid}>
            <ModifierDropdown label="Mood" options={MOOD_OPTIONS} selected={modifiers.mood} onSelect={(v) => updateModifier('mood', v)} onOpenPicker={(l, o, sel, cb) => setPicker({ label: l, options: o, selected: sel, onSelect: cb })} />
            <ModifierDropdown label="Weather" options={WEATHER_OPTIONS} selected={modifiers.weather} onSelect={(v) => updateModifier('weather', v)} onOpenPicker={(l, o, sel, cb) => setPicker({ label: l, options: o, selected: sel, onSelect: cb })} />
          </View>
          <View style={s.dropdownGrid}>
            <ModifierDropdown label="Energy" options={ENERGY_OPTIONS} selected={modifiers.energy} onSelect={(v) => updateModifier('energy', v)} onOpenPicker={(l, o, sel, cb) => setPicker({ label: l, options: o, selected: sel, onSelect: cb })} />
            <ModifierDropdown label="Vibe" options={VIBE_OPTIONS} selected={modifiers.vibe} onSelect={(v) => updateModifier('vibe', v)} onOpenPicker={(l, o, sel, cb) => setPicker({ label: l, options: o, selected: sel, onSelect: cb })} />
          </View>

          {/* Text input */}
          <Text style={s.modLabel}>Describe your dream</Text>
          <TextInput
            style={s.input}
            placeholder="My dog at the beach, flying through space, a cozy rainy day..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            maxLength={200}
            multiline
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{text.length}/200</Text>

        </ScrollView>

        {/* Bottom actions */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveButton, !canSave && s.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={18} color={canSave ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[s.saveButtonText, !canSave && s.saveButtonTextDisabled]}>
              {currentWish ? 'Update wish' : 'Make this wish'}
            </Text>
          </TouchableOpacity>

          {currentWish && (
            <TouchableOpacity style={s.clearButton} onPress={handleClear} activeOpacity={0.7}>
              <Text style={s.clearButtonText}>Clear wish</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Clear wish confirmation overlay */}
        {showClearConfirm && (
          <Pressable style={s.confirmOverlay} onPress={() => setShowClearConfirm(false)}>
            <Pressable style={s.confirmBox} onPress={() => {}}>
              <Text style={s.confirmTitle}>Clear wish</Text>
              <Text style={s.confirmMessage}>Are you sure you want to clear your wish?</Text>
              <View style={s.confirmActions}>
                <TouchableOpacity style={s.confirmCancel} onPress={() => setShowClearConfirm(false)} activeOpacity={0.7}>
                  <Text style={s.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmDestructive} onPress={() => { setShowClearConfirm(false); doClear(); }} activeOpacity={0.7}>
                  <Text style={s.confirmDestructiveText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        )}
      </View>

      {/* Modifier picker sheet */}
      <Modal visible={!!picker} transparent animationType="slide">
        <Pressable style={s.pickerBackdrop} onPress={() => setPicker(null)}>
          <View style={s.pickerBottomSheet}>
            <View style={s.pickerSheetHandle} />
            <Text style={s.pickerSheetTitle}>{picker?.label ?? ''}</Text>
            <TouchableOpacity
              style={[s.pickerSheetOption, !picker?.selected && s.pickerSheetOptionActive]}
              onPress={() => { picker?.onSelect(null); setPicker(null); }}
              activeOpacity={0.7}
            >
              <Text style={[s.pickerSheetOptionText, !picker?.selected && s.pickerSheetOptionTextActive]}>Any</Text>
              {!picker?.selected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
            </TouchableOpacity>
            {picker?.options.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[s.pickerSheetOption, picker?.selected === opt.key && s.pickerSheetOptionActive]}
                onPress={() => { Haptics.selectionAsync(); picker?.onSelect(opt.key); setPicker(null); }}
                activeOpacity={0.7}
              >
                <Text style={[s.pickerSheetOptionText, picker?.selected === opt.key && s.pickerSheetOptionTextActive]}>{opt.label}</Text>
                {picker?.selected === opt.key && <Ionicons name="checkmark" size={18} color={colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Friend picker modal */}
      <Modal visible={showFriendPicker} animationType="slide" statusBarTranslucent>
        <View style={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
          <View style={s.header}>
            <Text style={s.title}>Send to friends</Text>
            <TouchableOpacity onPress={() => { setShowFriendPicker(false); setFriendSearch(''); }} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.pickerSearch}
            placeholder="Search friends..."
            placeholderTextColor={colors.textMuted}
            value={friendSearch}
            onChangeText={setFriendSearch}
            autoFocus
          />
          <ScrollView style={s.pickerList}>
            {friends
              .filter((f) => !friendSearch || f.username.toLowerCase().includes(friendSearch.toLowerCase()))
              .map((friend) => {
                const selected = recipientIds.has(friend.userId);
                return (
                  <TouchableOpacity
                    key={friend.userId}
                    style={s.pickerRow}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setRecipientIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(friend.userId)) next.delete(friend.userId);
                        else next.add(friend.userId);
                        return next;
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    {friend.avatarUrl ? (
                      <Image source={{ uri: friend.avatarUrl }} style={s.pickerAvatar} />
                    ) : (
                      <View style={s.pickerAvatarFallback}>
                        <Text style={s.pickerAvatarText}>{friend.username[0].toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={s.pickerUsername}>{friend.username}</Text>
                    <View style={[s.checkbox, selected && s.checkboxActive]}>
                      {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
          <View style={s.footer}>
            <TouchableOpacity
              style={s.saveButton}
              onPress={() => { setShowFriendPicker(false); setFriendSearch(''); }}
              activeOpacity={0.7}
            >
              <Text style={s.saveButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  subtitle: {
    color: colors.textSecondary, fontSize: 14,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  content: { flex: 1, paddingHorizontal: 20 },
  footer: { paddingHorizontal: 20, paddingVertical: 16, gap: 8, borderTopWidth: 0.5, borderTopColor: colors.border },

  // Dropdowns
  sectionLabel: {
    color: colors.textSecondary, fontSize: 13, fontWeight: '600',
    marginBottom: 12,
  },
  dropdownGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  dropdownRow: { flex: 1 },
  dropdownLabel: {
    color: colors.textSecondary, fontSize: 12, fontWeight: '600',
    marginBottom: 6,
  },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dropdownValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  dropdownPlaceholder: { color: colors.textMuted },
  // Clear confirmation (absolute overlay, not a Modal)
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  confirmBox: {
    backgroundColor: colors.card, borderRadius: 16, padding: 24,
    width: '80%', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  confirmTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  confirmMessage: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 12, marginTop: 12, width: '100%' },
  confirmCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  confirmCancelText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  confirmDestructive: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.error,
  },
  confirmDestructiveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Modifier picker bottom sheet
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerBottomSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
  },
  pickerSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  pickerSheetTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pickerSheetOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  pickerSheetOptionActive: {},
  pickerSheetOptionText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  pickerSheetOptionTextActive: { color: colors.accent },

  // Text input
  input: {
    width: '100%', minHeight: 120, backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    color: colors.textPrimary, fontSize: 15, lineHeight: 21,
  },
  charCount: { color: colors.textMuted, fontSize: 12, alignSelf: 'flex-end', marginTop: 6, marginBottom: 8 },

  // Send to friends
  sendButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 20,
  },
  sendButtonText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },

  // Save button
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, width: '100%',
  },
  saveButtonDisabled: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  saveButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  saveButtonTextDisabled: { color: colors.textSecondary },
  clearButton: { paddingVertical: 8, alignItems: 'center' },
  clearButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

  // Checkbox
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.accent, borderColor: colors.accent },

  // Friend picker
  pickerSearch: {
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    color: colors.textPrimary, fontSize: 15,
    marginHorizontal: 20, marginTop: 12, marginBottom: 8,
  },
  pickerList: { flex: 1, paddingHorizontal: 20 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  pickerAvatar: { width: 40, height: 40, borderRadius: 20 },
  pickerAvatarFallback: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerAvatarText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  pickerUsername: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
});
