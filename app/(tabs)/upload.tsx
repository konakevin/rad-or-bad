import { useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Dimensions, Modal, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageCropPicker from 'react-native-image-crop-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useFeedStore } from '@/store/feed';
import { buildPromptInput, buildRawPrompt } from '@/lib/recipeEngine';
import { Toast } from '@/components/Toast';
import { DEFAULT_RECIPE } from '@/types/recipe';
import type { Recipe } from '@/types/recipe';
import { colors } from '@/constants/theme';
import { useFusionStore } from '@/store/fusion';
import { useDreamFusion } from '@/hooks/useDreamFusion';
import { useSparkleBalance, useSpendSparkles } from '@/hooks/useSparkles';
import { useDreamWish, useSetDreamWish } from '@/hooks/useDreamWish';
import { showAlert } from '@/components/CustomAlert';
import { MASCOT_URLS } from '@/constants/mascots';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 48;

// TODO: move to edge function for production
const REPLICATE_TOKEN = '***REMOVED***';
const ANTHROPIC_KEY = '***REMOVED***';

type Phase = 'pick' | 'preview' | 'dreaming' | 'reveal' | 'posting';

const FUSE_COST = 3;
const STYLE_COST = 2;

export default function DreamScreen() {
  const user = useAuthStore((s) => s.user);
  const mascotUrl = MASCOT_URLS[1]; // artist at easel
  const [phase, setPhase] = useState<Phase>('pick');
  const loadingMascot = MASCOT_URLS[1]; // artist at easel

  // Fusion context
  const fusionTarget = useFusionStore((s) => s.target);
  const clearFusion = useFusionStore((s) => s.clear);
  const { mutateAsync: fuseAsync, isPending: isFusing } = useDreamFusion();
  const { data: sparkleBalance = 0 } = useSparkleBalance();
  const { mutateAsync: spendSparkles } = useSpendSparkles();
  const { wish } = useDreamWish();
  const { mutate: clearWish } = useSetDreamWish();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [dreamAlbum, setDreamAlbum] = useState<{ url: string; prompt: string; fromWish: string | null }[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const albumRef = useRef<FlatList>(null);
  const [userHint, setUserHint] = useState('');
  const [letBotDream, setLetBotDream] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reusePhoto, setReusePhoto] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

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
  const busy = useRef(false);
  const [cachedRecipe, setCachedRecipe] = useState<Recipe | null>(null);

  const imgScale = useSharedValue(0.85);
  const imgOpacity = useSharedValue(0);
  const revealStyle = useAnimatedStyle(() => ({
    opacity: imgOpacity.value,
    transform: [{ scale: imgScale.value }],
  }));

  async function loadRecipe(): Promise<Recipe> {
    if (cachedRecipe) return cachedRecipe;
    if (!user) return DEFAULT_RECIPE;
    const { data } = await supabase
      .from('user_recipes')
      .select('recipe')
      .eq('user_id', user.id)
      .single();
    const r = (data?.recipe as Recipe) ?? DEFAULT_RECIPE;
    setCachedRecipe(r);
    return r;
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
    } catch { /* cancelled */ }
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

      let p: string;

      if (!letBotDream && userHint.trim()) {
        // User wrote their own prompt — use it directly
        p = userHint.trim();
      } else {
        // Let Dream Bot handle it via recipe + Haiku enhancement
        const recipe = await loadRecipe();
        const input = buildPromptInput(recipe);
        const scene = [input.eraKeywords, input.settingKeywords, input.sceneAtmosphere].filter(Boolean).join(', ');
        const style = [input.mood, input.lighting, input.colorKeywords, input.weirdnessModifier].filter(Boolean).join(', ');
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

${wish ? `DREAM WISH: "${wish}"

The user made this wish. It is the HEART of the dream — the subject, scene, or theme they want. Use the Dream Bot personality above to STYLE it (medium, mood, lighting, colors), but the wish defines WHAT the dream is about. If the wish specifies its own mood or style elements, the wish wins over the personality traits.` : ''}
${hint ? `USER HINT: "${hint}"

The user typed this hint. Figure out their INTENT and weave it into the dream.` : ''}

IMPORTANT RULES:
- If the photo has a person/face, DO NOT just apply a filter to their face. Instead, reimagine them as a character in a completely new scene using the medium above.
- Transform the photo into something the original photographer could never have taken. Make it a DREAM, not an edit.
- Change the environment, add fantastical elements, alter reality.

FORMAT: "[medium]. [reimagined scene with fantastical elements]. [mood + lighting + colors]."
NO filters. NO subtle edits. Full creative reimagining. Output ONLY the prompt.`;

        try {
          const haikuRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': ANTHROPIC_KEY,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 100,
              messages: [{ role: 'user', content: haikuRequest }],
            }),
          });
          if (!haikuRes.ok) throw new Error('Haiku error');
          const haikuData = await haikuRes.json();
          p = haikuData.content?.[0]?.text?.trim() ?? '';
        } catch {
          p = `Reimagine this image as ${input.medium}. Transform into a fantastical dream scene, ${style}. ${wish ? `Dream wish: ${wish}.` : ''} ${hint ? `Theme: ${hint}.` : ''} No filters, full creative reimagining.`;
        }
      }

      // Generate via Flux Kontext Pro on Replicate
      const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            prompt: p,
            input_image: refUrl,
            aspect_ratio: '9:16',
            output_format: 'jpg',
            output_quality: 90,
          },
        }),
      });

      const createData = await createRes.json();
      if (!createData.id) throw new Error('Dream generation failed to start');

      // Poll for result
      let url: string | null = null;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${createData.id}`, {
          headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
        });
        const pollData = await pollRes.json();

        if (pollData.status === 'succeeded') {
          url = typeof pollData.output === 'string' ? pollData.output : pollData.output?.[0];
          break;
        }
        if (pollData.status === 'failed') throw new Error('Dream generation failed');
      }

      if (!url) throw new Error('Dream generation timed out');

      const usedWish = wish;
      setDreamAlbum(prev => {
        const newIndex = prev.length;
        setActiveIndex(newIndex);
        setTimeout(() => albumRef.current?.scrollToIndex({ index: newIndex, animated: true }), 100);
        return [...prev, { url, prompt: p, fromWish: usedWish }];
      });
      if (usedWish) clearWish(null);
      setDreaming(false);
      setPhase('reveal');
      imgOpacity.value = withTiming(1, { duration: 600 });
      imgScale.value = withSequence(withTiming(1.05, { duration: 400 }), withTiming(1, { duration: 200 }));
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
    if (!currentDream || !user || posting) return;
    const multiImage = dreamAlbum.length > 1;
    if (!multiImage) setPhase('posting');
    else setPosting(true);
    const postUrl = currentDream.url;
    const postPrompt = currentDream.prompt;
    const postWish = currentDream.fromWish;
    console.log('[Post] Starting post with URL:', postUrl.slice(0, 60));

    try {
      const resp = await fetch(postUrl);
      if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`);
      const buf = await resp.arrayBuffer();
      console.log('[Post] Downloaded image:', buf.byteLength, 'bytes');
      const fileName = `${user.id}/${Date.now()}.jpg`;

      console.log('[Post] Uploading to storage...');
      const { error } = await supabase.storage
        .from('uploads')
        .upload(fileName, buf, { contentType: 'image/jpeg' });
      if (error) throw error;
      console.log('[Post] Storage upload done');

      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
      const captionText = postPrompt.length > 200 ? postPrompt.slice(0, 197) + '...' : postPrompt;

      const { data: insertedRow } = await supabase.from('uploads').insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        media_type: 'image',
        categories: ['art'],
        caption: captionText,
        is_active: true,
        is_approved: true,
        is_moderated: true,
        is_ai_generated: true,
        ai_prompt: postPrompt,
        total_votes: 0, rad_votes: 0, bad_votes: 0,
        width: 768, height: 1664,
        from_wish: postWish,
      }).select('id').single();

      // Pin to feed so it shows as top card
      useFeedStore.getState().setPinnedPost({
        id: insertedRow?.id ?? `temp-${Date.now()}`,
        user_id: user.id,
        image_url: urlData.publicUrl,
        caption: captionText,
        username: user.user_metadata?.username ?? '',
        avatar_url: user.user_metadata?.avatar_url ?? null,
        is_ai_generated: true,
        created_at: new Date().toISOString(),
        comment_count: 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (dreamAlbum.length <= 1) {
        // Last/only image — go home
        reset();
        router.replace('/(tabs)');
      } else {
        // More images remain — remove posted one, stay on screen
        const postedIdx = activeIndex;
        setDreamAlbum(prev => prev.filter((_, i) => i !== postedIdx));
        setActiveIndex(Math.min(postedIdx, dreamAlbum.length - 2));
        setPosting(false);
      }
    } catch (err) {
      console.warn('[Post] Error:', err);
      Toast.show('Failed to post dream', 'close-circle');
      setPosting(false);
      setPhase('reveal');
    }
  }

  async function handleFusion(mode: 'fuse' | 'style') {
    if (!fusionTarget || !user) return;
    const cost = mode === 'fuse' ? FUSE_COST : STYLE_COST;
    if (sparkleBalance < cost) {
      showAlert('Not enough sparkles', `You need ${cost}✨ but have ${sparkleBalance}✨`);
      return;
    }
    try {
      await spendSparkles({ amount: cost, reason: `dream_${mode}`, referenceId: fusionTarget.postId });
      setPhase('dreaming');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await fuseAsync({ mode, sourcePostId: fusionTarget.postId, sourcePrompt: fusionTarget.prompt });
      setDreamAlbum(prev => {
        const newIndex = prev.length;
        setActiveIndex(newIndex);
        setTimeout(() => albumRef.current?.scrollToIndex({ index: newIndex, animated: true }), 100);
        return [...prev, { url: result.imageUrl, prompt: result.prompt, fromWish: null }];
      });
      setPhase('reveal');
      imgOpacity.value = withTiming(1, { duration: 600 });
      imgScale.value = withSequence(withTiming(1.05, { duration: 400 }), withTiming(1, { duration: 200 }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearFusion();
    } catch (err) {
      setPhase('pick');
      const msg = (err as Error).message;
      if (msg === 'Not enough sparkles') {
        showAlert('Not enough sparkles', `You need ${cost}✨ but have ${sparkleBalance}✨`);
      } else {
        Toast.show('Dream fusion failed', 'close-circle');
      }
    }
  }

  async function justDream() {
    if (!user) return;
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
      const recipe = await loadRecipe();
      const input = buildPromptInput(recipe);
      let p = buildRawPrompt(input);
      if (wish) {
        p = `${p}. DREAM WISH: "${wish}" — this is the heart of the dream, the subject and scene the user wants. The style traits above shape HOW it looks.`;
      }

      // Generate via Replicate
      const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { prompt: p, aspect_ratio: '9:16', num_outputs: 1, output_format: 'jpg' },
        }),
      });

      if (createRes.status === 429) {
        const body = await createRes.json();
        await new Promise((r) => setTimeout(r, (body.retry_after ?? 6) * 1000));
        busy.current = false;
        return justDream();
      }

      if (!createRes.ok) throw new Error('Generation failed to start');
      const createData = await createRes.json();
      if (!createData.id) throw new Error('No prediction ID');

      let url: string | null = null;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${createData.id}`, {
          headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
        });
        const pollData = await pollRes.json();
        if (pollData.status === 'succeeded') { url = pollData.output?.[0]; break; }
        if (pollData.status === 'failed') throw new Error('Generation failed');
      }

      if (!url) throw new Error('Generation timed out');
      const usedWish = wish;
      setDreamAlbum(prev => {
        const newIndex = prev.length;
        setActiveIndex(newIndex);
        setTimeout(() => albumRef.current?.scrollToIndex({ index: newIndex, animated: true }), 100);
        return [...prev, { url, prompt: p, fromWish: usedWish }];
      });
      if (usedWish) clearWish(null);
      setDreaming(false);
      setPhase('reveal');
      imgOpacity.value = withTiming(1, { duration: 600 });
      imgScale.value = withSequence(withTiming(1.05, { duration: 400 }), withTiming(1, { duration: 200 }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setDreaming(false);
      setPhase(dreamAlbum.length > 0 ? 'reveal' : 'pick');
    } finally {
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
    clearFusion();
    imgOpacity.value = 0;
    imgScale.value = 0.85;
  }

  // ── PICK ──────────────────────────────────────────────────────────────────

  if (phase === 'pick') {
    // Fusion mode — user tapped merge on someone's dream
    if (fusionTarget) {
      return (
        <SafeAreaView style={s.root}>
          <View style={s.fusionHeader}>
            <TouchableOpacity onPress={() => clearFusion()} hitSlop={12}>
              <Ionicons name="close" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Dream Fusion</Text>
            <View style={s.sparkleRow}>
              <Ionicons name="sparkles" size={14} color={colors.accent} />
              <Text style={s.sparkleText}>{sparkleBalance}</Text>
            </View>
          </View>
          <View style={s.fusionContent}>
            <Image source={{ uri: fusionTarget.imageUrl }} style={s.fusionThumb} contentFit="cover" />
            <Text style={s.fusionLabel}>@{fusionTarget.username}'s dream</Text>

            <TouchableOpacity style={s.fusionOption} onPress={() => handleFusion('fuse')} activeOpacity={0.7}>
              <View style={s.fusionOptionIcon}>
                <Ionicons name="git-merge" size={22} color={colors.accent} />
              </View>
              <View style={s.fusionOptionText}>
                <Text style={s.fusionOptionTitle}>Fuse Dreams</Text>
                <Text style={s.fusionOptionSub}>Blend this dream with your Dream Bot's style</Text>
              </View>
              <View style={s.costBadge}><Text style={s.costText}>{FUSE_COST}✨</Text></View>
            </TouchableOpacity>

            <TouchableOpacity style={s.fusionOption} onPress={() => handleFusion('style')} activeOpacity={0.7}>
              <View style={s.fusionOptionIcon}>
                <Ionicons name="brush" size={22} color={colors.accent} />
              </View>
              <View style={s.fusionOptionText}>
                <Text style={s.fusionOptionTitle}>Dream in this style</Text>
                <Text style={s.fusionOptionSub}>Your Dream Bot adopts this art style</Text>
              </View>
              <View style={s.costBadge}><Text style={s.costText}>{STYLE_COST}✨</Text></View>
            </TouchableOpacity>

            <TouchableOpacity style={s.fusionOption} onPress={() => { pickPhoto(); }} activeOpacity={0.7}>
              <View style={s.fusionOptionIcon}>
                <Ionicons name="images" size={22} color={colors.accent} />
              </View>
              <View style={s.fusionOptionText}>
                <Text style={s.fusionOptionTitle}>Dream a photo in this style</Text>
                <Text style={s.fusionOptionSub}>Pick a photo and apply this dream's style</Text>
              </View>
              <View style={s.costBadge}><Text style={s.costText}>{STYLE_COST}✨</Text></View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    // Normal mode
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
          <TouchableOpacity onPress={reset} hitSlop={12}><Ionicons name="close" size={28} color={colors.textSecondary} /></TouchableOpacity>
          <Text style={s.headerTitle}>Dream this</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={s.previewWrap}>
          <Image source={{ uri: photoUri! }} style={s.previewImg} contentFit="cover" />

          {/* Toggle: let bot dream vs write your own */}
          <TouchableOpacity
            style={s.toggleRow}
            onPress={() => { setLetBotDream(!letBotDream); if (!letBotDream) setUserHint(''); }}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, letBotDream && s.checkboxActive]}>
              {letBotDream && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={s.toggleLabel}>Let Dream Bot dream this</Text>
          </TouchableOpacity>

          {!letBotDream && (
            <View style={s.promptWrap}>
              <Text style={s.promptHint}>Describe your own dream — your words become the vision</Text>
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
            onPress={() => { setError(null); dream(); }}
            disabled={!letBotDream && !userHint.trim()}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={20} color={!letBotDream && !userHint.trim() ? colors.textSecondary : '#FFF'} />
            <Text style={[s.ctaText, !letBotDream && !userHint.trim() && s.ctaTextDisabled]}>Dream It</Text>
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
          <TouchableOpacity onPress={reset} hitSlop={12}><Ionicons name="close" size={28} color={colors.textSecondary} /></TouchableOpacity>
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
            getItemLayout={(_, index) => ({ length: SNAP_WIDTH, offset: SNAP_WIDTH * index, index })}
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
                <Animated.View style={[s.revealBorder, index === dreamAlbum.length - 1 ? revealStyle : undefined]}>
                  <Image source={{ uri: item.url }} style={s.revealImg} contentFit="cover" transition={300} />
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
                        setDreamAlbum(prev => prev.filter((_, i) => i !== index));
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
          <Pressable style={StyleSheet.absoluteFill} onPress={() => {
            fsScale.value = withTiming(0, { duration: 250 });
            fsOpacity.value = withTiming(0, { duration: 250 });
            setTimeout(() => setFullscreen(false), 260);
          }}>
            <Animated.View style={[s.fsOverlay, fsOverlayStyle]}>
              <Animated.View style={[s.fsImageWrap, fsStyle]}>
                <Image source={{ uri: dreamAlbum[activeIndex]?.url ?? ''}} style={s.fsImage} contentFit="contain" />
              </Animated.View>
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
          <TouchableOpacity style={s.cta} onPress={post} activeOpacity={0.7} disabled={posting || dreaming}>
            {posting
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="cloud-upload" size={20} color="#FFF" />
            }
            <Text style={s.ctaText}>{posting ? 'Posting...' : 'Post This Dream'}</Text>
          </TouchableOpacity>
          {photoUri && (
            <TouchableOpacity style={s.reuseRow} onPress={() => setReusePhoto(!reusePhoto)} activeOpacity={0.7}>
              <Ionicons
                name={reusePhoto ? 'checkbox' : 'square-outline'}
                size={18}
                color={reusePhoto ? colors.accent : colors.textSecondary}
              />
              <Text style={[s.reuseText, reusePhoto && s.reuseTextActive]}>Reuse original photo</Text>
            </TouchableOpacity>
          )}
          <View style={s.row}>
            <TouchableOpacity style={s.sec} onPress={() => reusePhoto && photoUri ? dream() : justDream()} activeOpacity={0.7}>
              <Ionicons name="refresh" size={16} color={colors.textSecondary} />
              <Text style={s.secText}>Dream again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sec} onPress={reset} activeOpacity={0.7}>
              <Ionicons name="images" size={16} color={colors.textSecondary} />
              <Text style={s.secText}>Start over</Text>
            </TouchableOpacity>
          </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  mascot: { width: 120, height: 120, borderRadius: 24, marginBottom: 12 },
  loadingMascot: { width: 140, height: 140, borderRadius: 28, marginBottom: 8 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  fusionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  sparkleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sparkleText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  fusionContent: { flex: 1, paddingHorizontal: 20, alignItems: 'center', gap: 14, paddingTop: 8 },
  fusionThumb: {
    width: 80, height: 110, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  },
  fusionLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  fusionOption: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 16, gap: 14,
  },
  fusionOptionIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentBg,
    alignItems: 'center', justifyContent: 'center',
  },
  fusionOptionText: { flex: 1, gap: 2 },
  fusionOptionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  fusionOptionSub: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  costBadge: {
    backgroundColor: colors.accentBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  costText: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, width: '100%' },
  ctaText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  ctaSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, width: '100%' },
  ctaSecondaryText: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  ctaDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ctaTextDisabled: { color: colors.textSecondary },
  footer: { paddingHorizontal: 20, paddingBottom: 80, gap: 12 },
  previewWrap: { flex: 1, paddingHorizontal: 24, alignItems: 'center', gap: 20 },
  previewImg: { width: PREVIEW_WIDTH, height: PREVIEW_WIDTH * 1.2, borderRadius: 16 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start',
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.accent, borderColor: colors.accent,
  },
  toggleLabel: {
    color: colors.textPrimary, fontSize: 15, fontWeight: '600',
  },
  botNote: {
    color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18,
    paddingHorizontal: 8,
  },
  promptWrap: {
    width: '100%', gap: 8,
  },
  promptHint: {
    color: colors.textSecondary, fontSize: 13, lineHeight: 18,
  },
  promptInput: {
    width: '100%', minHeight: 100, backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16,
    paddingTop: 14, paddingBottom: 14, color: colors.textPrimary, fontSize: 15,
    lineHeight: 21,
  },
  errorText: { color: colors.error, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  revealWrap: { flex: 1, justifyContent: 'center' },
  dotRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { backgroundColor: '#FFFFFF' },
  revealBorder: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  revealImg: { width: PREVIEW_WIDTH, height: Math.min(PREVIEW_WIDTH * 1.75, 400), borderRadius: 20 },
  dismissBadge: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  dreamingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 20,
  },
  dreamingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  promptText: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 17 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  sec: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  secText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  reuseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  reuseText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  reuseTextActive: { color: colors.accent },
  // Fullscreen preview
  fsOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  fsImageWrap: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8,
  },
  fsImage: { width: '100%', height: '80%', borderRadius: 4 },
  fsClose: { position: 'absolute', top: 60, right: 20 },
  fsCloseCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
});
