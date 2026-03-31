import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { useOnboardingStore } from '@/store/onboarding';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { buildPromptInput, buildRawPrompt } from '@/lib/recipeEngine';
import { colors } from '@/constants/theme';
import { OnboardingHeader } from '@/components/OnboardingHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_WIDTH = SCREEN_WIDTH - 48;
const IMAGE_HEIGHT = IMAGE_WIDTH * (1344 / 768);

type Phase = 'generating' | 'reveal' | 'saving';

export default function RevealScreen() {
  const recipe = useOnboardingStore((s) => s.recipe);
  const reset = useOnboardingStore((s) => s.reset);
  const user = useAuthStore((s) => s.user);

  const [phase, setPhase] = useState<Phase>('generating');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [promptUsed, setPromptUsed] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const generating = useRef(false);

  const imageScale = useSharedValue(0.8);
  const imageOpacity = useSharedValue(0);

  const imageRevealStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ scale: imageScale.value }],
  }));

  useEffect(() => {
    generateImage();
  }, []);

  async function generateImage() {
    if (generating.current) return;
    generating.current = true;
    setPhase('generating');
    setError(null);
    setImageUrl(null);

    try {
      // Build prompt from recipe — every attribute reaches this prompt
      const input = buildPromptInput(recipe);
      const prompt = buildRawPrompt(input);
      console.log('[Reveal] Prompt:', prompt);
      setPromptUsed(prompt);

      // Generate via Flux
      await generateFluxImage(prompt);
    } catch (err) {
      console.warn('[Reveal] Generation failed:', err);
      setError('Image generation failed. Tap to try again.');
      setPhase('reveal');
    } finally {
      generating.current = false;
    }
  }

  async function generateFluxImage(prompt: string) {
    // TODO: move to edge function for production — hardcoded for dev testing
    const falKey = '66ced4d1-b410-4381-8c0e-f59c8ce7193b:b5e709a879187f3dc73fddb842de8dcf';
    console.log('[Reveal] Generating with Flux...');

    // Step 1: Submit to queue
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${falKey}`,
      },
      body: JSON.stringify({
        prompt,
        image_size: { width: 768, height: 1344 },
        num_images: 1,
        output_format: 'jpeg',
        safety_tolerance: '2',
      }),
    });

    if (!submitResponse.ok) {
      const errBody = await submitResponse.text();
      console.warn('[Reveal] Flux submit error:', submitResponse.status, errBody);
      throw new Error(`Flux submit error: ${submitResponse.status}`);
    }

    const submitData = await submitResponse.json();
    const requestId = submitData.request_id;
    console.log('[Reveal] Flux request queued:', requestId);

    // Step 2: Poll for result using response_url
    const responseUrl = submitData.response_url;
    const statusUrl = submitData.status_url;
    console.log('[Reveal] Polling status:', statusUrl);

    let attempts = 0;
    while (attempts < 60) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

      try {
        const statusResponse = await fetch(statusUrl, {
          headers: { 'Authorization': `Key ${falKey}` },
        });
        const statusText = await statusResponse.text();
        console.log('[Reveal] Poll attempt', attempts, 'raw:', statusText.slice(0, 100));

        let statusData;
        try { statusData = JSON.parse(statusText); } catch { continue; }

        if (statusData.status === 'COMPLETED') {
          // Fetch the actual result
          const resultResponse = await fetch(responseUrl, {
            headers: { 'Authorization': `Key ${falKey}` },
          });
          const resultData = await resultResponse.json();
          const url = resultData.images?.[0]?.url;
          if (!url) throw new Error('No image URL in result');

          setImageUrl(url);
          setPhase('reveal');
          imageOpacity.value = withTiming(1, { duration: 600 });
          imageScale.value = withSequence(
            withTiming(1.05, { duration: 400 }),
            withTiming(1, { duration: 200 }),
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }

        if (statusData.status === 'FAILED') {
          throw new Error('Flux generation failed on server');
        }
      } catch (pollErr) {
        console.log('[Reveal] Poll error, retrying...', pollErr);
      }
    }
    throw new Error('Flux generation timed out');
  }

  async function handleLoveIt() {
    if (!user) return;
    setPhase('saving');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save recipe
    await supabase.from('user_recipes').upsert({
      user_id: user.id,
      recipe,
      onboarding_completed: true,
      ai_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    await supabase.from('users').update({ has_ai_recipe: true }).eq('id', user.id);

    reset();
    router.replace('/(tabs)');
  }

  function handleTryAgain() {
    imageOpacity.value = 0;
    imageScale.value = 0.8;
    generateImage();
  }

  function handleAdjust() {
    router.navigate('/(onboarding)/styleSpectrum');
  }

  if (phase === 'generating') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#FF4500" />
          <Text style={styles.loadingTitle}>Creating your first image...</Text>
          <Text style={styles.loadingSubtitle}>Your AI is working its magic</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <OnboardingHeader stepNumber={10} onBack={() => router.back()} />

      <View style={styles.content}>
        {error ? (
          <TouchableOpacity style={styles.errorContainer} onPress={handleTryAgain}>
            <Ionicons name="refresh" size={32} color={colors.textSecondary} />
            <Text style={styles.errorText}>{error}</Text>
          </TouchableOpacity>
        ) : imageUrl ? (
          <>
            <Text style={styles.title}>Your AI created this</Text>
            <Animated.View style={[styles.imageContainer, imageRevealStyle]}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="cover"
                transition={300}
              />
            </Animated.View>
            {promptUsed ? (
              <Text style={styles.promptPreview} numberOfLines={2}>
                {promptUsed.length > 120 ? promptUsed.slice(0, 117) + '...' : promptUsed}
              </Text>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleLoveIt}
          disabled={phase === 'saving'}
          activeOpacity={0.7}
        >
          {phase === 'saving' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="heart" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Love it</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleTryAgain}
            disabled={phase === 'saving'}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color={colors.textSecondary} />
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleAdjust}
            disabled={phase === 'saving'}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.secondaryButtonText}>Adjust my vibe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  progressBar: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.accent, width: 24, borderRadius: 4 },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  loadingSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  imageContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: IMAGE_WIDTH,
    height: Math.min(IMAGE_HEIGHT, 400),
    borderRadius: 20,
  },
  promptPreview: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
    lineHeight: 17,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
