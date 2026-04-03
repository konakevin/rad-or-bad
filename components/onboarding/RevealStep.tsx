import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { useAuthStore } from '@/store/auth';
import { useFeedStore } from '@/store/feed';
import { supabase } from '@/lib/supabase';
import { generateFromRecipe } from '@/lib/dreamApi';
import { colors } from '@/constants/theme';
import { MASCOT_URLS } from '@/constants/mascots';
import { Toast } from '@/components/Toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Balanced resolution: sharper than 512, cheaper than 768
const GEN_WIDTH = 640;
const GEN_HEIGHT = Math.round(((SCREEN_HEIGHT / SCREEN_WIDTH) * GEN_WIDTH) / 8) * 8; // round to nearest 8
const IMAGE_WIDTH = SCREEN_WIDTH - 48;
const IMAGE_HEIGHT = Math.min(IMAGE_WIDTH * (SCREEN_HEIGHT / SCREEN_WIDTH), 380);
const MAX_DREAMS = 5;

type Phase = 'idle' | 'generating' | 'reveal' | 'creating';

interface Dream {
  url: string;
  prompt: string;
}

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function RevealStep({ onBack }: Props) {
  const recipe = useOnboardingStore((s) => s.recipe);
  const reset = useOnboardingStore((s) => s.reset);
  const user = useAuthStore((s) => s.user);
  const setPinnedPost = useFeedStore((s) => s.setPinnedPost);

  const [phase, setPhase] = useState<Phase>('idle');
  const [isZoomed, setIsZoomed] = useState(false);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const generating = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const activeDream = dreams[activeIndex] ?? null;
  const dreamsRemaining = MAX_DREAMS - dreams.length;
  const canDreamAgain = dreamsRemaining > 0;

  // Pinch to zoom on preview
  const zoomScale = useSharedValue(1);
  const zoomTransX = useSharedValue(0);
  const zoomTransY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: zoomTransX.value },
      { translateY: zoomTransY.value },
      { scale: zoomScale.value },
    ],
  }));

  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      runOnJS(setIsZoomed)(true);
      focalX.value = e.focalX - IMAGE_WIDTH / 2;
      focalY.value = e.focalY - IMAGE_HEIGHT / 2;
      startFocalX.value = e.focalX;
      startFocalY.value = e.focalY;
    })
    .onUpdate((e) => {
      const sc = Math.max(1, Math.min(5, e.scale));
      zoomScale.value = sc;
      const panX = e.focalX - startFocalX.value;
      const panY = e.focalY - startFocalY.value;
      zoomTransX.value = focalX.value * (1 - sc) + panX;
      zoomTransY.value = focalY.value * (1 - sc) + panY;
    })
    .onEnd(() => {
      zoomScale.value = withTiming(1, { duration: 200 });
      zoomTransX.value = withTiming(0, { duration: 200 });
      zoomTransY.value = withTiming(0, { duration: 200 });
      runOnJS(setIsZoomed)(false);
    });

  async function generateImage() {
    if (generating.current) return;
    generating.current = true;
    setPhase('generating');
    setError(null);

    try {
      // Server builds prompt from recipe, generates via Flux (skip Haiku for speed)
      const result = await generateFromRecipe(recipe, { skipEnhance: true });
      const url = result.image_url;
      const prompt = result.prompt_used;
      if (__DEV__) console.log('[Reveal] Got URL:', url?.slice(0, 80));

      setDreams((prev) => {
        const next = [...prev, { url, prompt }];
        const newIdx = next.length - 1;
        setActiveIndex(newIdx);
        setTimeout(() => {
          scrollRef.current?.scrollTo({ x: newIdx * IMAGE_WIDTH, animated: true });
        }, 100);
        return next;
      });
      setPhase('reveal');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      if (__DEV__) console.warn('[Reveal] Generation failed:', err);
      setError('Image generation failed. Tap to try again.');
      setPhase('reveal');
    } finally {
      generating.current = false;
    }
  }

  function handleDreamAgain() {
    if (!canDreamAgain) return;
    generateImage();
  }

  const handleScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / IMAGE_WIDTH);
      if (idx >= 0 && idx < dreams.length && idx !== activeIndex) {
        setActiveIndex(idx);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [dreams.length, activeIndex]
  );

  async function handleCreateBot() {
    if (!user || !activeDream) return;
    setPhase('creating');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      await supabase.from('user_recipes').upsert(
        {
          user_id: user.id,
          recipe: recipe as unknown as import('@/types/database').Json,
          onboarding_completed: true,
          ai_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      await supabase.from('users').update({ has_ai_recipe: true }).eq('id', user.id);

      // Match dream archetypes: interest×mood matching + vibe bundle injection
      try {
        const userInterests = new Set<string>(recipe.interests ?? []);
        const userMoods = new Set<string>(recipe.selected_moods ?? []);
        const userVibes: string[] = (recipe as unknown as Record<string, unknown>).selected_vibes as string[] ?? [];

        // Fetch all active archetypes (table not in generated types, cast needed)
        const { data: archs } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: unknown) => Promise<{ data: { id: string; key: string; trigger_interests: string[]; trigger_moods: string[] }[] | null }> } } }).from('dream_archetypes')
          .select('id, key, trigger_interests, trigger_moods')
          .eq('is_active', true);

        if (archs) {
          const matchedIds = new Set<string>();

          // 1. Interest × mood matching (original algorithm)
          for (const a of archs) {
            if (
              a.trigger_interests.some((i) => userInterests.has(i as string)) &&
              a.trigger_moods.some((m) => userMoods.has(m as string))
            ) {
              matchedIds.add(a.id);
            }
          }

          // 2. Vibe bundle injection
          const { VIBE_ARCHETYPE_MAP } = await import('@/constants/onboarding');
          for (const vibe of userVibes) {
            const patterns = VIBE_ARCHETYPE_MAP[vibe] ?? [];
            for (const a of archs) {
              for (const pattern of patterns) {
                if (pattern.endsWith('_') ? a.key.startsWith(pattern) : a.key === pattern) {
                  matchedIds.add(a.id);
                  break;
                }
              }
            }
          }

          if (matchedIds.size > 0) {
            // user_archetypes not in generated types either
            const ua = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<unknown> }; insert: (rows: unknown[]) => Promise<unknown> } };
            await ua.from('user_archetypes').delete().eq('user_id', user.id);
            await ua.from('user_archetypes').insert(
              [...matchedIds].map((id) => ({ user_id: user.id, archetype_id: id }))
            );
          }
        }
      } catch {
        // Non-critical — dreams still work without archetypes
      }

      const { data: insertedRow, error: uploadError } = await supabase
        .from('uploads')
        .insert({
          user_id: user.id,
          categories: ['fantasy'],
          image_url: activeDream.url,
          media_type: 'image',
          caption: null,
          is_ai_generated: true,
          ai_prompt: activeDream.prompt || null,
          is_approved: true,
        })
        .select('id')
        .single();

      if (uploadError && __DEV__) {
        console.warn('[Reveal] Upload error:', uploadError);
      }

      // Pin this dream so the home feed shows it as the first card
      setPinnedPost({
        id: insertedRow?.id ?? `temp-${Date.now()}`,
        user_id: user.id,
        image_url: activeDream.url,
        caption: null,
        username: user.user_metadata?.username ?? '',
        avatar_url: user.user_metadata?.avatar_url ?? null,
        is_ai_generated: true,
        created_at: new Date().toISOString(),
        comment_count: 0,
      });

      reset();
      Toast.show('Your Dream Bot is alive!', 'sparkles');
      router.replace('/(tabs)');
    } catch (err) {
      if (__DEV__) console.warn('[Reveal] Create error:', err);
      setPhase('reveal');
      Toast.show('Something went wrong', 'close-circle');
    }
  }

  // ── Idle state ──
  if (phase === 'idle') {
    return (
      <View style={s.root}>
        <View style={s.centeredContent}>
          <Image source={{ uri: MASCOT_URLS[1] }} style={s.idleMascot} contentFit="cover" />
          <Text style={s.bigTitle}>Your Dream Bot is ready</Text>
          <Text style={s.centeredSub}>Tap below to see what it dreams up for you</Text>
          <TouchableOpacity
            style={[s.createButton, { alignSelf: 'stretch', marginTop: 8 }]}
            onPress={async () => {
              // Save the recipe before generating the first dream
              if (user) {
                try {
                  await supabase.from('user_recipes').upsert(
                    {
                      user_id: user.id,
                      recipe: recipe as unknown as import('@/types/database').Json,
                      onboarding_completed: true,
                      ai_enabled: true,
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id' }
                  );
                  await supabase.from('users').update({ has_ai_recipe: true }).eq('id', user.id);
                } catch {
                  // Non-critical — will be saved on post
                }
              }
              generateImage();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            <Text style={s.createButtonText}>Generate My First Dream</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── First generation loading ──
  if (phase === 'generating' && dreams.length === 0) {
    return (
      <View style={s.root}>
        <View style={s.centeredContent}>
          <Image source={{ uri: MASCOT_URLS[2] }} style={s.idleMascot} contentFit="cover" />
          <Text style={s.bigTitle}>Dreaming...</Text>
          <Text style={s.centeredSub}>Your Dream Bot is creating a dream for you</Text>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      </View>
    );
  }

  // ── Reveal state ──
  return (
    <View style={s.root}>
      <View style={s.content}>
        {error && dreams.length === 0 ? (
          <TouchableOpacity style={s.errorContainer} onPress={() => generateImage()}>
            <Ionicons name="refresh" size={32} color={colors.textSecondary} />
            <Text style={s.errorText}>{error}</Text>
          </TouchableOpacity>
        ) : activeDream ? (
          <>
            <Text style={s.heading}>Pick your first dream</Text>
            <Text style={s.subheading}>
              {dreams.length === 1 && canDreamAgain
                ? 'This is one of many possible dreams your bot can create. Tap "Dream Again" to see more, or post this one now.'
                : canDreamAgain
                  ? `Swipe to browse your dreams. When you find one you love, post it. ${dreamsRemaining} dream${dreamsRemaining === 1 ? '' : 's'} left to try.`
                  : 'Swipe to browse your dreams and pick your favorite to post.'}
            </Text>

            {/* Swipeable image preview with pinch to zoom */}
            <GestureDetector gesture={pinchGesture}>
              <Animated.View style={[s.imageWrap, zoomStyle]}>
                <ScrollView
                  ref={scrollRef}
                  horizontal
                  pagingEnabled
                  scrollEnabled={!isZoomed}
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleScrollEnd}
                  scrollEventThrottle={16}
                  style={{ width: IMAGE_WIDTH }}
                  contentContainerStyle={{ alignItems: 'center' }}
                >
                  {dreams.map((dream, i) => (
                    <View key={i} style={s.imageSlide}>
                      <ActivityIndicator style={s.imageLoader} size="small" color={colors.accent} />
                      <Image
                        source={{ uri: dream.url }}
                        style={s.image}
                        contentFit="cover"
                        transition={200}
                      />
                    </View>
                  ))}
                </ScrollView>

                {/* Generating overlay */}
                {phase === 'generating' && (
                  <View style={s.generatingOverlay}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={s.generatingText}>Dreaming...</Text>
                  </View>
                )}
              </Animated.View>
            </GestureDetector>

            {/* Dot indicators */}
            {dreams.length > 1 && (
              <View style={s.dots}>
                {dreams.map((_, i) => (
                  <View key={i} style={[s.dot, i === activeIndex && s.dotActive]} />
                ))}
              </View>
            )}
          </>
        ) : null}
      </View>

      {dreams.length > 0 && (
        <View style={s.footer}>
          <TouchableOpacity
            style={s.createButton}
            onPress={handleCreateBot}
            disabled={phase === 'creating' || phase === 'generating'}
            activeOpacity={0.7}
          >
            {phase === 'creating' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                <Text style={s.createButtonText}>Post Your First Dream</Text>
              </>
            )}
          </TouchableOpacity>

          {canDreamAgain && (
            <TouchableOpacity
              style={s.dreamAgainButton}
              onPress={handleDreamAgain}
              disabled={phase === 'creating' || phase === 'generating'}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color={colors.textPrimary} />
              <Text style={s.dreamAgainButtonText}>Dream Again ({dreamsRemaining})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  idleMascot: {
    width: 140,
    height: 140,
    borderRadius: 28,
    marginBottom: 8,
  },
  bigTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  centeredSub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },

  content: { flex: 1, paddingTop: 4, alignItems: 'center' },
  heading: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
    lineHeight: 19,
  },

  imageWrap: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageSlide: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    zIndex: 1,
  },
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  generatingText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 20,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },

  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: colors.textSecondary, fontSize: 15 },

  footer: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 18,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  dreamAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 16,
  },
  dreamAgainButtonText: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
});
