import { View, Text, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator, Share, Dimensions } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system/next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
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
  withSpring,
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

const CATEGORY_LABELS: Record<string, string> = {
  people: 'People', animals: 'Animals', food: 'Food', nature: 'Nature', memes: 'Memes',
};
const CATEGORY_COLORS: Record<string, string> = {
  people: '#6699EE', animals: '#DDAA66', food: '#DD7766', nature: '#77CC88', memes: '#BB88EE',
};

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
  const [currentId, setCurrentId] = useState(id);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [muted, setMuted] = useState(true);

  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { data: post, isLoading } = usePost(currentId);
  const { mutate: deletePost } = useDeletePost();
  const { data: existingVote, isLoading: voteLoading } = useUserVote(currentId);
  const { mutate: castVote } = useVote();

  // Combine server vote + local optimistic vote
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

  // Score reveal animation — declared here so swapToId can reset them
  const scoreOpacity = useSharedValue(0);
  const scoreScale = useSharedValue(0.4);

  // Called on JS thread after the slide-out animation completes
  function swapToId(targetId: string, enterFrom: number) {
    setCurrentId(targetId);
    setLocalVote(null);
    setCaptionExpanded(false);
    scoreOpacity.value = 0;
    scoreScale.value = 0.4;
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

  useEffect(() => {
    if (!hasVoted || voteLoading) return;
    if (localVote !== null) {
      // Just voted this session — bounce in
      scoreOpacity.value = withTiming(1, { duration: 60 });
      scoreScale.value = withSpring(1, { damping: 14, stiffness: 280 });
    } else {
      // Already voted previously — show instantly, no animation
      scoreOpacity.value = 1;
      scoreScale.value = 1;
    }
  }, [hasVoted, voteLoading]);

  const scoreStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
    transform: [{ scale: scoreScale.value }],
  }));

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
          <ActivityIndicator color="#FF4500" />
        </View>
      </>
    );
  }

  const p = post;
  const isOwnPost = currentUser?.id === p.user_id;
  const blurBg = p.width && p.height ? (p.width / p.height) > (SCREEN_WIDTH / SCREEN_HEIGHT) : false;
  const categoryColor = CATEGORY_COLORS[p.category] ?? '#FFFFFF';
  const categoryLabel = CATEGORY_LABELS[p.category] ?? p.category;

  // Optimistic score calculation
  const rad = p.rad_votes + (localVote === 'rad' ? 1 : 0);
  const total = p.total_votes + (localVote !== null ? 1 : 0);
  const rating = hasVoted ? getRating(rad, total) : null;

  function handleVote(vote: 'rad' | 'bad') {
    if (hasVoted) return;
    Haptics.impactAsync(vote === 'rad' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    setLocalVote(vote);
    castVote({ uploadId: p.id, vote });
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
      {blurBg && (
        <>
          <Image
            source={{ uri: p.thumbnail_url ?? p.image_url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={18}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
        </>
      )}
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

      {/* Bottom gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.3, 0.72, 1]}
        style={styles.bottomGradient}
        pointerEvents="box-none"
      >
        <View style={styles.contentRow}>
          {/* Left block — all info, tight even spacing */}
          <View style={styles.infoBlock}>
            <TouchableOpacity onPress={() => router.push(`/user/${p.user_id}`)} hitSlop={8}>
              <Text style={styles.username}>@{p.users?.username}</Text>
            </TouchableOpacity>

            {p.caption ? (
              <TouchableOpacity onPress={() => setCaptionExpanded((v) => !v)} activeOpacity={0.8} hitSlop={8}>
                <Text style={styles.caption} numberOfLines={captionExpanded ? undefined : 1}>
                  {p.caption}
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.metaRow}>
              <View style={[styles.categoryPill, { backgroundColor: `${categoryColor}26`, borderColor: `${categoryColor}66` }]}>
                <Text style={[styles.categoryPillText, { color: categoryColor }]}>{categoryLabel}</Text>
              </View>
              {p.total_votes > 0 && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Ionicons name="star" size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.metaText}>{formatCount(p.total_votes)}</Text>
                </>
              )}
              <TouchableOpacity onPress={handleShare} hitSlop={12} style={styles.shareButton}>
                <Ionicons name="share-outline" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Right column — score after voting, or compact vote buttons */}
          {!isOwnPost && !voteLoading && (
            hasVoted && rating !== null ? (
              <Animated.View style={[styles.scoreRight, scoreStyle]}>
                <MaskedView maskElement={
                  <Text style={styles.compactScore}>{rating.percent}%</Text>
                }>
                  <LinearGradient colors={rating.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={[styles.compactScore, { opacity: 0 }]}>{rating.percent}%</Text>
                  </LinearGradient>
                </MaskedView>
              </Animated.View>
            ) : (
              <View style={styles.voteButtonsCompact}>
                <View style={styles.radGlowSm}>
                  <TouchableOpacity style={styles.voteButtonSm} activeOpacity={0.8} onPress={() => handleVote('rad')}>
                    <LinearGradient colors={['#CCDD55', '#DDAA66', '#DD7766']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    <Ionicons name="thumbs-up" size={22} color="#FFFFFF" />
                    <Text style={styles.voteButtonTextSm}>RAD</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.badGlowSm}>
                  <TouchableOpacity style={styles.voteButtonSm} activeOpacity={0.8} onPress={() => handleVote('bad')}>
                    <LinearGradient colors={['#BB88EE', '#6699EE', '#44BBCC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    <Ionicons name="thumbs-down" size={22} color="#FFFFFF" />
                    <Text style={styles.voteButtonTextSm}>BAD</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}
        </View>
      </LinearGradient>

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRoot: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
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
  compactScore: {
    fontSize: 50,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    color: '#FFFFFF',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoBlock: {
    flex: 1,
    gap: 6,
  },
  scoreRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 10,
  },
  voteButtonsCompact: {
    flexDirection: 'column',
    gap: 10,
    marginRight: 4,
  },
  badGlowSm: {
    borderRadius: 34,
    shadowColor: '#6699EE',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  radGlowSm: {
    borderRadius: 34,
    shadowColor: '#DDAA66',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  voteButtonSm: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  voteButtonTextSm: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
