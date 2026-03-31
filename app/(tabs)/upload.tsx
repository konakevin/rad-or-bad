import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageCropPicker from 'react-native-image-crop-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { buildPromptInput } from '@/lib/recipeEngine';
import { DEFAULT_RECIPE } from '@/types/recipe';
import type { Recipe } from '@/types/recipe';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 48;

// TODO: move to edge function for production
const REPLICATE_TOKEN = '***REMOVED***';
const ANTHROPIC_KEY = '***REMOVED***';

type Phase = 'pick' | 'preview' | 'dreaming' | 'reveal' | 'posting';

export default function DreamScreen() {
  const user = useAuthStore((s) => s.user);
  const [phase, setPhase] = useState<Phase>('pick');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [dreamUrl, setDreamUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [userHint, setUserHint] = useState('');
  const [strength, setStrength] = useState(0.65);
  const [error, setError] = useState<string | null>(null);
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
      setDreamUrl(null);
      imgOpacity.value = 0;
      imgScale.value = 0.85;
    } catch { /* cancelled */ }
  }

  async function dream() {
    if (!photoUri || !user) return;
    if (busy.current) return;
    busy.current = true;
    setDreamUrl(null);
    setError(null);
    imgOpacity.value = 0;
    imgScale.value = 0.85;
    setPhase('dreaming');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (!photoBase64) throw new Error('No photo data');
      const refUrl = `data:image/jpeg;base64,${photoBase64}`;

      // Build recipe attributes
      const recipe = await loadRecipe();
      const input = buildPromptInput(recipe);
      const scene = [input.eraKeywords, input.settingKeywords, input.sceneAtmosphere].filter(Boolean).join(', ');
      const style = [input.mood, input.lighting, input.colorKeywords, input.weirdnessModifier].filter(Boolean).join(', ');
      const tags = input.personalityTags.join(', ');
      const hint = userHint.trim();

      // Haiku enhances the prompt using recipe + user hint
      const haikuRequest = `Write a 30-word max image restyling prompt.

RECIPE DEFAULTS (use these unless the user's hint overrides a specific part):
- Medium/Style: ${input.medium}
- Mood: ${input.mood}
- Lighting: ${input.lighting}
- Colors: ${input.colorKeywords || 'vivid'}
- Scene/Setting: ${scene || 'creative setting'}
- Personality: ${tags || 'expressive'}
${input.spiritAppears && input.spiritCompanion ? `- Companion: small ${input.spiritCompanion.replace(/_/g, ' ')} somewhere` : ''}

${hint ? `USER HINT: "${hint}"

The user typed this hint. Figure out their INTENT — what are they trying to change? Replace ONLY the recipe attribute(s) that match their intent. Keep everything else exactly as the recipe says.

For example if the recipe says "oil painting, cozy mood, warm colors, forest scene" and the user says "make it neon" — only the colors change. The oil painting, cozy mood, and forest stay.` : ''}

FORMAT: "Restyle as [medium]. [scene]. [mood + lighting + colors]. Keep the subject recognizable."
NO poetry. NO abstract words. Output ONLY the prompt.`;

      let p: string;
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
        p = `Restyle this image as ${input.medium}, ${style}. ${hint ? `Theme: ${hint}.` : ''} Keep the subject recognizable.`;
      }

      setPrompt(p);

      // Generate via Flux Kontext Pro on Replicate
      const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            prompt: p,
            input_image: refUrl,
            aspect_ratio: 'match_input_image',
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

      setDreamUrl(url);
      setPhase('reveal');
      imgOpacity.value = withTiming(1, { duration: 600 });
      imgScale.value = withSequence(withTiming(1.05, { duration: 400 }), withTiming(1, { duration: 200 }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setPhase('preview');
    } finally {
      busy.current = false;
    }
  }

  async function post() {
    if (!dreamUrl || !user) return;
    setPhase('posting');

    try {
      const resp = await fetch(dreamUrl);
      const buf = await resp.arrayBuffer();
      const fileName = `ai/${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from('uploads')
        .upload(fileName, buf, { contentType: 'image/jpeg' });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);

      await supabase.from('uploads').insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        media_type: 'image',
        categories: ['art'],
        caption: prompt.length > 200 ? prompt.slice(0, 197) + '...' : prompt,
        is_active: true,
        is_approved: true,
        is_moderated: true,
        is_ai_generated: true,
        ai_prompt: prompt,
        total_votes: 0, rad_votes: 0, bad_votes: 0,
        width: 768, height: 1664,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
    } catch {
      setPhase('reveal');
    }
  }

  function reset() {
    setPhase('pick');
    setPhotoUri(null);
    setPhotoBase64(null);
    setDreamUrl(null);
    setUserHint('');
    setPrompt('');
    setError(null);
    imgOpacity.value = 0;
    imgScale.value = 0.85;
  }

  // ── PICK ──────────────────────────────────────────────────────────────────

  if (phase === 'pick') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <View style={s.moonIcon}>
            <Ionicons name="moon" size={48} color={colors.accent} />
          </View>
          <Text style={s.title}>Dream a photo</Text>
          <Text style={s.sub}>Pick a photo and your dream machine will transform it</Text>
          <TouchableOpacity style={s.cta} onPress={pickPhoto} activeOpacity={0.7}>
            <Ionicons name="images" size={20} color="#FFF" />
            <Text style={s.ctaText}>Choose a Photo</Text>
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
          <TextInput
            style={s.hintInput}
            placeholder="Add a dream hint... (optional)"
            placeholderTextColor={colors.textSecondary}
            value={userHint}
            onChangeText={setUserHint}
            maxLength={80}
          />
        </View>
        {error && <Text style={s.errorText}>{error}</Text>}
        <View style={s.footer}>
          <TouchableOpacity style={s.cta} onPress={() => { setError(null); dream(); }} activeOpacity={0.7}>
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={s.ctaText}>Dream It</Text>
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
          <ActivityIndicator size="large" color="#FF4500" />
          <Text style={s.title}>Dreaming...</Text>
          <Text style={s.sub}>Your dream machine is working its magic</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── REVEAL ────────────────────────────────────────────────────────────────

  if (phase === 'reveal' && dreamUrl) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={reset} hitSlop={12}><Ionicons name="close" size={28} color={colors.textSecondary} /></TouchableOpacity>
          <Text style={s.headerTitle}>Your dream</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={s.revealWrap}>
          <Animated.View style={[s.revealBorder, revealStyle]}>
            <Image source={{ uri: dreamUrl }} style={s.revealImg} contentFit="cover" transition={300} />
          </Animated.View>
          {prompt ? <Text style={s.promptText} numberOfLines={2}>{prompt.slice(0, 120)}</Text> : null}
        </View>
        <View style={s.footer}>
          <TouchableOpacity style={s.cta} onPress={post} activeOpacity={0.7}>
            <Ionicons name="cloud-upload" size={20} color="#FFF" />
            <Text style={s.ctaText}>Post This Dream</Text>
          </TouchableOpacity>
          <View style={s.row}>
            <TouchableOpacity style={s.sec} onPress={() => { setDreamUrl(null); setPhase('preview'); }} activeOpacity={0.7}>
              <Ionicons name="refresh" size={16} color={colors.textSecondary} />
              <Text style={s.secText}>Dream again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sec} onPress={reset} activeOpacity={0.7}>
              <Ionicons name="images" size={16} color={colors.textSecondary} />
              <Text style={s.secText}>New photo</Text>
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
        <ActivityIndicator size="large" color="#FF4500" />
        <Text style={s.title}>Posting your dream...</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  moonIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(139,123,238,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(139,123,238,0.2)', marginBottom: 8 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' },
  sub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, width: '100%' },
  ctaText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  footer: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  previewWrap: { flex: 1, paddingHorizontal: 24, alignItems: 'center', gap: 20 },
  previewImg: { width: PREVIEW_WIDTH, height: PREVIEW_WIDTH * 1.2, borderRadius: 16 },
  hintInput: {
    width: '100%', backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14,
    paddingVertical: 12, color: colors.textPrimary, fontSize: 15,
  },
  errorText: { color: colors.error, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  revealWrap: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
  revealBorder: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  revealImg: { width: PREVIEW_WIDTH, height: Math.min(PREVIEW_WIDTH * 1.75, 400), borderRadius: 20 },
  promptText: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 17 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  sec: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  secText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
