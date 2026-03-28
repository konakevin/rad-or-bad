import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
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
import { useTopStreaks } from '@/hooks/useTopStreaks';
import type { FollowUser } from '@/hooks/useFollowersList';
import type { VibeSyncStreak } from '@/hooks/useTopStreaks';

type Tab = 'posts' | 'followers' | 'following' | 'streaks';

export default function PublicProfileScreen() {
  const { userId, viewedPost } = useLocalSearchParams<{ userId: string; viewedPost?: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?.id === userId;

  const [activeTab, setActiveTab] = useState<Tab>('posts');

  const { data: profile, isLoading: profileLoading } = usePublicProfile(userId);
  const { data: followers = [], isLoading: loadingFollowers } = useFollowersList(userId);
  const { data: following = [], isLoading: loadingFollowing } = useFollowingList(userId);
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { mutate: toggleFollow } = useToggleFollow();
  const { data: streaks = [], isLoading: loadingStreaks } = useTopStreaks(userId);

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
      <SafeAreaView style={styles.root}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      </SafeAreaView>
    );
  }

  const backButton = (
    <View style={styles.backRow}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const header = (
    <View style={styles.header}>
        <View style={styles.headerTop}>
          <GradientUsername username={profile.username} rank={profile.user_rank} style={styles.username} avatarUrl={profile.avatar_url} showAvatar avatarSize={32} />
          {!isOwnProfile && (
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
        </View>

        <ProfileStatsRow
          postCount={profile.postCount}
          followerCount={profile.followerCount}
          followingCount={profile.followingCount}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </View>
  );

  if (activeTab === 'posts') {
    return (
      <SafeAreaView style={styles.root}>
        {backButton}
        <PostGrid
          source={{ type: 'user', userId }}
          emptyText="No posts yet"
          ListHeaderComponent={header}
          highlightPostId={viewedPost}
        />
      </SafeAreaView>
    );
  }

  if (activeTab === 'streaks') {
    return (
      <SafeAreaView style={styles.root}>
        {backButton}
        <FlatList<VibeSyncStreak>
          key="streaks"
          data={streaks}
          keyExtractor={(item) => item.friendId}
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
      </SafeAreaView>
    );
  }

  const listData = activeTab === 'followers' ? followers : following;
  const isLoadingList = activeTab === 'followers' ? loadingFollowers : loadingFollowing;
  const emptyLabel = activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet';

  return (
    <SafeAreaView style={styles.root}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  backRow: { paddingHorizontal: 8, paddingVertical: 4 },
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
});
