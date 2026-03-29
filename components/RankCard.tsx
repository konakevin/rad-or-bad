import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAlbumStore } from '@/store/album';
import { getRating } from '@/lib/getRating';
import { VoteCount } from '@/components/VoteCount';
import type { ExplorePost } from '@/hooks/useCategoryPosts';
import { colors } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
// 2 cells + 4px gap between them
const CELL_SIZE = (SCREEN_WIDTH - 4) / 2;

interface RankCardProps {
  post: ExplorePost;
  rank: number;
  height?: number;
  albumIds?: string[];
  accentColor?: string;
  featured?: boolean;
  grid?: boolean;
}

export function RankCard({ post, rank, height, albumIds, accentColor, featured = false, grid = false }: RankCardProps) {
  const rating = getRating(post.rad_votes, post.total_votes);

  function handlePress() {
    if (albumIds?.length) {
      useAlbumStore.getState().setAlbum(albumIds);
    } else {
      useAlbumStore.getState().clearAlbum();
    }
    router.push(`/photo/${post.id}`);
  }

  if (grid) {
    return (
      <TouchableOpacity
        style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: post.thumbnail_url ?? post.image_url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />

        {/* Play icon — centered, faded */}
        {post.media_type === 'video' && (
          <View style={styles.playCenter}>
            <Ionicons name="play" size={28} color="rgba(255,255,255,0.35)" />
          </View>
        )}

        {/* Username + stars + score — bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          locations={[0.2, 1]}
          style={styles.cellFooter}
        >
          <View style={styles.cellFooterRow}>
            {post.total_votes > 0 && (
              <View style={styles.cellVotesRow}>
                <VoteCount count={post.total_votes} size="sm" />
              </View>
            )}

            {rating !== null && (
              <MaskedView maskElement={
                <Text style={styles.cellScore}>{rating.percent}<Text style={styles.cellScorePct}>%</Text></Text>
              }>
                <LinearGradient colors={rating.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={[styles.cellScore, styles.invisible]}>
                    {rating.percent}<Text style={styles.cellScorePct}>%</Text>
                  </Text>
                </LinearGradient>
              </MaskedView>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Hero / stacked card — full width
  const heroHeight = height ?? (featured ? 260 : 160);
  return (
    <TouchableOpacity style={[styles.hero, { height: heroHeight }]} onPress={handlePress} activeOpacity={0.85}>
      <Image
        source={{ uri: post.thumbnail_url ?? post.image_url }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
      />

      {/* Rank badge — only shown for non-featured (non-#1) hero cards */}
      {!featured && (
        <View style={styles.heroRankBadge}>
          <Text style={[styles.heroRankText, accentColor ? { color: accentColor } : null]}>
            {rank}
          </Text>
        </View>
      )}

      {post.media_type === 'video' && (
        <View style={styles.playCenter}>
          <Ionicons name="play" size={36} color="rgba(255,255,255,0.35)" />
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.5, 1]}
        style={styles.heroFooter}
      >
        <View style={styles.heroFooterRow}>
          <View style={styles.heroFooterLeft}>
            {post.total_votes > 0 && (
              <View style={styles.votesRow}>
                <VoteCount count={post.total_votes} />
              </View>
            )}
          </View>

          {rating !== null && (
            <MaskedView maskElement={
              <Text style={styles.heroScore}>{rating.percent}<Text style={styles.heroScorePct}>%</Text></Text>
            }>
              <LinearGradient colors={rating.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={[styles.heroScore, styles.invisible]}>
                  {rating.percent}<Text style={styles.heroScorePct}>%</Text>
                </Text>
              </LinearGradient>
            </MaskedView>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Hero (#1) ──────────────────────────────────────────────────────────────
  hero: {
    width: '100%',
    height: 260,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  heroRankBadge: {
    position: 'absolute',
    top: 10,
    left: 14,
    alignItems: 'center',
  },
  heroRankText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 44,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  heroRankFeatured: {
    fontSize: 56,
    lineHeight: 60,
    color: '#FFB700',
    textShadowColor: 'rgba(255,140,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  heroFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroFooterLeft: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  heroUsername: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  heroScore: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 34,
  },
  heroScorePct: {
    fontSize: 17,
    fontWeight: '700',
  },

  // ── Grid cells (#2–9) ──────────────────────────────────────────────────────
  cell: {
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  cellFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 24,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  cellFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cellVotesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cellVotesText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
  },
  cellScore: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 21,
  },
  cellScorePct: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Shared ─────────────────────────────────────────────────────────────────
  playCenter: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  votesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  votesText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  invisible: { opacity: 0 },
});
