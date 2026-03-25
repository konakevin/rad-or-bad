import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Alert, FlatList,
  StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/auth';
import { useUserPosts } from '@/hooks/useUserPosts';
import { useFavoritePosts } from '@/hooks/useFavoritePosts';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { getRating } from '@/lib/getRating';
import type { PostItem } from '@/hooks/useUserPosts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - TILE_GAP) / 2;

type Tab = 'posts' | 'favorites';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('posts');

  const { data: userPosts = [], isLoading: postsLoading } = useUserPosts();
  const { data: favoritePosts = [], isLoading: favLoading } = useFavoritePosts();
  const { data: ownProfile } = usePublicProfile(user?.id ?? '');

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

  const items = activeTab === 'posts' ? userPosts : favoritePosts;
  const isLoading = activeTab === 'posts' ? postsLoading : favLoading;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
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
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{userPosts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{ownProfile?.followerCount ?? 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{ownProfile?.followingCount ?? 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="grid-outline"
            size={16}
            color={activeTab === 'posts' ? '#FFFFFF' : '#71767B'}
          />
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
            My Posts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
          onPress={() => setActiveTab('favorites')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'favorites' ? 'bookmark' : 'bookmark-outline'}
            size={16}
            color={activeTab === 'favorites' ? '#FFFFFF' : '#71767B'}
          />
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>
            Saved
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grid */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF4500" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {activeTab === 'posts' ? 'No posts yet' : 'Nothing saved yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => <PostTile item={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function PostTile({ item }: { item: PostItem }) {
  const rating = getRating(item.rad_votes, item.total_votes);

  return (
    <View style={styles.tile}>
      <Image
        source={{ uri: item.image_url }}
        style={styles.tileImage}
        contentFit="cover"
        transition={150}
      />
      {rating !== null && (
        <View style={styles.tileScore}>
          <Text style={styles.tileScoreText}>{rating.percent}%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2F2F2F',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  username: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  email: {
    color: '#71767B',
    fontSize: 13,
    marginTop: 2,
  },
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
  tabActive: {
    borderBottomColor: '#FF4500',
  },
  tabText: {
    color: '#71767B',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  row: {
    gap: TILE_GAP,
    marginBottom: TILE_GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: '#1A1A1A',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileScore: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tileScoreText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#71767B',
    fontSize: 15,
  },
});
