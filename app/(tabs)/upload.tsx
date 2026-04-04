import { useState, useRef, useMemo } from 'react';
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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageCropPicker from 'react-native-image-crop-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { buildPromptInput } from '@/lib/recipeEngine';
import { Toast } from '@/components/Toast';
import { DEFAULT_RECIPE } from '@/types/recipe';
import type { Recipe } from '@/types/recipe';
import type { VibeProfile } from '@/types/vibeProfile';
import { isVibeProfile } from '@/lib/migrateRecipe';
import { colors } from '@/constants/theme';
import { useSparkleBalance, useSpendSparkles } from '@/hooks/useSparkles';
import { showAlert } from '@/components/CustomAlert';
import { registerRecipe } from '@/lib/recipeRegistry';
import { MASCOT_URLS } from '@/constants/mascots';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 48;

import {
  generateFromPhoto,
  generateFromRecipe,
  generateFromVibeProfile,
  generateTwin,
  generateDream,
  persistImage,
} from '@/lib/dreamApi';
import { moderateText } from '@/lib/moderation';
import { postDream, pinToFeed } from '@/lib/dreamPost';
import { useFusionStore } from '@/store/fusion';

type Phase = 'pick' | 'preview' | 'dreaming' | 'reveal' | 'posting';

export default function DreamScreen() {
  const user = useAuthStore((s) => s.user);
  const mascotUrl = MASCOT_URLS[1]; // artist at easel
  const [phase, setPhase] = useState<Phase>('pick');
  const loadingMascot = MASCOT_URLS[1]; // artist at easel

  const { data: sparkleBalance = 0 } = useSparkleBalance();
  const { mutateAsync: spendSparkles } = useSpendSparkles();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [dreamAlbum, setDreamAlbum] = useState<
    { url: string; prompt: string; fromWish: string | null; dreamMode?: string; archetype?: string }[]
  >([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const albumRef = useRef<FlatList>(null);
  const [userHint, setUserHint] = useState('');
  const [letBotDream, setLetBotDream] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reusePhoto, setReusePhoto] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const dreamMode = useFusionStore((s) => s.mode);
  const fusionTarget = useFusionStore((s) => s.target);
  const clearDreamMode = useFusionStore((s) => s.clear);
  const isTwinMode = dreamMode === 'twin' && !!fusionTarget;

  // Derived from album for backward compat
  const activeDream = dreamAlbum[activeIndex] ?? null;
  const dreamUrl = activeDream?.url ?? null;
  const prompt = activeDream?.prompt ?? '';
  const fsScale = useSharedValue(0);
  const fsOpacity = useSharedValue(0);
  const fsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.5 + fsScale.value * 0.5 }],
    opacity: fsOpacity.value,
  }));
  const fsOverlayStyle = useAnimatedStyle(() => ({
    opacity: fsOpacity.value,
  }));

  // Pinch to zoom on fullscreen preview — focal point aware (matches DreamCard)
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

  const busy = useRef(false);
  const [cachedRecipe, setCachedRecipe] = useState<Recipe | null>(null);
  const [cachedVibeProfile, setCachedVibeProfile] = useState<VibeProfile | null>(null);

  const imgScale = useSharedValue(0.85);
  const imgOpacity = useSharedValue(0);
  const revealStyle = useAnimatedStyle(() => ({
    opacity: imgOpacity.value,
    transform: [{ scale: imgScale.value }],
  }));

  async function loadProfile(): Promise<{ recipe: Recipe | null; vibeProfile: VibeProfile | null }> {
    if (cachedVibeProfile) return { recipe: null, vibeProfile: cachedVibeProfile };
    if (cachedRecipe) return { recipe: cachedRecipe, vibeProfile: null };
    if (!user) return { recipe: DEFAULT_RECIPE, vibeProfile: null };
    const { data } = await supabase
      .from('user_recipes')
      .select('recipe')
      .eq('user_id', user.id)
      .single();
    const raw = data?.recipe as unknown;
    if (isVibeProfile(raw)) {
      setCachedVibeProfile(raw);
      return { recipe: null, vibeProfile: raw };
    }
    const r = (raw as Recipe) ?? DEFAULT_RECIPE;
    setCachedRecipe(r);
    return { recipe: r, vibeProfile: null };
  }

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
      setPhase('preview');
      setDreamAlbum([]);
      setActiveIndex(0);
      setLetBotDream(true);
      setUserHint('');
      imgOpacity.value = 0;
      imgScale.value = 0.85;
    } catch {
      /* cancelled */
    }
  }

  async function dream() {
    if (!photoUri || !user) return;
    if (busy.current) return;
    busy.current = true;
    setError(null);
    if (dreamAlbum.length > 0) {
      setDreaming(true);
    } else {
      imgOpacity.value = 0;
      imgScale.value = 0.85;
      setPhase('dreaming');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (!photoBase64) throw new Error('No photo data');
      const refUrl = `data:image/jpeg;base64,${photoBase64}`;

      let result: { image_url: string; prompt_used: string };

      if (!letBotDream && userHint.trim()) {
        // Moderate user-typed prompt — displayed as caption
        const modResult = await moderateText(userHint.trim());
        if (!modResult.passed) {
          throw new Error(modResult.reason ?? 'Prompt contains inappropriate content');
        }
        // User wrote their own prompt — send it directly with the photo
        result = await generateDream({
          mode: 'flux-kontext',
          prompt: userHint.trim(),
          input_image: refUrl,
        });
      } else {
        // Let Dream Bot handle it via recipe/profile + Haiku enhancement (all server-side)
        const { recipe: loadedRecipe } = await loadProfile();
        const recipe = loadedRecipe ?? DEFAULT_RECIPE;
        const input = buildPromptInput(recipe);
        const scene = [input.eraKeywords, input.settingKeywords, input.sceneAtmosphere]
          .filter(Boolean)
          .join(', ');
        const style = [input.mood, input.lighting, input.colorKeywords, input.weirdnessModifier]
          .filter(Boolean)
          .join(', ');
        const tags = input.personalityTags.join(', ');
        const hint = userHint.trim();

        const haikuRequest = `Write a 40-word max dream reimagining prompt. This is NOT a filter or style transfer — it's a full creative reimagining. The photo is just inspiration, not something to preserve.

DREAM BOT PERSONALITY:
- Medium/Style: ${input.medium}
- Mood: ${input.mood}
- Lighting: ${input.lighting}
- Colors: ${input.colorKeywords || 'vivid'}
- Scene/Setting: ${scene || 'creative setting'}
- Personality: ${tags || 'expressive'}
${input.spiritAppears && input.spiritCompanion ? `- Companion: small ${input.spiritCompanion.replace(/_/g, ' ')} somewhere` : ''}

${
  hint
    ? `USER HINT: "${hint}"

The user typed this hint. Figure out their INTENT and weave it into the dream.`
    : ''
}

IMPORTANT RULES:
- If the photo has a person/face, DO NOT just apply a filter to their face. Instead, reimagine them as a character in a completely new scene using the medium above.
- Transform the photo into something the original photographer could never have taken. Make it a DREAM, not an edit.
- Change the environment, add fantastical elements, alter reality.

FORMAT: "[medium]. [reimagined scene with fantastical elements]. [mood + lighting + colors]."
NO filters. NO subtle edits. Full creative reimagining. Output ONLY the prompt.`;

        const fallback = `Reimagine this image as ${input.medium}. Transform into a fantastical dream scene, ${style}. ${hint ? `Theme: ${hint}.` : ''} No filters, full creative reimagining.`;
        result = await generateDream({
          mode: 'flux-kontext',
          haiku_brief: haikuRequest,
          haiku_fallback: fallback,
          input_image: refUrl,
        });
      }

      const url = result.image_url;
      const p = result.prompt_used;

      setDreamAlbum((prev) => {
        const newIndex = prev.length;
        setActiveIndex(newIndex);
        setTimeout(() => albumRef.current?.scrollToIndex({ index: newIndex, animated: true }), 100);
        return [...prev, { url, prompt: p, fromWish: null, dreamMode: (result as unknown as Record<string, unknown>).dream_mode as string | undefined, archetype: (result as unknown as Record<string, unknown>).archetype as string | undefined }];
      });
      setDreaming(false);
      setPhase('reveal');
      imgOpacity.value = withTiming(1, { duration: 600 });
      imgScale.value = withSequence(
        withTiming(1.05, { duration: 400 }),
        withTiming(1, { duration: 200 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setDreaming(false);
      setPhase(dreamAlbum.length > 0 ? 'reveal' : 'preview');
    } finally {
      busy.current = false;
    }
  }

  const [posting, setPosting] = useState(false);
  const [dreaming, setDreaming] = useState(false);

  async function post() {
    const currentDream = dreamAlbum[activeIndex];
    if (__DEV__) {
      console.log(
        '[Post] START — dream:',
        !!currentDream,
        'user:',
        !!user,
        'posting:',
        posting,
        'activeIndex:',
        activeIndex,
        'albumLen:',
        dreamAlbum.length
      );
    }
    if (!currentDream || !user || posting) {
      if (__DEV__) console.log('[Post] SKIPPED — missing dream/user or already posting');
      return;
    }
    const multiImage = dreamAlbum.length > 1;
    if (!multiImage) setPhase('posting');
    else setPosting(true);
    const postUrl = currentDream.url;
    const postPrompt = currentDream.prompt;
    const postWish = currentDream.fromWish;
    if (__DEV__) {
      console.log('[Post] URL:', postUrl.slice(0, 80));
      console.log('[Post] Prompt:', postPrompt.slice(0, 80));
      console.log('[Post] User ID:', user.id);
      console.log('[Post] Username:', user.user_metadata?.username ?? '(none)');
    }

    try {
      // Persist temp Replicate URL to Supabase Storage now that user wants to keep it
      if (__DEV__) console.log('[Post] Persisting image...');
      const imageUrl = await persistImage(postUrl, user.id);
      if (__DEV__) console.log('[Post] Image persisted:', imageUrl.slice(0, 60));

      let recipeId: string | null = null;
      try {
        const { recipe: postRecipe } = await loadProfile();
        if (postRecipe) recipeId = await registerRecipe(user.id, postRecipe);
        if (__DEV__) console.log('[Post] Recipe registered:', recipeId);
      } catch (recipeErr) {
        if (__DEV__) console.warn('[Post] Recipe registration failed (non-critical):', recipeErr);
      }

      if (__DEV__) console.log('[Post] Inserting upload row...');
      const uploadId = await postDream({
        userId: user.id,
        imageUrl,
        prompt: postPrompt,
        recipeId,
        fromWish: postWish,
        twinOf: isTwinMode ? fusionTarget?.postId : null,
      });
      if (__DEV__) console.log('[Post] Upload created:', uploadId);

      pinToFeed({
        id: uploadId,
        userId: user.id,
        imageUrl,
        username: user.user_metadata?.username ?? '',
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      });
      if (__DEV__) console.log('[Post] Pinned to feed');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (dreamAlbum.length <= 1) {
        // Last/only image — go home
        clearDreamMode();
        reset();
        router.replace('/(tabs)');
      } else {
        // More images remain — remove posted one, stay on screen
        const postedIdx = activeIndex;
        setDreamAlbum((prev) => prev.filter((_, i) => i !== postedIdx));
        setActiveIndex(Math.min(postedIdx, dreamAlbum.length - 2));
        setPosting(false);
      }
    } catch (err) {
      if (__DEV__) console.warn('[Post] Error:', err);
      Toast.show('Failed to post dream', 'close-circle');
      setPosting(false);
      setPhase('reveal');
    }
  }

  // Twin dream — re-roll the exact same prompt from the source post
  async function twinDream() {
    if (!user || !fusionTarget) return;
    if (busy.current) {
      Toast.show('Already dreaming...', 'hourglass');
      return;
    }
    busy.current = true;
    setError(null);
    if (dreamAlbum.length > 0) {
      setDreaming(true);
    } else {
      imgOpacity.value = 0;
      imgScale.value = 0.85;
      setPhase('dreaming');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const p = fusionTarget.prompt;
      if (__DEV__) console.log('[Twin] Generating from prompt:', p.slice(0, 80));
      const result = await generateTwin(p);
      const url = result.image_url;
      setDreamAlbum((prev) => {
        const newIndex = prev.length;
        setActiveIndex(newIndex);
        setTimeout(() => albumRef.current?.scrollToIndex({ index: newIndex, animated: true }), 100);
        return [...prev, { url, prompt: p, fromWish: null, dreamMode: (result as unknown as Record<string, unknown>).dream_mode as string | undefined, archetype: (result as unknown as Record<string, unknown>).archetype as string | undefined }];
      });
      setDreaming(false);
      setPhase('reveal');
      imgOpacity.value = withTiming(1, { duration: 600 });
      imgScale.value = withSequence(
        withTiming(1.05, { duration: 400 }),
        withTiming(1, { duration: 200 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Toast.show(`Twin error: ${msg}`, 'close-circle');
      setError(msg);
      setDreaming(false);
      setPhase(dreamAlbum.length > 0 ? 'reveal' : 'pick');
    } finally {
      busy.current = false;
    }
  }

  // Auto-trigger twin generation when entering twin mode
  const twinTriggered = useRef(false);
  useMemo(() => {
    if (isTwinMode && !twinTriggered.current && phase === 'pick') {
      twinTriggered.current = true;
      setTimeout(() => twinDream(), 100);
    }
    if (!isTwinMode) twinTriggered.current = false;
  }, [isTwinMode, phase]);

  async function justDream() {
    if (__DEV__) console.log('[JustDream] START, user:', !!user, 'busy:', busy.current);
    if (!user) {
      Toast.show('Not logged in', 'close-circle');
      return;
    }
    if (busy.current) {
      Toast.show('Already dreaming...', 'hourglass');
      return;
    }
    busy.current = true;
    setError(null);
    if (__DEV__) console.log('[JustDream] Setting phase to dreaming');
    if (dreamAlbum.length > 0) {
      setDreaming(true);
    } else {
      imgOpacity.value = 0;
      imgScale.value = 0.85;
      setPhase('dreaming');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (__DEV__) console.log('[JustDream] Loading profile...');
      const { recipe, vibeProfile } = await loadProfile();
      if (__DEV__) console.log('[JustDream] Profile loaded, generating via Edge Function...');

      const result = vibeProfile
        ? await generateFromVibeProfile(vibeProfile)
        : await generateFromRecipe(recipe!);
      const url = result.image_url;
      const p = result.prompt_used;
      if (__DEV__) console.log('[JustDream] Image generated:', url.slice(0, 60));
      setDreamAlbum((prev) => {
        const newIndex = prev.length;
        setActiveIndex(newIndex);
        setTimeout(() => albumRef.current?.scrollToIndex({ index: newIndex, animated: true }), 100);
        return [...prev, { url, prompt: p, fromWish: null, dreamMode: (result as unknown as Record<string, unknown>).dream_mode as string | undefined, archetype: (result as unknown as Record<string, unknown>).archetype as string | undefined }];
      });
      setDreaming(false);
      setPhase('reveal');
      imgOpacity.value = withTiming(1, { duration: 600 });
      imgScale.value = withSequence(
        withTiming(1.05, { duration: 400 }),
        withTiming(1, { duration: 200 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (__DEV__) console.error('[JustDream] ERROR:', msg, err);
      Toast.show(`Dream error: ${msg}`, 'close-circle');
      setError(msg);
      setDreaming(false);
      setPhase(dreamAlbum.length > 0 ? 'reveal' : 'pick');
    } finally {
      if (__DEV__) console.log('[JustDream] DONE, resetting busy');
      busy.current = false;
    }
  }

  function reset() {
    setPhase('pick');
    setPhotoUri(null);
    setPhotoBase64(null);
    setDreamAlbum([]);
    setActiveIndex(0);
    setUserHint('');
    setError(null);
    setPosting(false);
    setDreaming(false);
    setLetBotDream(true);
    imgOpacity.value = 0;
    imgScale.value = 0.85;
  }

  // ── PICK ──────────────────────────────────────────────────────────────────

  if (phase === 'pick') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Image source={{ uri: mascotUrl }} style={s.mascot} contentFit="cover" />
          <Text style={s.title}>Dream</Text>
          <Text style={s.sub}>Let your Dream Bot create something new</Text>
          <TouchableOpacity style={s.cta} onPress={justDream} activeOpacity={0.7}>
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={s.ctaText}>Dream Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ctaSecondary} onPress={pickPhoto} activeOpacity={0.7}>
            <Ionicons name="images" size={20} color={colors.textPrimary} />
            <Text style={s.ctaSecondaryText}>Dream a Photo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── PREVIEW ───────────────────────────────────────────────────────────────

  if (phase === 'preview') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={reset} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Dream this</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={s.previewWrap}>
          <Image source={{ uri: photoUri! }} style={s.previewImg} contentFit="cover" />

          {/* Toggle: let bot dream vs write your own */}
          <TouchableOpacity
            style={s.toggleRow}
            onPress={() => {
              setLetBotDream(!letBotDream);
              if (!letBotDream) setUserHint('');
            }}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, letBotDream && s.checkboxActive]}>
              {letBotDream && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={s.toggleLabel}>Let Dream Bot dream this</Text>
          </TouchableOpacity>

          {!letBotDream && (
            <View style={s.promptWrap}>
              <Text style={s.promptHint}>
                Describe your own dream — your words become the vision
              </Text>
              <TextInput
                style={s.promptInput}
                placeholder="A cozy cabin in the woods during a snowstorm, painted in watercolors..."
                placeholderTextColor={colors.textMuted}
                value={userHint}
                onChangeText={setUserHint}
                maxLength={500}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          {letBotDream && (
            <Text style={s.botNote}>Your Dream Bot will dream this photo for you</Text>
          )}
        </View>
        {error && <Text style={s.errorText}>{error}</Text>}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.cta, !letBotDream && !userHint.trim() && s.ctaDisabled]}
            onPress={() => {
              setError(null);
              dream();
            }}
            disabled={!letBotDream && !userHint.trim()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="sparkles"
              size={20}
              color={!letBotDream && !userHint.trim() ? colors.textSecondary : '#FFF'}
            />
            <Text style={[s.ctaText, !letBotDream && !userHint.trim() && s.ctaTextDisabled]}>
              Dream It
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── DREAMING ──────────────────────────────────────────────────────────────

  if (phase === 'dreaming') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Image source={{ uri: loadingMascot }} style={s.loadingMascot} contentFit="cover" />
          <Text style={s.title}>Dreaming...</Text>
          <Text style={s.sub}>Your Dream Bot is dreaming your photo</Text>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // ── REVEAL ────────────────────────────────────────────────────────────────

  if (phase === 'reveal' && dreamAlbum.length > 0) {
    const ITEM_WIDTH = PREVIEW_WIDTH;
    const ITEM_SPACING = 16;
    const SNAP_WIDTH = ITEM_WIDTH + ITEM_SPACING;

    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={reset} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Your dream</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <FlatList
            ref={albumRef}
            data={dreamAlbum}
            keyExtractor={(item, i) => `${i}-${item.url.slice(-20)}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 24 }}
            getItemLayout={(_, index) => ({
              length: SNAP_WIDTH,
              offset: SNAP_WIDTH * index,
              index,
            })}
            onScroll={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP_WIDTH);
              const clamped = Math.max(0, Math.min(idx, dreamAlbum.length - 1));
              if (clamped !== activeIndex) setActiveIndex(clamped);
            }}
            scrollEventThrottle={16}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setActiveIndex(index);
                  setFullscreen(true);
                  fsScale.value = 0;
                  fsOpacity.value = 0;
                  fsScale.value = withTiming(1, { duration: 300 });
                  fsOpacity.value = withTiming(1, { duration: 250 });
                }}
                style={{ width: ITEM_WIDTH, marginRight: ITEM_SPACING }}
              >
                <Animated.View
                  style={[
                    s.revealBorder,
                    index === dreamAlbum.length - 1 ? revealStyle : undefined,
                  ]}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={s.revealImg}
                    contentFit="cover"
                    transition={300}
                  />
                  {/* Dream mode label */}
                  {item.dreamMode && (
                    <View style={s.dreamModeLabel}>
                      <Text style={s.dreamModeLabelText}>
                        {item.dreamMode === 'archetype' ? `♫ Solo: ${(item.archetype ?? '').replace(/_/g, ' ').slice(0, 25)}` : item.dreamMode === 'beauty' ? '🎵 Song' : '🎶 Chord'}
                      </Text>
                    </View>
                  )}
                  {dreaming && index === activeIndex && (
                    <View style={s.dreamingOverlay}>
                      <ActivityIndicator size="large" color={colors.accent} />
                      <Text style={s.dreamingText}>Dreaming...</Text>
                    </View>
                  )}
                  {dreamAlbum.length > 1 && !dreaming && (
                    <TouchableOpacity
                      style={s.dismissBadge}
                      onPress={() => {
                        setDreamAlbum((prev) => prev.filter((_, i) => i !== index));
                        setActiveIndex(Math.min(activeIndex, dreamAlbum.length - 2));
                      }}
                      hitSlop={8}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </TouchableOpacity>
            )}
          />
          {dreamAlbum.length > 1 && (
            <View style={s.dotRow}>
              {dreamAlbum.map((_, i) => (
                <View key={i} style={[s.dot, i === activeIndex && s.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Fullscreen dream preview */}
        <Modal visible={fullscreen} transparent animationType="none" statusBarTranslucent>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              fsScale.value = withTiming(0, { duration: 250 });
              fsOpacity.value = withTiming(0, { duration: 250 });
              setTimeout(() => setFullscreen(false), 260);
            }}
          >
            <Animated.View style={[s.fsOverlay, fsOverlayStyle]}>
              <GestureDetector gesture={pinchGesture}>
                <Animated.View style={[s.fsImageWrap, fsStyle]}>
                  <Animated.View style={[{ width: '100%', height: '80%' }, pinchStyle]}>
                    <Image
                      source={{ uri: dreamAlbum[activeIndex]?.url ?? '' }}
                      style={{ width: '100%', height: '100%', borderRadius: 4 }}
                      contentFit="contain"
                    />
                  </Animated.View>
                </Animated.View>
              </GestureDetector>
              <TouchableOpacity
                style={s.fsClose}
                onPress={() => {
                  fsScale.value = withTiming(0, { duration: 250 });
                  fsOpacity.value = withTiming(0, { duration: 250 });
                  setTimeout(() => setFullscreen(false), 260);
                }}
                activeOpacity={0.7}
              >
                <View style={s.fsCloseCircle}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Modal>

        <View style={s.footer}>
          <TouchableOpacity
            style={s.cta}
            onPress={() => {
              if (isTwinMode) twinDream();
              else if (reusePhoto && photoUri) dream();
              else justDream();
            }}
            activeOpacity={0.7}
            disabled={posting || dreaming}
          >
            <Ionicons
              name={isTwinMode ? 'dice-outline' : 'refresh'}
              size={20}
              color="#FFF"
            />
            <Text style={s.ctaText}>{isTwinMode ? 'Twin Again' : 'Dream Again'}</Text>
          </TouchableOpacity>
          {photoUri && (
            <TouchableOpacity
              style={s.reuseRow}
              onPress={() => setReusePhoto(!reusePhoto)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={reusePhoto ? 'checkbox' : 'square-outline'}
                size={18}
                color={reusePhoto ? colors.accent : colors.textSecondary}
              />
              <Text style={[s.reuseText, reusePhoto && s.reuseTextActive]}>
                Reuse original photo
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={s.ctaSecondary}
            onPress={post}
            activeOpacity={0.7}
            disabled={posting || dreaming}
          >
            {posting ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Ionicons name="cloud-upload" size={20} color={colors.textPrimary} />
            )}
            <Text style={s.ctaSecondaryText}>{posting ? 'Posting...' : 'Post This Dream'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── POSTING ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root}>
      <View style={s.center}>
        <Image source={{ uri: loadingMascot }} style={s.loadingMascot} contentFit="cover" />
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
    paddingHorizontal: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  mascot: { width: 120, height: 120, borderRadius: 24, marginBottom: 12 },
  loadingMascot: { width: 140, height: 140, borderRadius: 28, marginBottom: 8 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
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
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
  },
  ctaSecondaryText: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  ctaDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ctaTextDisabled: { color: colors.textSecondary },
  footer: { paddingHorizontal: 20, paddingBottom: 80, gap: 12 },
  previewWrap: { flex: 1, paddingHorizontal: 24, alignItems: 'center', gap: 20 },
  previewImg: { width: PREVIEW_WIDTH, height: PREVIEW_WIDTH * 1.2, borderRadius: 16 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  botNote: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  promptWrap: {
    width: '100%',
    gap: 8,
  },
  promptHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  promptInput: {
    width: '100%',
    minHeight: 100,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
  errorText: { color: colors.error, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  revealWrap: { flex: 1, justifyContent: 'center' },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { backgroundColor: '#FFFFFF' },
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
  dismissBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dreamingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 20,
  },
  dreamingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  dreamModeLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dreamModeLabelText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  promptText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 17,
  },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  sec: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  secText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  reuseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  reuseText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  reuseTextActive: { color: colors.accent },
  // Fullscreen preview
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
  fsImage: { width: '100%', height: '80%', borderRadius: 4 },
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
