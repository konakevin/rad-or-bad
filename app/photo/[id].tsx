import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { usePost } from '@/hooks/usePost';
import { useFollowingIds } from '@/hooks/useFollowingIds';
import { useToggleFollow } from '@/hooks/useToggleFollow';
import { useAuthStore } from '@/store/auth';
import { getRating } from '@/lib/getRating';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORY_LABELS: Record<string, string> = {
  people: 'People', animals: 'Animals', food: 'Food', nature: 'Nature', memes: 'Memes',
};
const CATEGORY_COLORS: Record<string, string> = {
  people: '#60A5FA', animals: '#FB923C', food: '#F43F5E', nature: '#4ADE80', memes: '#A78BFA',
};

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const { data: post, isLoading } = usePost(id);
  const { data: followingIds = new Set<string>() } = useFollowingIds();
  const { mutate: toggleFollow } = useToggleFollow();

  if (isLoading || !post) {
    return (
      <View style={styles.loadingRoot}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <ActivityIndicator color="#FF4500" />
      </View>
    );
  }

  const rating = getRating(post.rad_votes, post.total_votes);
  const isOwnPost = currentUser?.id === post.user_id;
  const isFollowing = followingIds.has(post.user_id);
  const categoryColor = CATEGORY_COLORS[post.category] ?? '#FFFFFF';
  const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category;

  function handleFollow() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFollow({ userId: post.user_id, currentlyFollowing: isFollowing });
  }

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: post.image_url }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
      />

      {/* Top gradient for back button legibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={styles.topGradient}
      />

      {/* Bottom gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']}
        style={styles.bottomGradient}
      >
        {/* Rating badge */}
        {rating !== null && (
          <MaskedView
            style={styles.ratingBadge}
            maskElement={
              <Text style={styles.ratingText}>{rating.percent}%</Text>
            }
          >
            <LinearGradient colors={rating.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={[styles.ratingText, { opacity: 0 }]}>{rating.percent}%</Text>
            </LinearGradient>
          </MaskedView>
        )}

        {/* User row */}
        <View style={styles.userRow}>
          <TouchableOpacity onPress={() => router.push(`/user/${post.user_id}`)} hitSlop={8}>
            <Text style={styles.username}>@{post.users?.username}</Text>
          </TouchableOpacity>
          {!isOwnPost && (
            <TouchableOpacity
              onPress={handleFollow}
              hitSlop={8}
              style={[styles.followPill, isFollowing && styles.followingPill]}
            >
              <Text style={[styles.followPillText, isFollowing && styles.followingPillText]}>
                {isFollowing ? 'Following' : '+ Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Caption */}
        {post.caption ? (
          <Text style={styles.caption}>{post.caption}</Text>
        ) : null}

        {/* Meta row */}
        <View style={styles.metaRow}>
          {post.total_votes > 0 && (
            <>
              <Ionicons name="star" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.metaText}>{post.total_votes}</Text>
              <Text style={styles.metaDot}>·</Text>
            </>
          )}
          <View style={[styles.categoryPill, { backgroundColor: `${categoryColor}26`, borderColor: `${categoryColor}66` }]}>
            <Text style={[styles.categoryPillText, { color: categoryColor }]}>{categoryLabel}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Safe area back button */}
      <SafeAreaView style={styles.safeTop} pointerEvents="box-none">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  loadingRoot: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  safeTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  backButton: {
    margin: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  ratingBadge: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 58,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  followPill: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  followingPill: { borderColor: 'rgba(255,255,255,0.2)' },
  followPillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  followingPillText: { color: 'rgba(255,255,255,0.35)' },
  caption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  metaDot: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
  categoryPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryPillText: { fontSize: 13, fontWeight: '600' },
});
