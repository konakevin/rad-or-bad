/**
 * Fusion Screen — genetic dream fusion with blend slider.
 * Merges two Recipe objects using dominant/recessive genetics.
 */

import { useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useFusionStore } from '@/store/fusion';
import { useSparkleBalance, useSpendSparkles } from '@/hooks/useSparkles';
import { showAlert } from '@/components/CustomAlert';
import { Toast } from '@/components/Toast';
import { colors } from '@/constants/theme';
import { fuseRecipes } from '@/lib/geneticMerge';
import { registerRecipe, fetchRecipeById } from '@/lib/recipeRegistry';
import { buildPromptInput, buildRawPrompt, buildHaikuPrompt } from '@/lib/recipeEngine';
import { enhanceWithHaiku, generateFluxDev, persistImage } from '@/lib/dreamApi';
import { postDream, pinToFeed } from '@/lib/dreamPost';
import type { Recipe } from '@/types/recipe';
import { DEFAULT_RECIPE } from '@/types/recipe';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 48;
const FUSE_COST = 3;

type FusionItem = { url: string; prompt: string; mergedRecipe: Recipe };

export default function FusionScreen() {
  const user = useAuthStore((s) => s.user);
  const fusionTarget = useFusionStore((s) => s.target);
  const clearFusion = useFusionStore((s) => s.clear);
  const { data: sparkleBalance = 0 } = useSparkleBalance();
  const { mutateAsync: spendSparkles } = useSpendSparkles();

  const [blend, setBlend] = useState(50);
  const [album, setAlbum] = useState<FusionItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [myRecipe, setMyRecipe] = useState<Recipe | null>(null);
  const [theirRecipe, setTheirRecipe] = useState<Recipe | null>(null);
  const [loaded, setLoaded] = useState(false);
  const albumRef = useRef<FlatList>(null);
  const busy = useRef(false);

  // Load both recipes on mount
  useMemo(() => {
    if (!user || !fusionTarget || loaded) return;
    setLoaded(true);

    // Load my recipe
    supabase.from('user_recipes').select('recipe').eq('user_id', user.id).single()
      .then(({ data }) => setMyRecipe((data?.recipe as Recipe) ?? DEFAULT_RECIPE));

    // Load their recipe from registry, or fall back to their user_recipes
    if (fusionTarget.recipeId) {
      fetchRecipeById(fusionTarget.recipeId)
        .then((r) => setTheirRecipe(r ?? DEFAULT_RECIPE));
    } else {
      supabase.from('user_recipes').select('recipe').eq('user_id', fusionTarget.userId).single()
        .then(({ data }) => setTheirRecipe((data?.recipe as Recipe) ?? DEFAULT_RECIPE));
    }
  }, [user, fusionTarget]);

  const activeFusion = album[activeIndex] ?? null;

  async function handleFuse() {
    if (!myRecipe || !theirRecipe || !user || !fusionTarget || busy.current) return;

    if (sparkleBalance < FUSE_COST) {
      showAlert('Not enough sparkles', `You need ${FUSE_COST}✨ but have ${sparkleBalance}✨`, [
        { text: 'Get Sparkles', onPress: () => router.push('/sparkleStore') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    busy.current = true;
    setGenerating(true);

    try {
      // Spend sparkles first
      await spendSparkles({ amount: FUSE_COST, reason: 'dream_fusion', referenceId: fusionTarget.postId });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Genetic merge
      const merged = fuseRecipes(theirRecipe, myRecipe, blend);
      const input = buildPromptInput(merged);

      // Build prompt via Haiku with epigenetic context
      const haikuBrief = buildHaikuPrompt(input) +
        `\n\nEPIGENETIC CONTEXT: This dream is a genetic fusion of two Dream Bots. ` +
        `The source dream that inspired this fusion was: "${fusionTarget.prompt}". ` +
        `Use this as creative context — the fusion should feel like it could be the child ` +
        `of that dream and the other parent's style. Don't copy it, evolve it.`;

      const prompt = await enhanceWithHaiku(haikuBrief, buildRawPrompt(input));
      const tempUrl = await generateFluxDev(prompt);
      const imageUrl = await persistImage(tempUrl, user.id);

      setAlbum((prev) => {
        const newIndex = prev.length;
        setActiveIndex(newIndex);
        setTimeout(() => albumRef.current?.scrollToIndex({ index: newIndex, animated: true }), 100);
        return [...prev, { url: imageUrl, prompt, mergedRecipe: merged }];
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'Not enough sparkles') {
        showAlert('Not enough sparkles', `You need ${FUSE_COST}✨ but have ${sparkleBalance}✨`);
      } else {
        Toast.show('Fusion failed — try again', 'close-circle');
      }
    } finally {
      setGenerating(false);
      busy.current = false;
    }
  }

  async function handlePost() {
    const current = album[activeIndex];
    if (!current || !user || posting) return;
    setPosting(true);

    try {
      const recipeId = await registerRecipe(user.id, current.mergedRecipe);
      const uploadId = await postDream({
        userId: user.id,
        imageUrl: current.url,
        prompt: current.prompt,
        recipeId,
      });
      pinToFeed({
        id: uploadId,
        userId: user.id,
        imageUrl: current.url,
        username: user.user_metadata?.username ?? '',
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (album.length <= 1) {
        clearFusion();
        router.replace('/(tabs)');
      } else {
        const postedIdx = activeIndex;
        setAlbum((prev) => prev.filter((_, i) => i !== postedIdx));
        setActiveIndex(Math.min(postedIdx, album.length - 2));
        setPosting(false);
      }
    } catch (err) {
      Toast.show('Failed to post', 'close-circle');
      setPosting(false);
    }
  }

  function handleClose() {
    clearFusion();
    router.back();
  }

  if (!fusionTarget) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.emptyText}>No fusion target</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ITEM_WIDTH = PREVIEW_WIDTH;
  const ITEM_SPACING = 16;
  const SNAP_WIDTH = ITEM_WIDTH + ITEM_SPACING;

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={28} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Dream Fusion</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Parents */}
      <View style={s.parentsRow}>
        <View style={s.parentCard}>
          <Image source={{ uri: fusionTarget.imageUrl }} style={s.parentThumb} contentFit="cover" />
          <Text style={s.parentLabel} numberOfLines={1}>@{fusionTarget.username}</Text>
        </View>
        <Ionicons name="git-merge" size={24} color={colors.accent} />
        <View style={s.parentCard}>
          <View style={s.parentYou}>
            <Ionicons name="sparkles" size={20} color={colors.accent} />
          </View>
          <Text style={s.parentLabel}>Your DNA</Text>
        </View>
      </View>

      {/* Blend slider */}
      <View style={s.sliderWrap}>
        <Text style={s.sliderLabel}>Their DNA</Text>
        <View style={s.sliderInner}>
          <Slider
            style={s.slider}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={blend}
            onValueChange={setBlend}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
          <Text style={s.sliderValue}>{100 - blend}/{blend}</Text>
        </View>
        <Text style={s.sliderLabel}>Your DNA</Text>
      </View>

      {/* Results album or fuse button */}
      <View style={s.resultArea}>
        {album.length > 0 ? (
          <>
            <FlatList
              ref={albumRef}
              data={album}
              keyExtractor={(_, i) => `fusion-${i}`}
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
                const clamped = Math.max(0, Math.min(idx, album.length - 1));
                if (clamped !== activeIndex) setActiveIndex(clamped);
              }}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <View style={{ width: ITEM_WIDTH, marginRight: ITEM_SPACING }}>
                  <Image source={{ uri: item.url }} style={s.resultImg} contentFit="cover" />
                  {generating && (
                    <View style={s.generatingOverlay}>
                      <ActivityIndicator size="large" color={colors.accent} />
                      <Text style={s.generatingText}>Fusing...</Text>
                    </View>
                  )}
                </View>
              )}
            />
            {album.length > 1 && (
              <View style={s.dotRow}>
                {album.map((_, i) => (
                  <View key={i} style={[s.dot, i === activeIndex && s.dotActive]} />
                ))}
              </View>
            )}
          </>
        ) : generating ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={s.generatingText}>Fusing DNA...</Text>
          </View>
        ) : (
          <View style={s.center}>
            <Ionicons name="git-merge" size={48} color={colors.border} />
            <Text style={s.emptyText}>Adjust the slider and fuse</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={s.footer}>
        {album.length > 0 && (
          <TouchableOpacity style={s.cta} onPress={handlePost} activeOpacity={0.7} disabled={posting || generating}>
            {posting
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="cloud-upload" size={20} color="#FFF" />
            }
            <Text style={s.ctaText}>{posting ? 'Posting...' : 'Post This Fusion'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.fuseButton, generating && s.fuseButtonDisabled]}
          onPress={handleFuse}
          activeOpacity={0.7}
          disabled={generating || !myRecipe || !theirRecipe}
        >
          {generating
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Ionicons name="git-merge" size={18} color={colors.accent} />
          }
          <Text style={s.fuseButtonText}>
            {album.length > 0 ? 'Fuse Again' : `Fuse (${FUSE_COST}✨)`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },

  // Parents
  parentsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingVertical: 16, paddingHorizontal: 20,
  },
  parentCard: { alignItems: 'center', gap: 6 },
  parentThumb: { width: 64, height: 80, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  parentYou: {
    width: 64, height: 80, borderRadius: 12, backgroundColor: colors.accentBg,
    borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  parentLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', maxWidth: 80, textAlign: 'center' },

  // Slider
  sliderWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  sliderInner: { flex: 1, alignItems: 'center' },
  slider: { width: '100%', height: 40 },
  sliderValue: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: -4 },
  sliderLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', width: 44, textAlign: 'center' },

  // Results
  resultArea: { flex: 1, justifyContent: 'center' },
  resultImg: { width: PREVIEW_WIDTH, height: Math.min(PREVIEW_WIDTH * 1.5, 380), borderRadius: 20 },
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 20,
  },
  generatingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  dotRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { backgroundColor: '#FFFFFF' },

  // Footer
  footer: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
  },
  ctaText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  fuseButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, paddingVertical: 14,
  },
  fuseButtonDisabled: { opacity: 0.5 },
  fuseButtonText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
});
