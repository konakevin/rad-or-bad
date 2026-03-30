import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '@/components/CustomAlert';
import { useFriendshipStatus } from '@/hooks/useFriendshipStatus';
import { colors } from '@/constants/theme';
import type { VibeSuggestion } from '@/hooks/useVibeSuggestions';

function getVibeColor(score: number): string {
  if (score >= 80) return '#4CAA64';
  if (score >= 60) return '#FFD700';
  if (score >= 40) return '#FF8C00';
  return '#CC6666';
}

interface Props {
  suggestion: VibeSuggestion;
  onStartVibing: (userId: string) => void;
  onCancelRequest?: (userId: string) => void;
  localSent?: boolean;
}

export function VibeSuggestionRow({ suggestion, onStartVibing, onCancelRequest, localSent }: Props) {
  const scoreColor = getVibeColor(suggestion.vibeScore);
  const { data: status = 'none' } = useFriendshipStatus(suggestion.userId);

  const isPending = localSent || status === 'pending_sent' || status === 'pending_received';
  const isFriends = status === 'friends';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/user/${suggestion.userId}`)}
      activeOpacity={0.7}
    >
      {suggestion.avatarUrl ? (
        <View style={[styles.avatarRing, { borderColor: scoreColor }]}>
          <Image source={{ uri: suggestion.avatarUrl }} style={styles.avatar} />
        </View>
      ) : (
        <View style={[styles.avatarRing, { borderColor: scoreColor }]}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{suggestion.username[0].toUpperCase()}</Text>
          </View>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.username}>{suggestion.username}</Text>
        <Text style={[styles.score, { color: scoreColor }]}>
          {suggestion.vibeScore}% vibes · {suggestion.sharedCount} shared
        </Text>
      </View>

      {isFriends ? (
        <View style={styles.friendsButton}>
          <Ionicons name="checkmark-circle" size={14} color="#4CAA64" />
          <Text style={styles.friendsButtonText}>Vibers</Text>
        </View>
      ) : isPending ? (
        <TouchableOpacity
          style={styles.requestedButton}
          onPress={() => {
            showAlert('Cancel request?', 'Withdraw your vibe request?', [
              { text: 'No', style: 'cancel' },
              { text: 'Cancel request', style: 'destructive', onPress: () => onCancelRequest?.(suggestion.userId) },
            ]);
          }}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Text style={styles.requestedButtonText}>Requested</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => onStartVibing(suggestion.userId)}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <View style={styles.vibeButton}>
            <Text style={styles.vibeButtonText}>Vibe</Text>
          </View>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.card,
    gap: 12,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  username: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  score: {
    fontSize: 12,
    fontWeight: '600',
  },
  vibeButton: {
    backgroundColor: '#FF4500',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  vibeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  requestedButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  requestedButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  friendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  friendsButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
