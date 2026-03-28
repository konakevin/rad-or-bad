import { View, Text, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator, Share, Dimensions, Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system/next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.22;
import * as Haptics from 'expo-haptics';
import { usePost } from '@/hooks/usePost';
import { useDeletePost } from '@/hooks/useDeletePost';
import { useUserVote } from '@/hooks/useUserVote';
import { useVote } from '@/hooks/useVote';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useAlbumStore } from '@/store/album';
import { fetchPost } from '@/hooks/usePost';
import { getRating } from '@/lib/getRating';
import { formatCount } from '@/lib/formatCount';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { GradientUsername } from '@/components/GradientUsername';
import { colors } from '@/constants/theme';
import { VoteButton } from '@/components/VoteButton';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/constants/categories';
import { animateScoreIn } from '@/lib/scoreAnimation';
import { useFavoriteIds } from '@/hooks/useFavoriteIds';
import { useToggleFavorite } from '@/hooks/useToggleFavorite';

function VideoPlayer({ uri, muted, contentFit = 'cover' }: { uri: string; muted: boolean; contentFit?: 'cover' | 'contain' }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
    p.play();
  });
  useEffect(() => { player.muted = muted; }, [muted]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit={contentFit} nativeControls={false} />;
}


export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localVote, setLocalVote] = useState<'rad' | 'bad' | null>(null);
  const [justVoted, setJustVoted] = useState(false); // true only when voted THIS view
  const [currentId, setCurrentId] = useState(id);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [votePending, setVotePending] = useState<'rad' | 'bad' | null>(null);

  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { data: post, isLoading } = usePost(currentId);
  const { mutate: deletePost } = useDeletePost();
  const { data: existingVote, isLoading: voteLoading } = useUserVote(currentId);
  const { mutate: castVote } = useVote();
  const { data: favoriteIds = new Set<string>() } = useFavoriteIds();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const isFavorited = favoriteIds.has(currentId);

  // Simple rule: voted = either from DB or just now
  const userVote = localVote ?? existingVote ?? null;
  const hasVoted = userVote !== null;

  // Album navigation — swaps photo in-place, no navigation
  const albumIds = useAlbumStore((s) => s.ids);
  const currentIndex = albumIds.indexOf(currentId);
  const isInAlbum = albumIds.length > 0 && currentIndex !== -1;
  const prevId = isInAlbum && currentIndex > 0 ? albumIds[currentIndex - 1] : null;
  const nextId = isInAlbum && currentIndex < albumIds.length - 1 ? albumIds[currentIndex + 1] : null;

  // Prefetch adjacent album photos so swipes are instant
  useEffect(() => {
    if (nextId) queryClient.prefetchQuery({ queryKey: ['post', nextId], queryFn: () => fetchPost(nextId) });
    if (prevId) queryClient.prefetchQuery({ queryKey: ['post', prevId], queryFn: () => fetchPost(prevId) });
  }, [currentId, nextId, prevId]);

  const slideY = useSharedValue(0);

  // Called on JS thread after the slide-out animation completes
  function swapToId(targetId: string, enterFrom: number) {
    setCurrentId(targetId);
    setLocalVote(null);
    setJustVoted(false);
    setVotePending(null);
    setCaptionExpanded(false);
    // Jump to off-screen on the opposite side, then spring in
    slideY.value = enterFrom;
    slideY.value = withTiming(0, { duration: 220 });
  }

  const albumGesture = Gesture.Pan()
    .activeOffsetY([-15, 15])
    .onUpdate((e) => {
      const canGoUp = nextId !== null;
      const canGoDown = prevId !== null;
      if ((e.translationY < 0 && canGoUp) || (e.translationY > 0 && canGoDown) || (e.translationY > 0 && !isInAlbum)) {
        slideY.value = e.translationY;
      } else {
        slideY.value = e.translationY * 0.1;
      }
    })
    .onEnd((e) => {
      if (e.translationY < -SWIPE_THRESHOLD && nextId) {
        // Swipe up → next photo
        slideY.value = withTiming(-SCREEN_HEIGHT, { duration: 220 }, () => {
          runOnJS(swapToId)(nextId, SCREEN_HEIGHT);
        });
      } else if (e.translationY > SWIPE_THRESHOLD && prevId) {
        // Swipe down → prev photo
        slideY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }, () => {
          runOnJS(swapToId)(prevId, -SCREEN_HEIGHT);
        });
      } else if (e.translationY > SWIPE_THRESHOLD && !prevId) {
        // Swipe down with no prev → dismiss modal
        slideY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }, () => {
          runOnJS(router.back)();
        });
      } else {
        slideY.value = withTiming(0, { duration: 220 });
      }
    });

  // Score animation only used for the "just voted" punch effect
  const scoreOpacity = useSharedValue(0);
  const scoreScale = useSharedValue(0.4);

  useEffect(() => {
    if (justVoted) {
      animateScoreIn(scoreOpacity, scoreScale, { fadeDuration: 80, punchDuration: 160, settleDuration: 130 });
    }
  }, [justVoted]);

  const scoreAnimStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
    transform: [{ scale: scoreScale.value }],
  }));

  // Determine if score should show: voted (from DB or local) and not loading
  const showScore = hasVoted && !voteLoading && rating !== null;
  // Previously voted = show instantly (no animation). Just voted = use animated style.
  const showScoreInstant = showScore && !justVoted;

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const isVideo = post?.media_type === 'video';

  if (isLoading || !post) {
    return (
      <>
        <StatusBar hidden />
        <View style={styles.loadingRoot}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <ActivityIndicator color="#71767B" />
        </View>
      </>
    );
  }

  const p = post;
  const isOwnPost = currentUser?.id === p.user_id;
  const blurBg = p.width && p.height ? (p.width / p.height) > (SCREEN_WIDTH / SCREEN_HEIGHT) : false;

  // Optimistic score calculation — include pending vote
  const activeVote = localVote ?? votePending;
  const rad = p.rad_votes + (activeVote === 'rad' ? 1 : 0);
  const total = p.total_votes + (activeVote !== null ? 1 : 0);
  const rating = (hasVoted || votePending) ? getRating(rad, total) : null;

  function handleVote(vote: 'rad' | 'bad') {
    if (hasVoted || votePending) return;
    Haptics.impactAsync(vote === 'rad' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    setVotePending(vote);
    castVote({ uploadId: p.id, vote }, {
      onError: (err) => {
        setVotePending(null);
        Alert.alert('Vote failed', err.message);
      },
    });
    // Let button shrink + burst play, then reveal score
    setTimeout(() => {
      setLocalVote(vote);
      setJustVoted(true);
      setVotePending(null);
    }, 400);
  }

  function handleDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deletePost(p.id, { onSuccess: () => router.back() });
  }

  async function handleSaveImage() {
    if (saving) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      const file = new File(Paths.cache, `${p.id}.jpg`);
      await (file as unknown as { downloadAsync: (url: string) => Promise<void> }).downloadAsync(p.image_url);
      await MediaLibrary.saveToLibraryAsync(file.uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }

  function handleFavorite() {
    toggleFavorite({ uploadId: currentId, currentlyFavorited: isFavorited });
  }

  function handleShare() {
    // TODO: replace with a real URL once deep linking or a web domain is set up
    Share.share({
      message: `Check out this post on Rad or Bad! https://radorbad.app/photo/${p.id}`,
    });
  }

  return (
    <>
    <StatusBar hidden />
    <GestureDetector gesture={albumGesture}>
    <Animated.View style={[styles.root, slideStyle]}>
    <Pressable style={StyleSheet.absoluteFill} onLongPress={handleSaveImage} delayLongPress={600}>
      {isVideo ? (
        <VideoPlayer uri={p.image_url} muted={muted} contentFit={blurBg ? 'contain' : 'cover'} />
      ) : (
        <Image
          source={{ uri: p.image_url }}
          style={StyleSheet.absoluteFill}
          contentFit={blurBg ? 'contain' : 'cover'}
          transition={200}
        />
      )}
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      )}

      {/* Top gradient — decorative only */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      <DetailFooter
        post={p}
        isOwnPost={isOwnPost}
        hasVoted={hasVoted}
        captionExpanded={captionExpanded}
        setCaptionExpanded={setCaptionExpanded}
        isFavorited={isFavorited}
        onFavorite={handleFavorite}
        onShare={handleShare}
      />

      {/* Vote buttons — absolute, shrink + fade after voting */}
      {!isOwnPost && !voteLoading && (!hasVoted || votePending) && (
        <View style={styles.voteButtonsCompact}>
          <VoteButton vote="rad" onPress={() => handleVote('rad')} disabled={!!votePending} size={68} shrinkOnPress />
          <VoteButton vote="bad" onPress={() => handleVote('bad')} disabled={!!votePending} size={68} shrinkOnPress />
        </View>
      )}

      {/* Score badge — instant for previously voted, animated for just voted */}
      {!isOwnPost && showScoreInstant && rating !== null && (
        <View style={styles.scoreBadge} pointerEvents="none">
          <MaskedView maskElement={<Text style={styles.scoreBadgeText}>{rating.percent}%</Text>}>
            <LinearGradient colors={rating.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={[styles.scoreBadgeText, styles.invisible]}>{rating.percent}%</Text>
            </LinearGradient>
          </MaskedView>
        </View>
      )}
      {!isOwnPost && justVoted && rating !== null && (
        <Animated.View style={[styles.scoreBadge, scoreAnimStyle]} pointerEvents="none">
          <MaskedView maskElement={<Text style={styles.scoreBadgeText}>{rating.percent}%</Text>}>
            <LinearGradient colors={rating.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={[styles.scoreBadgeText, styles.invisible]}>{rating.percent}%</Text>
            </LinearGradient>
          </MaskedView>
        </Animated.View>
      )}

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete post"
        message="This will permanently remove your post and all its votes."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* Safe area back + share + delete buttons */}
      <SafeAreaView style={styles.safeTop} pointerEvents="box-none">
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.topRightButtons}>
            {isVideo && (
              <TouchableOpacity
                style={styles.topButton}
                onPress={() => setMuted((m) => !m)}
                hitSlop={12}
              >
                <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {isOwnPost && (
              <TouchableOpacity style={styles.topButton} onPress={() => setShowDeleteDialog(true)} hitSlop={12}>
                <Ionicons name="trash-outline" size={22} color="#FF4500" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Pressable>
    </Animated.View>
    </GestureDetector>
    </>
  );
}

// ── DetailFooter ─────────────────────────────────────────────────────────────
// Always positioned at the bottom of the screen regardless of image aspect ratio.
// Uses a strong enough gradient to read clearly over both images and black bars.
interface DetailFooterProps {
  post: PostDetail;
  isOwnPost: boolean;
  hasVoted: boolean;
  captionExpanded: boolean;
  setCaptionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isFavorited: boolean;
  onFavorite: () => void;
  onShare: () => void;
}

function DetailFooter({ post: p, isOwnPost, hasVoted, captionExpanded, setCaptionExpanded, isFavorited, onFavorite, onShare }: DetailFooterProps) {
  const [catsExpanded, setCatsExpanded] = useState(false);
  const cats = p.categories ?? [];
  const visibleCats = cats.slice(0, 2);
  const hiddenCats = cats.slice(2);

  return (
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
      locations={[0, 0.4, 1]}
      style={styles.bottomGradient}
      pointerEvents="box-none"
    >
      <View style={styles.contentRow}>
        {/* Left — username, caption, meta */}
        <View style={[styles.infoBlock, !isOwnPost && !hasVoted && styles.infoBlockWithButtons]}>
          <TouchableOpacity onPress={() => router.push(`/user/${p.user_id}`)} hitSlop={8}>
            <GradientUsername username={p.users?.username ?? ''} rank={p.users?.user_rank} style={styles.username} photoOverlay avatarUrl={p.users?.avatar_url} showAvatar avatarSize={22} />
          </TouchableOpacity>

          {p.caption ? (
            <TouchableOpacity onPress={() => setCaptionExpanded((v) => !v)} activeOpacity={0.8} hitSlop={8}>
              <Text style={styles.caption} numberOfLines={captionExpanded ? undefined : 1}>
                {p.caption}
              </Text>
            </TouchableOpacity>
          ) : null}

          <View>
            <View style={styles.metaRow}>
              {visibleCats.map((cat) => {
                const color = CATEGORY_COLORS[cat] ?? '#FFFFFF';
                return (
                  <Pressable key={cat} onPress={() => router.push(`/(tabs)/top?category=${cat}`)} hitSlop={8}
                    style={[styles.categoryPill, { backgroundColor: `${color}26`, borderColor: `${color}66` }]}>
                    <Text style={[styles.categoryPillText, { color }]}>{CATEGORY_LABELS[cat] ?? cat}</Text>
                  </Pressable>
                );
              })}
              {hiddenCats.length > 0 && (
                <Pressable onPress={() => setCatsExpanded((v) => !v)} hitSlop={8} style={styles.plusNPill}>
                  <Text style={styles.plusNText}>{catsExpanded ? '−' : `+${hiddenCats.length}`}</Text>
                </Pressable>
              )}
              {p.total_votes > 0 && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Ionicons name="star" size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.metaText}>{formatCount(p.total_votes)}</Text>
                </>
              )}
              <TouchableOpacity onPress={onShare} hitSlop={12} style={styles.shareButton}>
                <Ionicons name="share-outline" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
              {!isOwnPost && (
                <TouchableOpacity onPress={onFavorite} hitSlop={12} style={styles.shareButton}>
                  <Ionicons
                    name={isFavorited ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={isFavorited ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'}
                  />
                </TouchableOpacity>
              )}
            </View>
            {catsExpanded && hiddenCats.length > 0 && (
              <View style={styles.expandedCats}>
                {hiddenCats.map((cat) => {
                  const color = CATEGORY_COLORS[cat] ?? '#FFFFFF';
                  return (
                    <Pressable key={cat} onPress={() => router.push(`/(tabs)/top?category=${cat}`)} hitSlop={8}
                      style={[styles.categoryPill, { backgroundColor: `${color}26`, borderColor: `${color}66` }]}>
                      <Text style={[styles.categoryPillText, { color }]}>{CATEGORY_LABELS[cat] ?? cat}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>

      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRoot: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  topRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topButton: {
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
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  scoreBadge: {
    position: 'absolute',
    top: 72,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scoreBadgeText: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: 44,
  },
  invisible: { opacity: 0 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  caption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plusNPill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  plusNText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  expandedCats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  shareButton: {
    padding: 4,
  },
  metaText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  metaDot: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
  categoryPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  categoryPillText: { fontSize: 13, fontWeight: '600' },
  contentRow: {
    position: 'relative',
  },
  infoBlock: {
    gap: 6,
  },
  voteButtonsCompact: {
    position: 'absolute',
    right: 16,
    bottom: 48,
    flexDirection: 'column',
    gap: 10,
    alignItems: 'flex-end',
  },
  infoBlockWithButtons: {
    // Reserve space for the 68px buttons + 16px edge margin + 4px breathing room
    paddingRight: 88,
  },
});
