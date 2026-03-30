import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useFollowersList } from '@/hooks/useFollowersList';
import { useFollowingList } from '@/hooks/useFollowingList';
import { useFollowingIds } from '@/hooks/useFollowingIds';
import { useToggleFollow } from '@/hooks/useToggleFollow';
import { useAuthStore } from '@/store/auth';
import { PostGrid } from '@/components/PostGrid';
import { GradientUsername } from '@/components/GradientUsername';
import { colors } from '@/constants/theme';
import { ProfileStatsRow, type StatsTab } from '@/components/ProfileStatsRow';
import { FollowUserRow } from '@/components/FollowUserRow';
import { StreakRow, StreakEmptyState, VoteWithFriendsButton } from '@/components/StreakRow';
import { FriendButton } from '@/components/FriendButton';
import { useTopStreaks } from '@/hooks/useTopStreaks';
import { useVibeStats } from '@/hooks/useVibeStats';
import { useFriendIds } from '@/hooks/useFriendIds';
import { useFriendsList, type FriendUser } from '@/hooks/useFriendsList';
import { useSendFriendRequest } from '@/hooks/useSendFriendRequest';
import { useFriendshipStatus } from '@/hooks/useFriendshipStatus';
import { useRespondFriendRequest } from '@/hooks/useRespondFriendRequest';
import { useRemoveFriend } from '@/hooks/useRemoveFriend';
import { useReport } from '@/hooks/useReport';
import { useBlockedIds, useToggleBlock } from '@/hooks/useBlockUser';
import { showAlert } from '@/components/CustomAlert';
import type { FollowUser } from '@/hooks/useFollowersList';
import type { VibeSyncStreak } from '@/hooks/useTopStreaks';

type Tab = 'posts' | 'friends' | 'followers' | 'following' | 'streaks';

export default function PublicProfileScreen() {
  const { userId, viewedPost } = useLocalSearchParams<{ userId: string; viewedPost?: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?.id === userId;
  const { translateX, panHandlers } = useSwipeBack();

  const [activeTab, setActiveTab] = useState<Tab>('posts');

  const { data: profile, isLoading: profileLoading } = usePublicProfile(userId);
  const { data: followers = [], isLoading: loadingFollowers } = useFollowersList(userId);
  const { data: following = [], isLoading: loadingFollowing } = useFollowingList(userId);
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { mutate: toggleFollow } = useToggleFollow();
  const { data: streaks = [], isLoading: loadingStreaks } = useTopStreaks(userId);
  const { data: friendIds = new Set<string>() } = useFriendIds();
  const { data: friendsList = [], isLoading: loadingFriends } = useFriendsList(userId);
  const { mutate: sendFriendRequest } = useSendFriendRequest();
  const { mutate: respondRequest } = useRespondFriendRequest();
  const { mutate: removeFriend } = useRemoveFriend();
  const { data: friendshipStatus = 'none' } = useFriendshipStatus(userId);
  const { mutate: report } = useReport();
  const { data: blockedIds = new Set<string>() } = useBlockedIds();
  const { mutate: toggleBlock } = useToggleBlock();
  const isBlocked = blockedIds.has(userId);

  function handleMoreMenu() {
    showAlert('', '', [
      {
        text: isBlocked ? 'Unblock User' : 'Block User',
        style: isBlocked ? 'default' : 'destructive',
        onPress: () => {
          toggleBlock({ userId, currentlyBlocked: isBlocked });
          if (!isBlocked) {
            router.replace('/(tabs)');
          }
        },
      },
      {
        text: 'Report User',
        style: 'destructive',
        onPress: () => {
          showAlert('Report User', 'Why are you reporting this user?', [
            { text: 'Spam', style: 'destructive', onPress: () => { report({ reason: 'spam', reportedUserId: userId }); showAlert('Reported', 'Thanks for letting us know.', [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]); } },
            { text: 'Harassment', style: 'destructive', onPress: () => { report({ reason: 'harassment', reportedUserId: userId }); showAlert('Reported', 'Thanks for letting us know.', [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]); } },
            { text: 'Inappropriate', style: 'destructive', onPress: () => { report({ reason: 'inappropriate', reportedUserId: userId }); showAlert('Reported', 'Thanks for letting us know.', [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]); } },
            { text: 'Cancel', style: 'cancel' },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
  const { data: vibeStats } = useVibeStats(userId);

  const isFollowing = followingIds.has(userId);

  function handleFollow() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow({ userId, currentlyFollowing: isFollowing });
  }

  function handleFollowUser(targetId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow({ userId: targetId, currentlyFollowing: followingIds.has(targetId) });
  }

  if (profileLoading || !profile) {
    return (
      <Animated.View {...panHandlers} style={[styles.root, { transform: [{ translateX }] }]}><SafeAreaView style={styles.root}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      </SafeAreaView></Animated.View>
    );
  }

  const backButton = (
    <View style={styles.backRow}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
        <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
      </TouchableOpacity>
      {!isOwnProfile && (
        <TouchableOpacity onPress={handleMoreMenu} style={styles.backButton} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const header = (
    <View style={styles.header}>
        <View style={styles.headerTop}>
          <GradientUsername username={profile.username} rank={profile.user_rank} style={styles.username} avatarUrl={profile.avatar_url} showAvatar avatarSize={32} />
          {!isOwnProfile && (
            <View style={styles.headerButtons}>
              {friendshipStatus !== 'friends' && (
                <TouchableOpacity
                  style={[styles.followButton, isFollowing && styles.followingButton]}
                  onPress={handleFollow}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
              <FriendButton
                status={friendshipStatus}
                onSendRequest={() => sendFriendRequest(userId)}
                onCancelRequest={() => removeFriend(userId)}
                onAccept={() => respondRequest({ requesterId: userId, accept: true })}
                onDecline={() => respondRequest({ requesterId: userId, accept: false })}
                onRemove={() => removeFriend(userId)}
              />
            </View>
          )}
        </View>

        {!isOwnProfile && vibeStats && (vibeStats.vibeScore !== null || vibeStats.bestStreak > 0) && (
          <VibeStatsRow vibeScore={vibeStats.vibeScore} bestStreak={vibeStats.bestStreak} sharedCount={vibeStats.sharedCount} isVibing={vibeStats.isVibing} />
        )}

        <ProfileStatsRow
          postCount={profile.postCount}
          friendCount={profile.friendCount}
          followerCount={profile.followerCount}
          followingCount={profile.followingCount}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hiddenTabs={isOwnProfile ? [] : ['friends', 'streaks']}
        />
      </View>
  );

  if (activeTab === 'posts') {
    return (
      <Animated.View {...panHandlers} style={[styles.root, { transform: [{ translateX }] }]}><SafeAreaView style={styles.root}>
        {backButton}
        <PostGrid
          source={{ type: 'user', userId }}
          emptyText="No posts yet"
          ListHeaderComponent={header}
          highlightPostId={viewedPost}
        />
      </SafeAreaView></Animated.View>
    );
  }

  if (activeTab === 'friends') {
    return (
      <Animated.View {...panHandlers} style={[styles.root, { transform: [{ translateX }] }]}><SafeAreaView style={styles.root}>
        {backButton}
        <FlatList<FriendUser>
          key="friends"
          data={friendsList}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.center}>
              {loadingFriends
                ? <ActivityIndicator color={colors.textSecondary} />
                : <Text style={styles.emptyText}>No friends yet</Text>
              }
            </View>
          }
          renderItem={({ item }) => (
            <FollowUserRow
              item={item}
              isFollowing={followingIds.has(item.id)}
              onFollow={handleFollowUser}
            />
          )}
        />
      </SafeAreaView></Animated.View>
    );
  }

  if (activeTab === 'streaks') {
    return (
      <Animated.View {...panHandlers} style={[styles.root, { transform: [{ translateX }] }]}><SafeAreaView style={styles.root}>
        {backButton}
        <FlatList<VibeSyncStreak>
          key="streaks"
          data={streaks}
          keyExtractor={(item) => item.friendId || item.friendUsername}
          ListHeaderComponent={<>{header}<VoteWithFriendsButton /></>}
          ListEmptyComponent={
            <View style={styles.center}>
              {loadingStreaks
                ? <ActivityIndicator color={colors.textSecondary} />
                : <StreakEmptyState />
              }
            </View>
          }
          renderItem={({ item }) => <StreakRow streak={item} />}
        />
      </SafeAreaView></Animated.View>
    );
  }

  const listData = activeTab === 'followers' ? followers : following;
  const isLoadingList = activeTab === 'followers' ? loadingFollowers : loadingFollowing;
  const emptyLabel = activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet';

  return (
    <Animated.View {...panHandlers} style={[styles.root, { transform: [{ translateX }] }]}><SafeAreaView style={styles.root}>
      {backButton}
      <FlatList<FollowUser>
        key="users"
        data={listData}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.center}>
            {isLoadingList
              ? <ActivityIndicator color={colors.textSecondary} />
              : <Text style={styles.emptyText}>{emptyLabel}</Text>
            }
          </View>
        }
        renderItem={({ item }) => (
          <FollowUserRow
            item={item}
            isFollowing={followingIds.has(item.id)}
            onFollow={handleFollowUser}
          />
        )}
      />
    </SafeAreaView></Animated.View>
  );
}

function getVibeColor(score: number): string {
  if (score >= 80) return '#4CAA64';
  if (score >= 60) return '#FFD700';
  if (score >= 40) return '#FF8C00';
  return '#CC6666';
}

function VibeStatsRow({ vibeScore, bestStreak, sharedCount, isVibing }: {
  vibeScore: number | null;
  bestStreak: number;
  sharedCount: number;
  isVibing: boolean;
}) {
  const hasScore = vibeScore !== null;
  const scoreColor = hasScore ? getVibeColor(vibeScore) : colors.textSecondary;

  return (
    <View style={styles.vibeRow}>
      {hasScore && (
        <View style={styles.vibePill}>
          <View style={[styles.vibeDot, { backgroundColor: scoreColor }]} />
          <Text style={[styles.vibeScoreText, { color: scoreColor }]}>{vibeScore}% vibes</Text>
        </View>
      )}
      {!hasScore && sharedCount > 0 && (
        <View style={styles.vibePill}>
          <Text style={styles.vibeHintText}>{5 - sharedCount} more votes to see match</Text>
        </View>
      )}
      {bestStreak > 0 && isVibing && (
        <View style={styles.vibePill}>
          <Ionicons name="flame" size={14} color="#FF6B35" />
          <Text style={styles.vibeStreakText}>Best: {bestStreak}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  backRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    marginBottom: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  followButton: {
    borderWidth: 1.5,
    borderColor: colors.flame,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  followingButton: { borderColor: colors.border, backgroundColor: colors.card },
  followButtonText: { color: colors.flame, fontSize: 14, fontWeight: '700' },
  followingButtonText: { color: colors.textSecondary },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  vibePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vibeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  vibeScoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  vibeHintText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  vibeStreakText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
