/**
 * DreamWishBadge — compact button showing wish status.
 * Tap to open the DreamWishSheet.
 */

import { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { useDreamWish } from '@/hooks/useDreamWish';
import { DreamWishSheet } from '@/components/DreamWishSheet';

interface Props {
  /** Visual style */
  variant?: 'pill' | 'card';
}

export function DreamWishBadge({ variant = 'pill' }: Props) {
  const { wish } = useDreamWish();
  const [showSheet, setShowSheet] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={variant === 'card' ? s.card : s.pill}
        onPress={() => setShowSheet(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={wish ? 'moon' : 'moon-outline'}
          size={variant === 'card' ? 18 : 14}
          color={wish ? colors.accent : colors.textSecondary}
        />
        <Text
          style={variant === 'card' ? s.cardText : s.pillText}
          numberOfLines={1}
        >
          {wish ?? 'Make a wish'}
        </Text>
        {wish && (
          <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
        )}
      </TouchableOpacity>

      <DreamWishSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        currentWish={wish}
      />
    </>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.overlayWhite, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  pillText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600',
    maxWidth: 140,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  cardText: {
    flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '600',
  },
});
