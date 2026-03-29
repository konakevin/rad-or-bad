import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
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
}

export function VibeSuggestionRow({ suggestion, onStartVibing }: Props) {
  const scoreColor = getVibeColor(suggestion.vibeScore);

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
          {suggestion.vibeScore}% match · {suggestion.sharedCount} shared
        </Text>
      </View>

      <TouchableOpacity
        style={styles.vibeButton}
        onPress={() => onStartVibing(suggestion.userId)}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Text style={styles.vibeButtonText}>Vibe</Text>
      </TouchableOpacity>
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
    backgroundColor: '#FFD700',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  vibeButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
});
