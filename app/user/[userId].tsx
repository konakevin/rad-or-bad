import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState, useMemo } from 'react';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useFollowersList } from '@/hooks/useFollowersList';
import { useFollowingList } from '@/hooks/useFollowingList';
import { useFollowingIds } from '@/hooks/useFollowingIds';
import { useToggleFollow } from '@/hooks/useToggleFollow';
import { useAuthStore } from '@/store/auth';
import { PostTile } from '@/components/PostTile';
import { ProfileStatsRow } from '@/components/ProfileStatsRow';
import { FollowUserRow } from '@/components/FollowUserRow';
import type { FollowUser } from '@/hooks/useFollowersList';
import type { PostItem } from '@/hooks/useUserPosts';

const TILE_GAP = 2;
type Tab = 'posts' | 'followers' | 'following';

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?.id === userId;

  const [activeTab, setActiveTab] = useState<Tab>('posts');

  const { data: profile, isLoading } = usePublicProfile(userId);

  const { data: followers = [], isLoading: loadingFollowers } = useFollowersList(userId);
  const { data: following = [], isLoading: loadingFollowing } = useFollowingList(userId);
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { mutate: toggleFollow } = useToggleFollow();

  const isFollowing = followingIds.has(userId);
  const postAlbumIds = useMemo(() => profile?.posts.map((p) => p.id) ?? [], [profile?.posts]);

  function handleFollow() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow({ userId, currentlyFollowing: isFollowing });
  }

  function handleFollowUser(targetId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow({ userId: targetId, currentlyFollowing: followingIds.has(targetId) });
  }

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color="#FF4500" />
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <>
      {/* Back button */}
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.username}>@{profile.username}</Text>
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

        {/* Stats */}
        <ProfileStatsRow
          postCount={profile.posts.length}
          followerCount={profile.followerCount}
          followingCount={profile.followingCount}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </View>

    </>
  );

  // Posts grid
  if (activeTab === 'posts') {
    return (
      <SafeAreaView style={styles.root}>
        <FlatList<PostItem>
          key="posts"
          data={profile.posts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <PostTile item={item} albumIds={postAlbumIds} />
          )}
        />
      </SafeAreaView>
    );
  }

  // Followers / Following list
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
              ? <ActivityIndicator color="#FF4500" />
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
  root: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  backRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2F2F2F',
    marginBottom: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  followButton: {
    borderWidth: 1.5,
    borderColor: '#FF4500',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  followingButton: {
    borderColor: '#2F2F2F',
    backgroundColor: '#1A1A1A',
  },
  followButtonText: {
    color: '#FF4500',
    fontSize: 14,
    fontWeight: '700',
  },
  followingButtonText: {
    color: '#71767B',
  },
  row: { gap: TILE_GAP, marginBottom: TILE_GAP },
  emptyText: { color: '#71767B', fontSize: 15 },
});
