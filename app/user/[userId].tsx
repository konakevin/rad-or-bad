import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useFollowingIds } from '@/hooks/useFollowingIds';
import { useToggleFollow } from '@/hooks/useToggleFollow';
import { useAuthStore } from '@/store/auth';
import { PostTile } from '@/components/PostTile';
import type { PostItem } from '@/hooks/useUserPosts';

const TILE_GAP = 2;

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?.id === userId;

  const { data: profile, isLoading } = usePublicProfile(userId);
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { mutate: toggleFollow } = useToggleFollow();

  const isFollowing = followingIds.has(userId);

  function handleFollow() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow({ userId, currentlyFollowing: isFollowing });
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

  return (
    <SafeAreaView style={styles.root}>
      <FlatList
        data={profile.posts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
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

              {/* Counts */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{profile.posts.length}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{profile.followerCount}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{profile.followingCount}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>
            </View>

            {/* Posts label */}
            <Text style={styles.sectionLabel}>POSTS</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
        renderItem={({ item }) => <PostTile item={item} />}
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: '#71767B',
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 0.5,
    height: 28,
    backgroundColor: '#2F2F2F',
  },
  sectionLabel: {
    color: '#71767B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  row: { gap: TILE_GAP, marginBottom: TILE_GAP },
  emptyText: { color: '#71767B', fontSize: 15 },
});
