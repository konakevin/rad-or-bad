import { useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSequence, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePost } from '@/hooks/usePost';
import { useFriendVotesOnPost } from '@/hooks/useFriendVotesOnPost';
import { GradientUsername } from '@/components/GradientUsername';
import { colors } from '@/constants/theme';
import type { FriendVote } from '@/hooks/useFeed';

// ── Friend row with animated reveal ─────────────────────────────────────────

function FriendRevealRow({ friend, userVote, index }: {
  friend: FriendVote;
  userVote: 'rad' | 'bad';
  index: number;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const bgOpacity = useSharedValue(0);

  const isMatch = friend.vote === userVote;

  useEffect(() => {
    const delay = 150 + index * 80;
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    scale.value = withDelay(delay, withSequence(
      withTiming(1.08, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 100 }),
    ));
    bgOpacity.value = withDelay(delay, withSequence(
      withTiming(0.3, { duration: 100 }),
      withTiming(0.08, { duration: 400 }),
    ));
  }, []);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const rowBgStyle = useAnimatedStyle(() => ({
    backgroundColor: isMatch
      ? `rgba(255, 215, 0, ${bgOpacity.value})`
      : `rgba(244, 33, 46, ${bgOpacity.value})`,
  }));

  const initial = (friend.username || '?')[0].toUpperCase();

  return (
    <Animated.View style={[styles.friendRow, rowBgStyle]}>
      {/* Avatar + username */}
      <View style={styles.friendInfo}>
        {friend.avatar_url ? (
          <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
        ) : (
          <View style={styles.friendAvatarFallback}>
            <Text style={styles.friendAvatarInitial}>{initial}</Text>
          </View>
        )}
        <GradientUsername
          username={friend.username}
          rank={null}
          style={styles.friendUsername}
        />
      </View>

      {/* Vote badge — staggered reveal */}
      <Animated.View style={[
        styles.revealedBadge,
        isMatch ? styles.matchBadge : styles.mismatchBadge,
        revealStyle,
      ]}>
        <Ionicons
          name={friend.vote === 'rad' ? 'thumbs-up' : 'thumbs-down'}
          size={14}
          color={friend.vote === 'rad' ? '#FFD700' : '#6699EE'}
        />
        <Text style={[
          styles.revealedText,
          { color: friend.vote === 'rad' ? '#FFD700' : '#6699EE' },
        ]}>
          {friend.vote === 'rad' ? 'RAD' : 'BAD'}
        </Text>
        {isMatch ? (
          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={{ marginLeft: 2 }} />
        ) : (
          <Ionicons name="close-circle" size={14} color="#F4212E" style={{ marginLeft: 2 }} />
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function FriendRevealScreen() {
  const { uploadId, vote } = useLocalSearchParams<{ uploadId: string; vote: string }>();
  const userVote = (vote === 'rad' || vote === 'bad') ? vote : 'rad';
  const { data: post } = usePost(uploadId);
  const { data: friendVotes = [] } = useFriendVotesOnPost(uploadId);

  const matchCount = friendVotes.filter((f) => f.vote === userVote).length;
  const thumbnailUrl = post?.thumbnail_url ?? post?.image_url;

  // Haptic on mount based on match results
  useEffect(() => {
    if (!friendVotes.length) return;
    if (matchCount > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [friendVotes.length]);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friend Votes</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Post thumbnail + your vote */}
      <View style={styles.thumbnailContainer}>
        {thumbnailUrl && (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} contentFit="cover" />
        )}
        <View style={styles.yourVotePill}>
          <Ionicons
            name={userVote === 'rad' ? 'thumbs-up' : 'thumbs-down'}
            size={12}
            color={userVote === 'rad' ? '#FFD700' : '#6699EE'}
          />
          <Text style={[styles.yourVoteText, { color: userVote === 'rad' ? '#FFD700' : '#6699EE' }]}>
            You voted {userVote.toUpperCase()}
          </Text>
        </View>
        {post?.caption && (
          <Text style={styles.thumbnailCaption} numberOfLines={1}>{post.caption}</Text>
        )}
      </View>

      {/* Summary */}
      <View style={styles.resultSummary}>
        <Text style={styles.resultText}>
          {matchCount > 0
            ? `${matchCount} ${matchCount === 1 ? 'match' : 'matches'} out of ${friendVotes.length}`
            : 'No matches this time!'
          }
        </Text>
      </View>

      {/* Friend list — votes reveal with staggered animation */}
      <FlatList
        data={friendVotes}
        keyExtractor={(item) => item.username}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <FriendRevealRow
            friend={item}
            userVote={userVote}
            index={index}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No friends voted on this post</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  thumbnailContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  thumbnail: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  yourVotePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yourVoteText: {
    fontSize: 12,
    fontWeight: '700',
  },
  thumbnailCaption: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 40,
    textAlign: 'center',
  },
  resultSummary: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  resultText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 20,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
  },
  friendAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarInitial: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  friendUsername: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  revealedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  matchBadge: {
    borderColor: 'rgba(76, 175, 80, 0.4)',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  mismatchBadge: {
    borderColor: 'rgba(244, 33, 46, 0.3)',
    backgroundColor: 'rgba(244, 33, 46, 0.08)',
  },
  revealedText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
});
