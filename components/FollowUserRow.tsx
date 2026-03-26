import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { FollowUser } from '@/hooks/useFollowersList';

interface Props {
  item: FollowUser;
  isFollowing: boolean;
  onFollow: (userId: string) => void;
}

export function FollowUserRow({ item, isFollowing, onFollow }: Props) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/user/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
      </View>
      <Text style={styles.username}>@{item.username}</Text>
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
    borderBottomColor: '#1A1A1A',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2F2F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  username: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  pill: {
    borderWidth: 1,
    borderColor: '#FF4500',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  followingPill: { borderColor: '#2F2F2F', backgroundColor: '#1A1A1A' },
  pillText: { color: '#FF4500', fontSize: 13, fontWeight: '600' },
  followingPillText: { color: '#71767B' },
});
