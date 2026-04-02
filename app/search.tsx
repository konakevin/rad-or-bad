import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator,
  StyleSheet, Dimensions, Pressable, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSearchUsers, type SearchUser } from '@/hooks/useSearchUsers';
import { useFollowingIds } from '@/hooks/useFollowingIds';
import { useToggleFollow } from '@/hooks/useToggleFollow';
import { useFriendIds } from '@/hooks/useFriendIds';
import { useSendFriendRequest } from '@/hooks/useSendFriendRequest';
import { useFriendshipStatus } from '@/hooks/useFriendshipStatus';
import { useSheetDismiss } from '@/hooks/useSheetDismiss';
import { colors } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

function SearchRow({ user }: { user: SearchUser }) {
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { data: friendIds = new Set<string>() } = useFriendIds();
  const { mutate: toggleFollow } = useToggleFollow();
  const { mutate: sendRequest } = useSendFriendRequest();
  const { data: friendshipStatus = 'none' } = useFriendshipStatus(user.id);
  const isFollowing = followingIds.has(user.id);
  const isFriend = friendIds.has(user.id);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.replace(`/user/${user.id}`)}
      activeOpacity={0.7}
    >
      {user.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>{(user.username || '?')[0].toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.userInfo}>
        <Text style={styles.username}>{user.username}</Text>
        
      </View>

      <View style={styles.actions}>
        {!isFriend && friendshipStatus === 'none' && (
          <TouchableOpacity
            style={styles.dreamButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              sendRequest(user.id);
            }}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={styles.dreamButtonText}>Dream</Text>
          </TouchableOpacity>
        )}
        {friendshipStatus === 'pending_sent' && (
          <View style={styles.sentPill}>
            <Text style={styles.sentText}>Sent</Text>
          </View>
        )}
        {isFriend && (
          <View style={styles.friendPill}>
            <Ionicons name="checkmark-circle" size={12} color="#4CAA64" />
          </View>
        )}
        {!isFriend && !isFollowing && friendshipStatus !== 'pending_sent' && (
          <TouchableOpacity
            style={styles.followButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFollow({ userId: user.id, currentlyFollowing: false });
            }}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const { data: results = [], isLoading } = useSearchUsers(query);
  const { data: friendIds = new Set<string>() } = useFriendIds();
  const { translateY, panHandlers } = useSheetDismiss();

  // Sort friends first
  const sortedResults = [...results].sort((a, b) => {
    const aFriend = friendIds.has(a.id) ? 0 : 1;
    const bFriend = friendIds.has(b.id) ? 0 : 1;
    return aFriend - bFriend;
  });

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <Animated.View {...panHandlers} style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Search input */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        <FlatList
          data={sortedResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SearchRow user={item} />}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              {isLoading ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : query.length >= 2 ? (
                <Text style={styles.emptyText}>No users found</Text>
              ) : null}
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15, height: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.card,
    gap: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  userInfo: { flex: 1, gap: 2 },
  username: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  rank: { color: colors.textSecondary, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dreamButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dreamButtonText: { color: '#000000', fontSize: 12, fontWeight: '800' },
  followButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  followButtonText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  sentPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sentText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  friendPill: { padding: 4 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
