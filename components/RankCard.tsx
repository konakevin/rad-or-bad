import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { getRating } from '@/lib/getRating';
import type { ExplorePost } from '@/hooks/useCategoryPosts';

interface RankCardProps {
  post: ExplorePost;
  rank: number;
  height?: number;
}

export function RankCard({ post, rank, height = 150 }: RankCardProps) {
  const rating = getRating(post.rad_votes, post.total_votes);

  return (
    <TouchableOpacity
      style={styles.shadow}
      onPress={() => router.push(`/photo/${post.id}`)}
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
            <View>
              {post.users?.username && (
                <Text style={styles.username} numberOfLines={1}>@{post.users.username}</Text>
              )}
              {post.total_votes > 0 && (
                <View style={styles.ratingsRow}>
                  <Ionicons name="star" size={10} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.ratingsText}>{post.total_votes}</Text>
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
    fontSize: 36,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
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
  username: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ratingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingsText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '500',
  },
  score: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 36,
  },
  scorePct: {
    fontSize: 18,
    fontWeight: '700',
  },
  invisible: { opacity: 0 },
});
