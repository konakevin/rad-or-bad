/**
 * useDreamGeneration — encapsulates all dream generation logic.
 *
 * Handles 6 paths: photo+styleRef, photo+hint, photo+vibeProfile,
 * text+customPrompt, text+styleRef, text+vibeProfile/recipe.
 * Also handles twin dreams, posting, sparkle spending, and profile loading.
 */

import { useRef, useCallback } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSharedValue, withTiming, withSequence } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { FusionTarget } from '@/store/fusion';
import { useSparkleBalance, useSpendSparkles } from '@/hooks/useSparkles';
import { showAlert } from '@/components/CustomAlert';
import { Toast } from '@/components/Toast';
import { DEFAULT_RECIPE } from '@/types/recipe';
import type { Recipe } from '@/types/recipe';
import type { VibeProfile, PromptMode } from '@/types/vibeProfile';
import { isVibeProfile } from '@/lib/migrateRecipe';
import { buildPromptInput } from '@/lib/recipeEngine';
import { moderateText } from '@/lib/moderation';
import { registerRecipe } from '@/lib/recipeRegistry';
import {
  generateDream,
  generateFromVibeProfile,
  generateFromRecipe,
  generateFromPhoto,
  generateTwin,
  persistImage,
} from '@/lib/dreamApi';
import { postDream, pinToFeed } from '@/lib/dreamPost';
import type { DreamAlbumItem, ControlState } from '@/hooks/useDreamAlbum';

type Phase = 'pick' | 'preview' | 'dreaming' | 'reveal' | 'posting';

interface GenerationDeps {
  /** Current UI phase */
  phase: Phase;
  setPhase: (p: Phase) => void;
  /** Dream mode (local state, consumed from fusion store on focus) */
  isStyleRef: boolean;
  isTwinMode: boolean;
  fusionTarget: import('@/store/fusion').FusionTarget | null;
  /** Photo state */
  photoBase64: string | null;
  photoUri: string | null;
  photoFromUpload: React.MutableRefObject<boolean>;
  userHint: string;
  /** Album state */
  albumLength: number;
  selectedMode: PromptMode;
  customPrompt: string;
  makeControlState: () => ControlState;
  addDream: (item: DreamAlbumItem) => void;
  /** Loading state */
  dreaming: boolean;
  setDreaming: (v: boolean) => void;
  posting: boolean;
  setPosting: (v: boolean) => void;
  setError: (e: string | null) => void;
}

interface GenerateResult {
  image_url: string;
  prompt_used: string;
  dream_mode?: string;
  archetype?: string;
  ai_concept?: Record<string, unknown> | null;
}

export function useDreamGeneration(deps: GenerationDeps) {
  const {
    phase,
    setPhase,
    isStyleRef,
    isTwinMode,
    fusionTarget,
    photoBase64,
    photoUri,
    photoFromUpload,
    userHint,
    albumLength,
    selectedMode,
    customPrompt,
    makeControlState,
    addDream,
    dreaming,
    setDreaming,
    posting,
    setPosting,
    setError,
  } = deps;

  const user = useAuthStore((s) => s.user);
  const { data: sparkleBalance = 0 } = useSparkleBalance();
  const { mutateAsync: spendSparkles } = useSpendSparkles();

  const busy = useRef(false);

  // Reveal animation values
  const imgScale = useSharedValue(0.85);
  const imgOpacity = useSharedValue(0);

  // ── Profile loading ───────────────────────────────────────────────────

  const loadProfile = useCallback(async (): Promise<{
    recipe: Recipe | null;
    vibeProfile: VibeProfile | null;
  }> => {
    if (!user) return { recipe: DEFAULT_RECIPE, vibeProfile: null };
    const { data } = await supabase
      .from('user_recipes')
      .select('recipe')
      .eq('user_id', user.id)
      .single();
    const raw = data?.recipe as unknown;
    if (isVibeProfile(raw)) return { recipe: null, vibeProfile: raw };
    return { recipe: (raw as Recipe) ?? DEFAULT_RECIPE, vibeProfile: null };
  }, [user]);

  // ── Sparkle spending ──────────────────────────────────────────────────

  const trySpendSparkle = useCallback(
    async (reason: string): Promise<boolean> => {
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
        await spendSparkles({ amount: 1, reason });
        return true;
      } catch {
        showAlert('Not enough sparkles', 'You need 1 sparkle to dream.', [
          { text: 'Get Sparkles', onPress: () => router.push('/sparkleStore') },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return false;
      }
    },
    [sparkleBalance, spendSparkles]
  );

  // ── Shared pre/post generation helpers ────────────────────────────────

  function startGeneration() {
    if (albumLength > 0) {
      setDreaming(true);
    } else {
      imgOpacity.value = 0;
      imgScale.value = 0.85;
      setPhase('dreaming');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function finishGeneration(result: GenerateResult) {
    addDream({
      url: result.image_url,
      prompt: result.prompt_used,
      fromWish: null,
      fromUpload: photoFromUpload.current,
      dreamMode: result.dream_mode,
      archetype: result.archetype,
      aiConcept: result.ai_concept ?? null,
      controlState: makeControlState(),
    });
    setDreaming(false);
    setPhase('reveal');
    imgOpacity.value = withTiming(1, { duration: 600 });
    imgScale.value = withSequence(
      withTiming(1.05, { duration: 400 }),
      withTiming(1, { duration: 200 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleError(err: unknown, label: string, fallbackPhase: Phase) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (__DEV__) console.error(`[${label}] ERROR:`, msg, err);

    // NSFW content flagged by safety filters — refund the sparkle
    if (msg.includes('NSFW_CONTENT') && user) {
      try {
        await supabase.rpc('grant_sparkles', {
          p_user_id: user.id,
          p_amount: 1,
          p_reason: 'nsfw_refund',
        });
        if (__DEV__) console.log(`[${label}] Sparkle refunded for NSFW`);
      } catch {
        if (__DEV__) console.warn(`[${label}] Failed to refund sparkle`);
      }
      Toast.show(
        'This dream was flagged by our safety filters. Your sparkle has been refunded.',
        'shield-checkmark'
      );
    } else {
      Toast.show(`Dream error: ${msg}`, 'close-circle');
    }

    setError(msg.includes('NSFW_CONTENT') ? 'Content flagged by safety filters' : msg);
    setDreaming(false);
    setPhase(albumLength > 0 ? 'reveal' : fallbackPhase);
  }

  // ── Photo dream ───────────────────────────────────────────────────────

  const dream = useCallback(async () => {
    if (!photoUri || !user) return;
    if (busy.current) return;
    if (!(await trySpendSparkle('dream_photo'))) return;
    busy.current = true;
    setError(null);
    startGeneration();

    try {
      if (!photoBase64) throw new Error('No photo data');
      const refUrl = `data:image/jpeg;base64,${photoBase64}`;

      let result: GenerateResult;

      if (isStyleRef) {
        // Dream Like This + Photo: apply the reference art style to the user's photo
        const refPrompt = fusionTarget?.prompt;
        if (!refPrompt) throw new Error('No style reference prompt available for this dream');
        if (__DEV__) {
          console.log('[PhotoDream] STYLE REF — full reference prompt:', refPrompt.slice(0, 150));
        }
        const stylePrompt = userHint.trim()
          ? `Apply this exact art style to the photo: ${refPrompt.slice(0, 250)}. Also: ${userHint.trim()}. Keep the photo's subject unchanged.`
          : `Apply this exact art style and visual treatment to the photo, keeping the subject unchanged: ${refPrompt.slice(0, 250)}`;
        result = await generateDream({
          mode: 'flux-kontext',
          prompt: stylePrompt,
          input_image: refUrl,
        });
      } else if (userHint.trim()) {
        const modResult = await moderateText(userHint.trim());
        if (!modResult.passed)
          throw new Error(modResult.reason ?? 'Prompt contains inappropriate content');
        result = await generateDream({
          mode: 'flux-kontext',
          prompt: userHint.trim(),
          input_image: refUrl,
        });
      } else {
        const { recipe: loadedRecipe, vibeProfile } = await loadProfile();
        if (vibeProfile) {
          result = await generateDream({
            mode: 'flux-kontext',
            vibe_profile: vibeProfile,
            prompt_mode: selectedMode,
            input_image: refUrl,
          });
        } else {
          const recipe = loadedRecipe ?? DEFAULT_RECIPE;
          const input = buildPromptInput(recipe);
          const style = [input.mood, input.lighting, input.colorKeywords]
            .filter(Boolean)
            .join(', ');
          const fallback = `Reimagine this image as ${input.medium}. Transform into a fantastical dream scene, ${style}. No filters, full creative reimagining.`;
          result = await generateDream({
            mode: 'flux-kontext',
            haiku_brief: `Reimagine this photo as ${input.medium}. Create a full creative reimagining — not a filter. ${style}. Output ONLY the prompt, max 40 words.`,
            haiku_fallback: fallback,
            input_image: refUrl,
          });
        }
      }

      finishGeneration(result);
    } catch (err: unknown) {
      handleError(err, 'PhotoDream', 'preview');
    } finally {
      busy.current = false;
    }
  }, [
    photoUri,
    photoBase64,
    user,
    isStyleRef,
    fusionTarget,
    userHint,
    selectedMode,
    trySpendSparkle,
    loadProfile,
    albumLength,
    makeControlState,
    addDream,
  ]);

  // ── Text-only dream ───────────────────────────────────────────────────

  const justDream = useCallback(async () => {
    if (__DEV__) console.log('[JustDream] START, user:', !!user, 'busy:', busy.current);
    if (!user) {
      Toast.show('Not logged in', 'close-circle');
      return;
    }
    if (busy.current) {
      Toast.show('Already dreaming...', 'hourglass');
      return;
    }
    if (!(await trySpendSparkle('dream'))) return;
    busy.current = true;
    setError(null);
    if (__DEV__) console.log('[JustDream] Setting phase to dreaming');
    startGeneration();

    try {
      let result: GenerateResult;

      if (customPrompt.trim()) {
        if (__DEV__) console.log('[JustDream] Custom prompt:', customPrompt.trim().slice(0, 60));
        const modResult = await moderateText(customPrompt.trim());
        if (!modResult.passed)
          throw new Error(modResult.reason ?? 'Prompt contains inappropriate content');
        result = await generateDream({ mode: 'flux-dev', prompt: customPrompt.trim() });
      } else if (isStyleRef) {
        // Dream Like This: replay the reference prompt directly to Flux.
        // No two-pass engine, no hints — just the exact prompt that made the original.
        const refPrompt = fusionTarget?.prompt;
        if (!refPrompt) throw new Error('No style reference prompt available for this dream');
        if (__DEV__) {
          console.log('[JustDream] STYLE REF — replaying reference prompt directly');
          console.log('[JustDream] Prompt:', refPrompt.slice(0, 120));
        }
        result = await generateDream({ mode: 'flux-dev', prompt: refPrompt });
      } else {
        if (__DEV__) console.log('[JustDream] Loading profile...');
        const { recipe, vibeProfile } = await loadProfile();
        if (__DEV__) console.log('[JustDream] Profile loaded');
        result = vibeProfile
          ? await generateFromVibeProfile(vibeProfile, { promptMode: selectedMode })
          : await generateFromRecipe(recipe!);
      }

      if (__DEV__) console.log('[JustDream] Image generated:', result.image_url.slice(0, 60));
      finishGeneration(result);
    } catch (err: unknown) {
      handleError(err, 'JustDream', 'pick');
    } finally {
      if (__DEV__) console.log('[JustDream] DONE, resetting busy');
      busy.current = false;
    }
  }, [
    user,
    customPrompt,
    isStyleRef,
    fusionTarget,
    selectedMode,
    trySpendSparkle,
    loadProfile,
    albumLength,
    makeControlState,
    addDream,
  ]);

  // ── Twin dream ────────────────────────────────────────────────────────

  const twinDream = useCallback(async () => {
    if (!user || !fusionTarget) return;
    if (busy.current) {
      Toast.show('Already dreaming...', 'hourglass');
      return;
    }
    if (!(await trySpendSparkle('dream_twin'))) return;
    busy.current = true;
    setError(null);
    startGeneration();

    try {
      const p = fusionTarget.prompt;
      if (__DEV__) console.log('[Twin] Generating from prompt:', p.slice(0, 80));
      const result = await generateTwin(p);
      finishGeneration({ ...result, prompt_used: p });
    } catch (err: unknown) {
      handleError(err, 'Twin', 'pick');
    } finally {
      busy.current = false;
    }
  }, [user, fusionTarget, trySpendSparkle, albumLength, makeControlState, addDream]);

  // ── Post dream ────────────────────────────────────────────────────────

  const post = useCallback(
    async (currentDream: DreamAlbumItem | null, currentIndex: number, totalCount: number) => {
      if (__DEV__) {
        console.log('[Post] START — dream:', !!currentDream, 'user:', !!user);
      }
      if (!currentDream || !user || posting) return;

      const multiImage = totalCount > 1;
      if (!multiImage) setPhase('posting');
      else setPosting(true);

      const postUrl = currentDream.url;
      const postPrompt = currentDream.prompt;
      const postWish = currentDream.fromWish;

      try {
        if (__DEV__) console.log('[Post] Persisting image...');
        const imageUrl = await persistImage(postUrl, user.id);

        let recipeId: string | null = null;
        try {
          const { recipe: postRecipe } = await loadProfile();
          if (postRecipe) recipeId = await registerRecipe(user.id, postRecipe);
        } catch (recipeErr) {
          if (__DEV__) console.warn('[Post] Recipe registration failed:', recipeErr);
        }

        const uploadId = await postDream({
          userId: user.id,
          imageUrl,
          prompt: postPrompt,
          recipeId,
          fromWish: postWish,
          twinOf: isTwinMode ? fusionTarget?.postId : null,
          fuseOf: isStyleRef ? fusionTarget?.postId : null,
          aiConcept: currentDream.aiConcept ?? null,
        });

        // Notify original post owner when someone fuses their dream
        if (isStyleRef && fusionTarget && fusionTarget.userId !== user.id) {
          supabase.from('notifications').insert({
            recipient_id: fusionTarget.userId,
            actor_id: user.id,
            type: 'post_fuse',
            upload_id: fusionTarget.postId,
            body: null,
          });
        }
        if (__DEV__) console.log('[Post] Upload created:', uploadId);

        pinToFeed({
          id: uploadId,
          userId: user.id,
          imageUrl,
          username: user.user_metadata?.username ?? '',
          avatarUrl: user.user_metadata?.avatar_url ?? null,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return { success: true, isLastDream: totalCount <= 1 };
      } catch (err) {
        if (__DEV__) console.warn('[Post] Error:', err);
        Toast.show('Failed to post dream', 'close-circle');
        setPosting(false);
        setPhase('reveal');
        return { success: false, isLastDream: false };
      }
    },
    [user, posting, isStyleRef, isTwinMode, fusionTarget, loadProfile]
  );

  const resetBusy = useCallback(() => {
    busy.current = false;
  }, []);

  return {
    // State
    resetBusy,
    sparkleBalance,
    isStyleRef,
    isTwinMode,
    fusionTarget,
    // Animation
    imgScale,
    imgOpacity,
    // Actions
    dream,
    justDream,
    twinDream,
    post,
    loadProfile,
  };
}
