import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Alert, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/auth';
import { useUserPosts } from '@/hooks/useUserPosts';
import { useFavoritePosts } from '@/hooks/useFavoritePosts';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useFollowersList } from '@/hooks/useFollowersList';
import { useFollowingList } from '@/hooks/useFollowingList';
import { useFollowingIds } from '@/hooks/useFollowingIds';
import { useToggleFollow } from '@/hooks/useToggleFollow';
import { PostTile } from '@/components/PostTile';
import { ProfileStatsRow } from '@/components/ProfileStatsRow';
import { FollowUserRow } from '@/components/FollowUserRow';
import type { PostItem } from '@/hooks/useUserPosts';
import type { FollowUser } from '@/hooks/useFollowersList';

const TILE_GAP = 2;
type Tab = 'posts' | 'saved' | 'followers' | 'following';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('posts');

  const { data: userPosts = [], isLoading: postsLoading } = useUserPosts();
  const { data: favoritePosts = [], isLoading: favLoading } = useFavoritePosts();
  const { data: profile } = usePublicProfile(user?.id ?? '');
  const { data: followers = [], isLoading: loadingFollowers } = useFollowersList(user?.id ?? '');
  const { data: following = [], isLoading: loadingFollowing } = useFollowingList(user?.id ?? '');
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { mutate: toggleFollow } = useToggleFollow();

  const postAlbumIds = useMemo(() => userPosts.map((p) => p.id), [userPosts]);
  const favAlbumIds = useMemo(() => favoritePosts.map((p) => p.id), [favoritePosts]);

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          signOut();
        },
      },
    ]);
  }

  function handleFollowUser(targetId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow({ userId: targetId, currentlyFollowing: followingIds.has(targetId) });
  }

  // Stats row maps Posts→'posts', Followers→'followers', Following→'following'
  function handleStatsTabChange(tab: 'posts' | 'followers' | 'following') {
    setActiveTab(tab);
  }

  const statsActiveTab: 'posts' | 'followers' | 'following' =
    activeTab === 'saved' ? 'posts' : activeTab;

  const header = (
    <>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.username}>@{user?.user_metadata?.username ?? 'you'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} hitSlop={12}>
            <Ionicons name="log-out-outline" size={22} color="#F4212E" />
          </TouchableOpacity>
        </View>

        <ProfileStatsRow
          postCount={userPosts.length}
          followerCount={profile?.followerCount ?? 0}
          followingCount={profile?.followingCount ?? 0}
          activeTab={statsActiveTab}
          onTabChange={handleStatsTabChange}
        />
      </View>

      {/* My Posts / Saved sub-tabs — only shown in posts context */}
      {(activeTab === 'posts' || activeTab === 'saved') && (
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={16} color={activeTab === 'posts' ? '#FFFFFF' : '#71767B'} />
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
              color={activeTab === 'saved' ? '#FFFFFF' : '#71767B'}
            />
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>Saved</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // Posts grid
  if (activeTab === 'posts' || activeTab === 'saved') {
    const items = activeTab === 'posts' ? userPosts : favoritePosts;
    const isLoading = activeTab === 'posts' ? postsLoading : favLoading;
    const albumIds = activeTab === 'posts' ? postAlbumIds : favAlbumIds;

    return (
      <SafeAreaView style={styles.root}>
        <FlatList<PostItem>
          key="posts"
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={header}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.center}><ActivityIndicator color="#FF4500" /></View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.emptyText}>
                  {activeTab === 'posts' ? 'No posts yet' : 'Nothing saved yet'}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <PostTile item={item} isOwn={activeTab === 'posts'} albumIds={albumIds} />
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2F2F2F',
    marginBottom: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  username: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  email: { color: '#71767B', fontSize: 13, marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#2F2F2F',
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
  tabActive: { borderBottomColor: '#FF4500' },
  tabText: { color: '#71767B', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  row: { gap: TILE_GAP, marginBottom: TILE_GAP },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: '#71767B', fontSize: 15 },
});
