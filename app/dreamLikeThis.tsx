/**
 * Dream Like This — standalone stack screen for style reference dreams.
 *
 * Mounts fresh every time, unmounts on dismiss. Zero stale state.
 * Receives postId as route param, fetches everything it needs from DB.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import ImageCropPicker from 'react-native-image-crop-picker';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useSparkleBalance, useSpendSparkles } from '@/hooks/useSparkles';
import { showAlert } from '@/components/CustomAlert';
import { Toast } from '@/components/Toast';
import { colors } from '@/constants/theme';
import { generateDream, persistImage } from '@/lib/dreamApi';
import { postDream, pinToFeed } from '@/lib/dreamPost';
import type { VibeProfile } from '@/types/vibeProfile';
import type { Recipe } from '@/types/recipe';
import { DEFAULT_RECIPE } from '@/types/recipe';
import { isVibeProfile } from '@/lib/migrateRecipe';
import { generateFromVibeProfile } from '@/lib/dreamApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 48;

type Phase = 'loading' | 'pick' | 'dreaming' | 'reveal' | 'posting';

interface RefPost {
  id: string;
  prompt: string;
  styleField: string | null;
  imageUrl: string;
  username: string;
  userId: string;
}

export default function DreamLikeThisScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: sparkleBalance = 0 } = useSparkleBalance();
  const { mutateAsync: spendSparkles } = useSpendSparkles();

  // ── Reference post data (fetched on mount) ────────────────────────
  const [refPost, setRefPost] = useState<RefPost | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);

  // ── Photo state ───────────────────────────────────────────────────
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  // ── Result state ──────────────────────────────────────────────────
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPrompt, setResultPrompt] = useState('');
  const [resultConcept, setResultConcept] = useState<Record<string, unknown> | null>(null);
  const [posting, setPosting] = useState(false);

  const busy = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const imgScale = useSharedValue(0.85);
  const imgOpacity = useSharedValue(0);
  const revealStyle = useAnimatedStyle(() => ({
    opacity: imgOpacity.value,
    transform: [{ scale: imgScale.value }],
  }));

  // Fullscreen preview
  const fsScale = useSharedValue(0);
  const fsOpacity = useSharedValue(0);
  const fsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.5 + fsScale.value * 0.5 }],
    opacity: fsOpacity.value,
  }));
  const fsOverlayStyle = useAnimatedStyle(() => ({
    opacity: fsOpacity.value,
  }));

  // Pinch to zoom
  const pinchScale = useSharedValue(1);
  const pinchTransX = useSharedValue(0);
  const pinchTransY = useSharedValue(0);
  const pinchFocalX = useSharedValue(0);
  const pinchFocalY = useSharedValue(0);
  const pinchStartX = useSharedValue(0);
  const pinchStartY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      pinchFocalX.value = e.focalX - SCREEN_WIDTH / 2;
      pinchFocalY.value = e.focalY - SCREEN_HEIGHT / 2;
      pinchStartX.value = e.focalX;
      pinchStartY.value = e.focalY;
    })
    .onUpdate((e) => {
      const sc = Math.max(1, Math.min(5, e.scale));
      pinchScale.value = sc;
      pinchTransX.value = pinchFocalX.value * (1 - sc) + (e.focalX - pinchStartX.value);
      pinchTransY.value = pinchFocalY.value * (1 - sc) + (e.focalY - pinchStartY.value);
    })
    .onEnd(() => {
      pinchScale.value = withTiming(1, { duration: 200 });
      pinchTransX.value = withTiming(0, { duration: 200 });
      pinchTransY.value = withTiming(0, { duration: 200 });
    });

  const pinchStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pinchTransX.value },
      { translateY: pinchTransY.value },
      { scale: pinchScale.value },
    ],
  }));

  function openFullscreen() {
    setFullscreen(true);
    fsScale.value = 0;
    fsOpacity.value = 0;
    fsScale.value = withTiming(1, { duration: 300 });
    fsOpacity.value = withTiming(1, { duration: 250 });
  }

  function closeFullscreen() {
    fsScale.value = withTiming(0, { duration: 250 });
    fsOpacity.value = withTiming(0, { duration: 250 });
    setTimeout(() => setFullscreen(false), 260);
  }

  // ── Fetch reference post on mount ─────────────────────────────────
  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data } = await supabase
        .from('uploads')
        .select('id, ai_prompt, caption, image_url, user_id, users!inner(username)')
        .eq('id', postId)
        .single();
      if (!data) {
        Toast.show('Could not load reference post', 'close-circle');
        router.back();
        return;
      }
      const u = data.users as unknown as { username: string };
      const prompt = (data.ai_prompt as string) || (data.caption as string) || '';
      setRefPost({
        id: data.id,
        prompt,
        styleField: null, // Will come from ai_concept once migration 074 is run
        imageUrl: data.image_url,
        username: u.username,
        userId: data.user_id,
      });
      setPhase('pick');
    })();
  }, [postId]);

  // ── Sparkle check ─────────────────────────────────────────────────
  const trySpendSparkle = useCallback(async (): Promise<boolean> => {
    if (sparkleBalance < 1) {
      showAlert(
        'Not enough sparkles',
        'You need 1 sparkle to dream. Get more sparkles to keep dreaming!',
        [
          { text: 'Get Sparkles', onPress: () => router.push('/sparkleStore') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return false;
    }
    try {
      await spendSparkles({ amount: 1, reason: 'dream_style_ref' });
      return true;
    } catch {
      showAlert('Not enough sparkles', 'You need 1 sparkle to dream.', [
        { text: 'Get Sparkles', onPress: () => router.push('/sparkleStore') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return false;
    }
  }, [sparkleBalance, spendSparkles]);

  // ── Pick photo ────────────────────────────────────────────────────
  async function pickPhoto() {
    try {
      const media = await ImageCropPicker.openPicker({
        mediaType: 'photo',
        cropping: false,
        forceJpg: true,
        compressImageQuality: 0.9,
        includeBase64: true,
      });
      setPhotoBase64(media.data ?? null);
      setPhotoUri(media.path);
    } catch {
      /* cancelled */
    }
  }

  // ── Generate dream ────────────────────────────────────────────────
  async function handleDream() {
    if (!refPost || !user || busy.current) return;
    if (!(await trySpendSparkle())) return;
    busy.current = true;
    setError(null);
    imgOpacity.value = 0;
    imgScale.value = 0.85;
    setPhase('dreaming');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let result: {
        image_url: string;
        prompt_used: string;
        ai_concept?: Record<string, unknown> | null;
      };

      if (photoUri && photoBase64) {
        // Photo + style ref: extract ONLY the art medium (first comma segment)
        // and tell Kontext to apply it. Sending the full prompt causes Kontext
        // to replace the photo's subject with the reference scene.
        const refUrl = `data:image/jpeg;base64,${photoBase64}`;
        const artStyle = refPost.prompt.split(',')[0].trim();
        if (__DEV__) console.log('[DreamLikeThis] Photo + style ref, art style:', artStyle);
        const stylePrompt = customPrompt.trim()
          ? `Render this photo as ${artStyle}. ${customPrompt.trim()}. Do not change the person or subject.`
          : `Render this photo as ${artStyle}. Keep the person and subject exactly as they are, only change the art style and rendering technique.`;
        result = await generateDream({
          mode: 'flux-kontext',
          prompt: stylePrompt,
          input_image: refUrl,
        });
      } else if (customPrompt.trim()) {
        // Custom prompt override — user wants their own twist
        if (__DEV__) console.log('[DreamLikeThis] Custom prompt override');
        result = await generateDream({ mode: 'flux-dev', prompt: customPrompt.trim() });
      } else {
        // No photo, no custom prompt — replay the reference prompt directly
        if (__DEV__) console.log('[DreamLikeThis] Replaying reference prompt');
        result = await generateDream({ mode: 'flux-dev', prompt: refPost.prompt });
      }

      setResultUrl(result.image_url);
      setResultPrompt(result.prompt_used);
      setResultConcept(result.ai_concept ?? null);
      setPhase('reveal');
      imgOpacity.value = withTiming(1, { duration: 600 });
      imgScale.value = withSequence(
        withTiming(1.05, { duration: 400 }),
        withTiming(1, { duration: 200 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (__DEV__) console.error('[DreamLikeThis] Error:', msg);
      Toast.show(`Dream error: ${msg}`, 'close-circle');
      setError(msg);
      setPhase('pick');
    } finally {
      busy.current = false;
    }
  }

  // ── Post dream ────────────────────────────────────────────────────
  async function handlePost() {
    if (!resultUrl || !user || !refPost || posting) return;
    setPosting(true);
    setPhase('posting');

    try {
      const imageUrl = await persistImage(resultUrl, user.id);
      const uploadId = await postDream({
        userId: user.id,
        imageUrl,
        prompt: resultPrompt,
        fuseOf: refPost.id,
        aiConcept: resultConcept,
      });

      // Notify original post owner
      if (refPost.userId !== user.id) {
        supabase.from('notifications').insert({
          recipient_id: refPost.userId,
          actor_id: user.id,
          type: 'post_fuse',
          upload_id: refPost.id,
          body: null,
        });
      }

      pinToFeed({
        id: uploadId,
        userId: user.id,
        imageUrl,
        username: user.user_metadata?.username ?? '',
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show('Dream posted!', 'sparkles');
      router.back();
    } catch (err) {
      if (__DEV__) console.warn('[DreamLikeThis] Post error:', err);
      Toast.show('Failed to post dream', 'close-circle');
      setPosting(false);
      setPhase('reveal');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  // ── LOADING ───────────────────────────────────────────────────────
  if (phase === 'loading' || !refPost) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // ── PICK ──────────────────────────────────────────────────────────
  if (phase === 'pick') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Dream Like This</Text>
          <TouchableOpacity
            style={s.sparklePill}
            onPress={() => router.push('/sparkleStore')}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <Text style={s.sparklePillText}>{sparkleBalance}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.center}>
          <View style={s.thumbRow}>
            <View style={s.thumbCol}>
              <Image source={{ uri: refPost.imageUrl }} style={s.thumb} contentFit="cover" />
              <Text style={s.thumbLabel}>Style</Text>
            </View>
            {photoUri && (
              <>
                <Ionicons name="arrow-forward" size={20} color={colors.accent} />
                <View style={s.thumbCol}>
                  <Image source={{ uri: photoUri }} style={s.thumb} contentFit="cover" />
                  <Text style={s.thumbLabel}>Your photo</Text>
                </View>
              </>
            )}
          </View>

          <Text style={s.sub}>
            {photoUri
              ? `Applying ${refPost.username}&apos;s style to your photo`
              : `Dreaming in ${refPost.username}&apos;s style`}
          </Text>

          <View style={[s.promptWrap, { marginTop: 16, alignSelf: 'stretch' }]}>
            <TextInput
              style={s.promptInput}
              placeholder="Add your own twist, or leave blank..."
              placeholderTextColor={colors.textMuted}
              value={customPrompt}
              onChangeText={setCustomPrompt}
              maxLength={300}
              multiline
            />
            {customPrompt.length > 0 && (
              <TouchableOpacity
                onPress={() => setCustomPrompt('')}
                hitSlop={8}
                style={s.promptClear}
              >
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {error && <Text style={s.errorText}>{error}</Text>}

          <View style={[s.buttonRow, { marginTop: 16, alignSelf: 'stretch' }]}>
            <TouchableOpacity style={s.ctaHalf} onPress={pickPhoto} activeOpacity={0.7}>
              <Ionicons name="images" size={18} color={colors.textPrimary} />
              <Text style={s.ctaHalfText}>{photoUri ? 'Change Photo' : 'Use a Photo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.ctaHalf, { backgroundColor: colors.accent }]}
              onPress={handleDream}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={18} color="#FFF" />
              <Text style={[s.ctaHalfText, { color: '#FFFFFF' }]}>Dream It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── DREAMING ──────────────────────────────────────────────────────
  if (phase === 'dreaming') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.title}>Dreaming...</Text>
          <Text style={s.sub}>Applying {refPost.username}&apos;s style</Text>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // ── REVEAL ────────────────────────────────────────────────────────
  if (phase === 'reveal' && resultUrl) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setPhase('pick')} hitSlop={12}>
            <Ionicons name="arrow-back" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Your dream</Text>
          <TouchableOpacity
            style={s.sparklePill}
            onPress={() => router.push('/sparkleStore')}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <Text style={s.sparklePillText}>{sparkleBalance}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.revealCenter}>
          <TouchableOpacity activeOpacity={0.9} onPress={openFullscreen}>
            <Animated.View style={[s.revealBorder, revealStyle]}>
              <Image
                source={{ uri: resultUrl }}
                style={s.revealImg}
                contentFit="cover"
                transition={300}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <Modal visible={fullscreen} transparent animationType="none" statusBarTranslucent>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeFullscreen}>
            <Animated.View style={[s.fsOverlay, fsOverlayStyle]}>
              <GestureDetector gesture={pinchGesture}>
                <Animated.View style={[s.fsImageWrap, fsStyle]}>
                  <Animated.View style={[{ width: '100%', height: '80%' }, pinchStyle]}>
                    <Image
                      source={{ uri: resultUrl }}
                      style={{ width: '100%', height: '100%', borderRadius: 4 }}
                      contentFit="contain"
                    />
                  </Animated.View>
                </Animated.View>
              </GestureDetector>
              <TouchableOpacity style={s.fsClose} onPress={closeFullscreen} activeOpacity={0.7}>
                <View style={s.fsCloseCircle}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Modal>
        <View style={s.footer}>
          <TouchableOpacity style={s.cta} onPress={handleDream} activeOpacity={0.7}>
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={s.ctaText}>Dream Again</Text>
          </TouchableOpacity>
          <View style={s.buttonRow}>
            <TouchableOpacity
              style={s.ctaHalf}
              onPress={() => {
                setPhase('pick');
                setResultUrl(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
              <Text style={s.ctaHalfText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.ctaHalf}
              onPress={handlePost}
              activeOpacity={0.7}
              disabled={posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Ionicons name="cloud-upload" size={18} color={colors.textPrimary} />
              )}
              <Text style={s.ctaHalfText}>{posting ? 'Posting...' : 'Post Dream'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── POSTING ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      <View style={s.center}>
        <Text style={s.title}>Posting your dream...</Text>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  revealCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  sparklePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sparklePillText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  thumbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  thumbCol: { alignItems: 'center' },
  thumb: { width: 100, height: 130, borderRadius: 10 },
  thumbLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },
  promptWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  promptInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    maxHeight: 60,
    paddingVertical: 10,
  },
  promptClear: { padding: 4 },
  errorText: { color: colors.error, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  ctaHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
  },
  ctaHalfText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
  },
  ctaText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  footer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80, gap: 12 },
  revealBorder: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  revealImg: {
    width: PREVIEW_WIDTH,
    height: Math.min(PREVIEW_WIDTH * 1.75, 400),
    borderRadius: 20,
  },
  fsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsImageWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  fsClose: { position: 'absolute', top: 60, right: 20 },
  fsCloseCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
