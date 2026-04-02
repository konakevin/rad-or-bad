import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import type { FollowUser } from '@/hooks/useFollowersList';
import { colors } from '@/constants/theme';

interface Props {
  item: FollowUser;
  isFollowing: boolean;
  onFollow: (userId: string) => void;
}

export function FollowUserRow({ item, isFollowing, onFollow }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isSelf = item.id === currentUserId;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => isSelf ? null : router.push(`/user/${item.id}`)}
      activeOpacity={0.7}
    >
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.username || '?')[0].toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.username}>{item.username}</Text>
      {!isSelf && (
        <TouchableOpacity
          style={[styles.pill, isFollowing && styles.followingPill]}
          onPress={() => onFollow(item.id)}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Text style={[styles.pillText, isFollowing && styles.followingPillText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  username: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  pill: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  followingPill: { borderColor: colors.border, backgroundColor: colors.card },
  pillText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  followingPillText: { color: colors.textSecondary },
});
