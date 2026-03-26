import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAlbumStore } from '@/store/album';
import { getRating } from '@/lib/getRating';
import { formatCount } from '@/lib/formatCount';
import type { ExplorePost } from '@/hooks/useCategoryPosts';

interface RankCardProps {
  post: ExplorePost;
  rank: number;
  height?: number;
  albumIds?: string[];
}

export function RankCard({ post, rank, height = 150, albumIds }: RankCardProps) {
  const rating = getRating(post.rad_votes, post.total_votes);

  function handlePress() {
    if (albumIds?.length) {
      useAlbumStore.getState().setAlbum(albumIds);
    } else {
      useAlbumStore.getState().clearAlbum();
    }
    router.push(`/photo/${post.id}`);
  }

  return (
    <TouchableOpacity
      style={styles.shadow}
      onPress={handlePress}
      activeOpacity={0.92}
    >
      <View style={[styles.card, { height }]}>
        <Image
          source={{ uri: post.image_url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />

        <Text style={styles.rank}>{rank}</Text>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.5, 1]}
          style={styles.footer}
        >
          <View style={styles.footerRow}>
            <View style={styles.usernameRow}>
              {post.users?.username && (
                <Text style={styles.username} numberOfLines={1}>@{post.users.username}</Text>
              )}
              {post.total_votes > 0 && (
                <View style={styles.ratingsRow}>
                  <Ionicons name="star" size={11} color="#FFB300" />
                  <Text style={styles.ratingsText}>{formatCount(post.total_votes)}</Text>
                </View>
              )}
            </View>

            {rating !== null && (
              <MaskedView maskElement={
                <Text style={styles.score}>{rating.percent}<Text style={styles.scorePct}>%</Text></Text>
              }>
                <LinearGradient
                  colors={rating.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.score, styles.invisible]}>
                    {rating.percent}<Text style={styles.scorePct}>%</Text>
                  </Text>
                </LinearGradient>
              </MaskedView>
            )}
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  rank: {
    position: 'absolute',
    top: 10,
    left: 14,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ratingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingsText: {
    color: '#FFB300',
    fontSize: 12,
    fontWeight: '700',
  },
  score: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  scorePct: {
    fontSize: 15,
    fontWeight: '700',
  },
  invisible: { opacity: 0 },
});
