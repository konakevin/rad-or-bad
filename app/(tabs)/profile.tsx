import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useFeedStore } from '@/store/feed';
import { DreamWishBadge } from '@/components/DreamWishBadge';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
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
import { FriendRequestRow } from '@/components/FriendRequestRow';
import { useFriendsList, type FriendUser } from '@/hooks/useFriendsList';
import { usePendingRequests } from '@/hooks/usePendingRequests';
import { useRespondFriendRequest } from '@/hooks/useRespondFriendRequest';
import { useRemoveFriend } from '@/hooks/useRemoveFriend';

import { FlatList } from 'react-native';
import type { FollowUser } from '@/hooks/useFollowersList';

type Tab = 'posts' | 'saved' | 'friends' | 'followers' | 'following' | 'streaks';

const HOT_FLAME: [string, string, ...string[]] = [colors.accent, '#FF8C00', colors.accent];
const COLD_FLAME: [string, string, ...string[]] = ['#44DDCC', '#6699EE', '#BB88EE'];

function GradientFlame({ colors, size }: { colors: [string, string, ...string[]]; size: number }) {
  return (
    <MaskedView maskElement={<Ionicons name="flame" size={size} color="#FFF" />}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ width: size, height: size }} />
    </MaskedView>
  );
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const profileResetToken = useFeedStore((s) => s.profileResetToken);
  const queryClient = useQueryClient();

  // Reset to posts tab on focus or when profile tab icon is re-tapped
  useFocusEffect(useCallback(() => {
    setActiveTab('posts');
  }, []));

  useEffect(() => {
    if (profileResetToken > 0) {
      setActiveTab('posts');
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
    }
  }, [profileResetToken]);

  const { data: profile } = usePublicProfile(user?.id ?? '');
  const { data: followers = [], isLoading: loadingFollowers } = useFollowersList(user?.id ?? '');
  const { data: following = [], isLoading: loadingFollowing } = useFollowingList(user?.id ?? '');
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { mutate: toggleFollow } = useToggleFollow();
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
              rank={null}
              style={styles.username}
              avatarUrl={profile?.avatar_url}
              showAvatar
              avatarSize={32}
            />

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
          hiddenTabs={['streaks']}
        />
      </View>

      {/* Streak preview card — hidden during dev, uncomment to re-enable
      {streaks.length > 0 && (activeTab === 'posts' || activeTab === 'saved') && (
        <View style={styles.streakCard}>
          <View style={styles.streakCardHeader}>
            <View style={styles.streakCardTitleRow}>
              <Ionicons name="flame" size={18} color={colors.accent} />
              <Text style={styles.streakCardTitle}>Vibe streaks</Text>
            </View>
            <TouchableOpacity
              style={styles.goVibeButton}
              onPress={() => router.push('/(tabs)?mode=friends' as Href)}
              activeOpacity={0.7}
            >
              <Ionicons name="flash" size={16} color={colors.accent} />
              <Text style={styles.goVibeText}>Go Vibe</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled style={styles.streakCardScroll} contentContainerStyle={styles.streakCardAvatars}>
            {[...streaks].sort((a, b) => (b.radStreak + b.badStreak) - (a.radStreak + a.badStreak)).map((s) => (
                <TouchableOpacity
                  key={s.friendId || s.friendUsername}
                  style={styles.streakCardItem}
                  onPress={() => s.friendId ? router.push(`/user/${s.friendId}`) : null}
                  activeOpacity={0.7}
                >
                  <View style={styles.streakCardRing}>
                    {s.friendAvatar ? (
                      <Image source={{ uri: s.friendAvatar }} style={styles.streakCardAvatar} />
                    ) : (
                      <View style={styles.streakCardAvatarFallback}>
                        <Text style={styles.streakCardAvatarText}>{s.friendUsername[0].toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.streakCardName} numberOfLines={1}>{s.friendUsername}</Text>
                  {(s.radStreak > 0 || s.badStreak > 0) && (
                    <View style={styles.streakScoreRow}>
                      {s.radStreak > 0 && (<>
                        <GradientFlame colors={HOT_FLAME} size={15} />
                        <Text style={styles.streakScoreNum}>{s.radStreak}</Text>
                      </>)}
                      {s.radStreak > 0 && s.badStreak > 0 && (
                        <Text style={styles.streakScoreSep}>·</Text>
                      )}
                      {s.badStreak > 0 && (<>
                        <GradientFlame colors={COLD_FLAME} size={15} />
                        <Text style={styles.streakScoreNum}>{s.badStreak}</Text>
                      </>)}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}
      */}

      {(activeTab === 'posts' || activeTab === 'saved') && (
        <>
          <TouchableOpacity
            style={styles.discoverButton}
            onPress={() => router.push('/discoverVibers')}
            activeOpacity={0.7}
          >
            <Ionicons name="moon" size={14} color={colors.accent} />
            <Text style={styles.discoverButtonText}>Find similar dreamers</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.wishRow}>
            <DreamWishBadge variant="card" />
          </View>
        </>
      )}

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
    // Combine pending requests + accepted friends
    type ListItem =
      | { type: 'request'; data: (typeof pendingRequests)[number] }
      | { type: 'friend'; data: FriendUser };

    const sections: ListItem[] = [
      ...pendingRequests.map((r) => ({ type: 'request' as const, data: r })),
      ...friends.map((f) => ({ type: 'friend' as const, data: f })),
    ];

    return (
      <SafeAreaView style={styles.root}>
        <FlatList
          key="friends"
          data={sections}
          keyExtractor={(item) => {
            if (item.type === 'request') return `req-${item.data.requesterId}`;
            if (item.type === 'friend') return `fr-${item.data.id}`;
            return `fr-unknown`;
          }}
          ListHeaderComponent={<>{header}
            <TouchableOpacity
              style={styles.discoverButton}
              onPress={() => router.push('/discoverVibers')}
              activeOpacity={0.7}
            >
              <Ionicons name="moon" size={14} color={colors.accent} />
              <Text style={styles.discoverButtonText}>See who you vibe with</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </>}
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
  tabActive: { borderBottomColor: colors.accent },
  tabText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.textPrimary },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  streakCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A3A',
    padding: 18,
  },
  streakCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  streakCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakCardTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  goVibeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  goVibeText: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '800',
  },
  streakCardScroll: {
    marginHorizontal: -4,
  },
  streakCardAvatars: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 4,
  },
  streakCardItem: {
    alignItems: 'center',
    gap: 5,
    width: 78,
  },
  streakScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  streakScoreNum: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  streakScoreSep: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  streakCardRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCardAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  streakCardAvatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCardAvatarText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  streakCardName: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 52,
    textAlign: 'center',
  },
  wishRow: { paddingHorizontal: 16, paddingBottom: 8 },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  discoverButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
