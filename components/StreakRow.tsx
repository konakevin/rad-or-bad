import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, Href } from 'expo-router';
import { GradientUsername } from '@/components/GradientUsername';
import { colors } from '@/constants/theme';
import type { VibeSyncStreak } from '@/hooks/useTopStreaks';

interface Props {
  streak: VibeSyncStreak;
}

export function StreakRow({ streak }: Props) {
  const isRad = streak.streakType === 'rad';
  const accentColor = isRad ? '#FF4500' : '#6699EE';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => {
        if (streak.friendId) router.push(`/user/${streak.friendId}`);
      }}
      disabled={!streak.friendId}
      activeOpacity={0.7}
    >
      {streak.friendAvatar ? (
        <Image source={{ uri: streak.friendAvatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{streak.friendUsername[0].toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.info}>
        <GradientUsername
          username={streak.friendUsername}
          rank={streak.friendRank}
          style={styles.username}
        />
      </View>
      <View style={styles.streakBadges}>
        {streak.radStreak > 0 && (
          <View style={[styles.streakBadge, { borderColor: '#FF4500' }]}>
            <Ionicons name="flame" size={14} color="#FF4500" />
            <Text style={[styles.streakCount, { color: '#FF4500' }]}>{streak.radStreak}</Text>
          </View>
        )}
        {streak.badStreak > 0 && (
          <View style={[styles.streakBadge, { borderColor: '#6699EE' }]}>
            <Ionicons name="thumbs-down" size={14} color="#6699EE" />
            <Text style={[styles.streakCount, { color: '#6699EE' }]}>{streak.badStreak}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function VoteWithFriendsButton() {
  return (
    <TouchableOpacity
      style={styles.ctaButton}
      onPress={() => router.push('/(tabs)?mode=friends' as Href)}
      activeOpacity={0.7}
    >
      <Ionicons name="flash" size={16} color="#FFD700" />
      <Text style={styles.ctaText}>Vote with friends</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export function StreakEmptyState() {
  return (
    <View style={styles.empty}>
      <Ionicons name="flash-outline" size={40} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No streaks yet</Text>
      <Text style={styles.emptySub}>
        Vote on posts your friends have voted on to build streaks!
      </Text>
      <TouchableOpacity
        style={styles.goVoteButton}
        onPress={() => router.push('/(tabs)?mode=friends' as Href)}
        activeOpacity={0.7}
      >
        <Ionicons name="flash" size={16} color="#FFD700" />
        <Text style={styles.goVoteText}>Go vote</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  info: {
    flex: 1,
    gap: 2,
  },
  username: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  best: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  streakBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streakCount: {
    fontSize: 15,
    fontWeight: '800',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  goVoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goVoteText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
