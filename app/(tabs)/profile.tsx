import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useFollowersList } from '@/hooks/useFollowersList';
import { useFollowingList } from '@/hooks/useFollowingList';
import { useFollowingIds } from '@/hooks/useFollowingIds';
import { useToggleFollow } from '@/hooks/useToggleFollow';
import { PostGrid } from '@/components/PostGrid';
import { GradientUsername } from '@/components/GradientUsername';
import { colors } from '@/constants/theme';
import { ProfileStatsRow, type StatsTab } from '@/components/ProfileStatsRow';
import { FollowUserRow } from '@/components/FollowUserRow';
import { StreakRow, StreakEmptyState, VoteWithFriendsButton } from '@/components/StreakRow';
import { FriendRequestRow } from '@/components/FriendRequestRow';
import { useTopStreaks } from '@/hooks/useTopStreaks';
import { useFriendsList, type FriendUser } from '@/hooks/useFriendsList';
import { usePendingRequests } from '@/hooks/usePendingRequests';
import { useRespondFriendRequest } from '@/hooks/useRespondFriendRequest';
import { useRemoveFriend } from '@/hooks/useRemoveFriend';
import { FlatList } from 'react-native';
import type { FollowUser } from '@/hooks/useFollowersList';
import type { VibeSyncStreak } from '@/hooks/useTopStreaks';

type Tab = 'posts' | 'saved' | 'friends' | 'followers' | 'following' | 'streaks';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('posts');

  const { data: profile } = usePublicProfile(user?.id ?? '');
  const { data: followers = [], isLoading: loadingFollowers } = useFollowersList(user?.id ?? '');
  const { data: following = [], isLoading: loadingFollowing } = useFollowingList(user?.id ?? '');
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { mutate: toggleFollow } = useToggleFollow();
  const { data: streaks = [], isLoading: loadingStreaks } = useTopStreaks(user?.id ?? '');
  const { data: friends = [], isLoading: loadingFriends } = useFriendsList(user?.id ?? '');
  const { data: pendingRequests = [] } = usePendingRequests();
  const { mutate: respondRequest } = useRespondFriendRequest();
  const { mutate: removeFriend } = useRemoveFriend();

  function handleFollowUser(targetId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow({ userId: targetId, currentlyFollowing: followingIds.has(targetId) });
  }

  function handleStatsTabChange(tab: StatsTab) {
    setActiveTab(tab);
  }

  const statsActiveTab: StatsTab =
    activeTab === 'saved' ? 'posts' : (activeTab as StatsTab);

  const header = (
    <>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <GradientUsername
              username={user?.user_metadata?.username ?? 'you'}
              rank={profile?.user_rank}
              style={styles.username}
              avatarUrl={profile?.avatar_url}
              showAvatar
              avatarSize={32}
            />
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={12}>
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ProfileStatsRow
          postCount={profile?.postCount ?? 0}
          friendCount={profile?.friendCount ?? 0}
          followerCount={profile?.followerCount ?? 0}
          followingCount={profile?.followingCount ?? 0}
          activeTab={statsActiveTab}
          onTabChange={handleStatsTabChange}
          pendingCount={pendingRequests.length}
        />
      </View>

      {(activeTab === 'posts' || activeTab === 'saved') && (
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={16} color={activeTab === 'posts' ? colors.textPrimary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>My Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
            onPress={() => setActiveTab('saved')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'saved' ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={activeTab === 'saved' ? colors.textPrimary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>Saved</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  if (activeTab === 'posts' || activeTab === 'saved') {
    return (
      <SafeAreaView style={styles.root}>
        <PostGrid
          source={activeTab === 'posts' ? { type: 'own' } : { type: 'saved' }}
          isOwn={activeTab === 'posts'}
          emptyText={activeTab === 'posts' ? 'No posts yet' : 'Nothing saved yet'}
          ListHeaderComponent={header}
        />
      </SafeAreaView>
    );
  }

  if (activeTab === 'friends') {
    // Combine pending requests + accepted friends into one list
    const sections = [
      ...pendingRequests.map((r) => ({ type: 'request' as const, data: r })),
      ...friends.map((f) => ({ type: 'friend' as const, data: f })),
    ];

    return (
      <SafeAreaView style={styles.root}>
        <FlatList
          key="friends"
          data={sections}
          keyExtractor={(item) => item.type === 'request' ? `req-${item.data.requesterId}` : `fr-${item.data.id}`}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.center}>
              {loadingFriends
                ? <ActivityIndicator color={colors.textSecondary} />
                : <Text style={styles.emptyText}>No friends yet</Text>
              }
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'request') {
              return (
                <FriendRequestRow
                  request={item.data}
                  onAccept={(id) => respondRequest({ requesterId: id, accept: true })}
                  onDecline={(id) => respondRequest({ requesterId: id, accept: false })}
                />
              );
            }
            return (
              <FollowUserRow
                item={item.data}
                isFollowing={followingIds.has(item.data.id)}
                onFollow={handleFollowUser}
              />
            );
          }}
        />
      </SafeAreaView>
    );
  }

  if (activeTab === 'streaks') {
    return (
      <SafeAreaView style={styles.root}>
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
      </SafeAreaView>
    );
  }

  const listData = activeTab === 'followers' ? followers : following;
  const isLoadingList = activeTab === 'followers' ? loadingFollowers : loadingFollowing;
  const emptyLabel = activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet';

  return (
    <SafeAreaView style={styles.root}>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    marginBottom: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  username: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  email: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.flame },
  tabText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.textPrimary },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
});
