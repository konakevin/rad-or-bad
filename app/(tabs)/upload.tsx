/**
 * Dream Screen — the main dream generation interface.
 *
 * Phases: pick → preview → dreaming → reveal → posting
 * Modes: normal, style_ref (Dream Like This), twin
 *
 * Logic lives in hooks:
 *   usePhotoInput — photo picking, base64, hints
 *   useDreamAlbum — dream carousel, per-dream control state
 *   useDreamGeneration — all 6 generation paths, sparkle spending, posting
 */

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { MASCOT_URLS } from '@/constants/mascots';
import { PROMPT_MODE_TILES } from '@/constants/promptModes';
import { Toast } from '@/components/Toast';
import { usePhotoInput } from '@/hooks/usePhotoInput';
import { useDreamAlbum } from '@/hooks/useDreamAlbum';
import { useDreamGeneration } from '@/hooks/useDreamGeneration';

type Phase = 'pick' | 'preview' | 'dreaming' | 'reveal' | 'posting';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 48;

export default function DreamScreen() {
  const mascotUrl = MASCOT_URLS[1];
  const [phase, setPhase] = useState<Phase>('pick');
  const [error, setError] = useState<string | null>(null);
  const [dreaming, setDreaming] = useState(false);
  const [posting, setPosting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // ── Hooks ───────────────────────────────────────────────────────────

  const album = useDreamAlbum();

  const photo = usePhotoInput(
    useCallback(() => {
      setPhase('preview');
      album.clearAlbum();
    }, [album.clearAlbum])
  );

  const gen = useDreamGeneration({
    phase,
    setPhase,
    isStyleRef: false,
    isTwinMode: false,
    fusionTarget: null,
    photoBase64: photo.photoBase64,
    photoUri: photo.photoUri,
    photoFromUpload: photo.photoFromUpload,
    userHint: photo.userHint,
    albumLength: album.album.length,
    selectedMode: album.selectedMode,
    customPrompt: album.customPrompt,
    makeControlState: album.makeControlState,
    addDream: album.addDream,
    dreaming,
    setDreaming,
    posting,
    setPosting,
    setError,
  });

  const { sparkleBalance } = gen;

  // ── Focus/blur ────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      gen.busy.current = false;
      return () => {};
    }, [])
  );

  // ── Reset ─────────────────────────────────────────────────────────────

  function reset() {
    setPhase('pick');
    photo.clearPhoto();
    album.clearAlbum();
    setError(null);
    setPosting(false);
    setDreaming(false);
    gen.busy.current = false;
    gen.imgOpacity.value = 0;
    gen.imgScale.value = 0.85;
  }

  // ── Fullscreen preview animations ─────────────────────────────────────

  const fsScale = useSharedValue(0);
  const fsOpacity = useSharedValue(0);
  const fsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.5 + fsScale.value * 0.5 }],
    opacity: fsOpacity.value,
  }));
  const fsOverlayStyle = useAnimatedStyle(() => ({
    opacity: fsOpacity.value,
  }));

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

  const revealStyle = useAnimatedStyle(() => ({
    opacity: gen.imgOpacity.value,
    transform: [{ scale: gen.imgScale.value }],
  }));

  function closeFullscreen() {
    fsScale.value = withTiming(0, { duration: 250 });
    fsOpacity.value = withTiming(0, { duration: 250 });
    setTimeout(() => setFullscreen(false), 260);
  }

  // ── Post handler ──────────────────────────────────────────────────────

  async function handlePost() {
    const result = await gen.post(album.activeDream, album.activeIndex, album.album.length);
    if (!result?.success) return;
    if (result.isLastDream) {
      reset();
      router.replace('/(tabs)');
    } else {
      album.removeDream(album.activeIndex);
      setPosting(false);
    }
  }

  // ── Sparkle pill (shared) ─────────────────────────────────────────────

  function SparklePill() {
    return (
      <TouchableOpacity
        style={s.sparklePill}
        onPress={() => router.push('/sparkleStore')}
        activeOpacity={0.7}
      >
        <Ionicons name="sparkles" size={14} color={colors.accent} />
        <Text style={s.sparklePillText}>{sparkleBalance}</Text>
      </TouchableOpacity>
    );
  }

  // ── Mode pills (shared) ───────────────────────────────────────────────

  function ModePills() {
    if (album.customPrompt.trim()) return null;
    return (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.modeRow}
          style={s.modeScroll}
        >
          {PROMPT_MODE_TILES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[s.modePill, album.selectedMode === m.key && s.modePillActive]}
              onPress={() => album.setSelectedMode(m.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={m.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={album.selectedMode === m.key ? '#FFFFFF' : colors.textSecondary}
              />
              <Text style={[s.modePillText, album.selectedMode === m.key && s.modePillTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={s.modeHint}>
          {PROMPT_MODE_TILES.find((m) => m.key === album.selectedMode)?.hint ?? ''}
        </Text>
      </>
    );
  }

  // ── Custom prompt input (shared) ──────────────────────────────────────

  function CustomPromptInput({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
  }) {
    return (
      <View style={s.customPromptWrap}>
        <TextInput
          style={s.customPromptInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChange}
          maxLength={300}
          multiline
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={8} style={s.customPromptClear}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER — each phase is a separate block
  // ═══════════════════════════════════════════════════════════════════════

  // ── PICK ──────────────────────────────────────────────────────────────

  if (phase === 'pick') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Image source={{ uri: mascotUrl }} style={s.mascot} contentFit="cover" />
          <SparklePill />
          <Text style={s.title}>Dream</Text>
          <Text style={s.sub}>Let DreamBot create something new</Text>
          <ModePills />
          <CustomPromptInput
            value={album.customPrompt}
            onChange={album.setCustomPrompt}
            placeholder="Or type your own prompt..."
          />
          <View style={s.pickButtonRow}>
            <TouchableOpacity style={s.ctaHalf} onPress={photo.pickPhoto} activeOpacity={0.7}>
              <Ionicons name="images" size={18} color={colors.textPrimary} />
              <Text style={s.ctaSecondaryText}>Dream a Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.ctaHalf, { backgroundColor: colors.accent }]}
              onPress={gen.justDream}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={18} color="#FFF" />
              <Text style={[s.ctaSecondaryText, { color: '#FFFFFF' }]}>
                {album.customPrompt.trim() ? 'Dream This' : 'Dream'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── PREVIEW ───────────────────────────────────────────────────────────

  if (phase === 'preview') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={reset} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Dream this</Text>
          <SparklePill />
        </View>
        <View style={s.previewWrap}>
          <Image source={{ uri: photo.photoUri! }} style={s.previewImg} contentFit="cover" />
          <CustomPromptInput
            value={photo.userHint}
            onChange={photo.setUserHint}
            placeholder="Describe your dream, or leave blank for DreamBot to decide..."
          />
        </View>
        {error && <Text style={s.errorText}>{error}</Text>}
        <View style={s.footer}>
          {!photo.userHint.trim() && <ModePills />}
          <TouchableOpacity
            style={s.cta}
            onPress={() => {
              setError(null);
              gen.dream();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={s.ctaText}>{photo.userHint.trim() ? 'Dream This' : 'Dream'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── DREAMING ──────────────────────────────────────────────────────────

  if (phase === 'dreaming') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Image source={{ uri: mascotUrl }} style={s.loadingMascot} contentFit="cover" />
          <Text style={s.title}>Dreaming...</Text>
          <Text style={s.sub}>DreamBot is dreaming your photo</Text>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // ── REVEAL ────────────────────────────────────────────────────────────

  if (phase === 'reveal' && album.album.length > 0) {
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
          <SparklePill />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', maxHeight: SCREEN_HEIGHT * 0.45 }}>
          <FlatList
            ref={album.albumRef}
            data={album.album}
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
              const clamped = Math.max(0, Math.min(idx, album.album.length - 1));
              if (clamped !== album.activeIndex) {
                album.saveControlsToActiveDream();
                album.setActiveIndex(clamped);
                if (album.album[clamped]) album.restoreControlsFromDream(album.album[clamped]);
              }
            }}
            scrollEventThrottle={16}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  album.setActiveIndex(index);
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
                    index === album.album.length - 1 ? revealStyle : undefined,
                  ]}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={s.revealImg}
                    contentFit="cover"
                    transition={300}
                  />
                  {dreaming && index === album.activeIndex && (
                    <View style={s.dreamingOverlay}>
                      <ActivityIndicator size="large" color={colors.accent} />
                      <Text style={s.dreamingText}>Dreaming...</Text>
                    </View>
                  )}
                  {album.album.length > 1 && !dreaming && (
                    <TouchableOpacity
                      style={s.dismissBadge}
                      onPress={() => album.removeDream(index)}
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
          {album.album.length > 1 && (
            <View style={s.dotRow}>
              {album.album.map((_, i) => (
                <View key={i} style={[s.dot, i === album.activeIndex && s.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Fullscreen preview modal */}
        <Modal visible={fullscreen} transparent animationType="none" statusBarTranslucent>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeFullscreen}>
            <Animated.View style={[s.fsOverlay, fsOverlayStyle]}>
              <GestureDetector gesture={pinchGesture}>
                <Animated.View style={[s.fsImageWrap, fsStyle]}>
                  <Animated.View style={[{ width: '100%', height: '80%' }, pinchStyle]}>
                    <Image
                      source={{ uri: album.album[album.activeIndex]?.url ?? '' }}
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
          <ModePills />
          <CustomPromptInput
            value={album.customPrompt}
            onChange={album.setCustomPrompt}
            placeholder="Or type your own prompt..."
          />
          <TouchableOpacity
            style={s.cta}
            onPress={async () => {
              if (album.reDreamCurrent && album.activeDream?.url) {
                try {
                  const resp = await fetch(album.activeDream.url);
                  const blob = await resp.blob();
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const b64 = reader.result as string;
                    photo.setPhotoBase64(b64.split(',')[1] ?? null);
                    photo.setPhotoUri(album.activeDream!.url);
                    gen.dream();
                  };
                  reader.readAsDataURL(blob);
                } catch {
                  Toast.show('Could not load image', 'close-circle');
                }
              } else if (album.reusePhoto && photo.photoUri) gen.dream();
              else gen.justDream();
            }}
            activeOpacity={0.7}
            disabled={posting || dreaming}
          >
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={s.ctaText}>{album.customPrompt.trim() ? 'Dream This' : 'Dream'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.reuseRow}
            onPress={() => {
              album.setReDreamCurrent(!album.reDreamCurrent);
              if (!album.reDreamCurrent) album.setReusePhoto(false);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={album.reDreamCurrent ? 'checkbox' : 'square-outline'}
              size={18}
              color={album.reDreamCurrent ? colors.accent : colors.textSecondary}
            />
            <Text style={[s.reuseText, album.reDreamCurrent && s.reuseTextActive]}>
              Re-dream this image
            </Text>
          </TouchableOpacity>
          {album.album[album.activeIndex]?.fromUpload && (
            <TouchableOpacity
              style={s.reuseRow}
              onPress={() => {
                album.setReusePhoto(!album.reusePhoto);
                if (!album.reusePhoto) album.setReDreamCurrent(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={album.reusePhoto ? 'checkbox' : 'square-outline'}
                size={18}
                color={album.reusePhoto ? colors.accent : colors.textSecondary}
              />
              <Text style={[s.reuseText, album.reusePhoto && s.reuseTextActive]}>
                Reuse original photo
              </Text>
            </TouchableOpacity>
          )}
          <View style={s.row}>
            <TouchableOpacity style={s.ctaHalf} onPress={photo.pickPhoto} activeOpacity={0.7}>
              <Ionicons name="images" size={18} color={colors.textPrimary} />
              <Text style={s.ctaSecondaryText}>Dream a Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.ctaHalf}
              onPress={handlePost}
              activeOpacity={0.7}
              disabled={posting || dreaming}
            >
              {posting ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Ionicons name="cloud-upload" size={18} color={colors.textPrimary} />
              )}
              <Text style={s.ctaSecondaryText}>{posting ? 'Posting...' : 'Post Dream'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── POSTING ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root}>
      <View style={s.center}>
        <Image source={{ uri: mascotUrl }} style={s.loadingMascot} contentFit="cover" />
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
  modeScroll: { flexGrow: 0, marginBottom: 16 },
  modeRow: { gap: 8, paddingHorizontal: 4 },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modePillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  modePillText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  modePillTextActive: { color: '#FFFFFF' },
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
  modeHint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  customPromptWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 4,
    minHeight: 44,
  },
  customPromptInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    maxHeight: 60,
    paddingVertical: 10,
  },
  customPromptClear: { padding: 4 },
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
  ctaSecondaryText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
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
  footer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80, gap: 12 },
  previewWrap: { paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  previewImg: { width: PREVIEW_WIDTH * 0.7, height: PREVIEW_WIDTH * 0.85, borderRadius: 16 },
  errorText: { color: colors.error, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
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
  row: { flexDirection: 'row', gap: 12 },
  pickButtonRow: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  reuseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  reuseText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  reuseTextActive: { color: colors.accent },
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
