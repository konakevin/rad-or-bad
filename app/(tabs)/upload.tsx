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

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Animated as RNAnimated,
  LayoutAnimation,
} from 'react-native';
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
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { MASCOT_URLS } from '@/constants/mascots';
import { PROMPT_MODE_TILES } from '@/constants/promptModes';
import { Toast } from '@/components/Toast';
import { showAlert } from '@/components/CustomAlert';
import { formatCompact } from '@/lib/formatNumber';
import { QuickSettingsSheet } from '@/components/QuickSettingsSheet';
import { DreamReveal } from '@/components/DreamReveal';
import { usePhotoInput } from '@/hooks/usePhotoInput';
import { useDreamAlbum } from '@/hooks/useDreamAlbum';
import { useDreamGeneration } from '@/hooks/useDreamGeneration';

type Phase = 'pick' | 'preview' | 'dreaming' | 'reveal' | 'posting';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 48;

export default function DreamScreen() {
  const mascotUrl = MASCOT_URLS[1];
  const [phase, setPhase] = useState<Phase>('pick');
  const [error, setError] = useState<string | null>(null);
  const [dreaming, setDreaming] = useState(false);
  const [posting, setPosting] = useState(false);
  const [pickTab, setPickTab] = useState<'dream' | 'photo'>('dream');
  const [showSettings, setShowSettings] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  const textFade = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardWillShow', () => {
      LayoutAnimation.configureNext({
        duration: 250,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
      });
      setKbOpen(true);
      RNAnimated.timing(textFade, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    });
    const s2 = Keyboard.addListener('keyboardWillHide', () => {
      LayoutAnimation.configureNext({
        duration: 250,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
      });
      setKbOpen(false);
      RNAnimated.timing(textFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
    return () => {
      s1.remove();
      s2.remove();
    };
  }, [textFade]);

  // ── Hooks ───────────────────────────────────────────────────────────

  const album = useDreamAlbum();

  const photo = usePhotoInput();

  const insets = useSafeAreaInsets();

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

  const pendingDiscardRef = useRef(false);
  const albumLenRef = useRef(0);
  const phaseRef = useRef(phase);
  albumLenRef.current = album.album.length;
  phaseRef.current = phase;

  useFocusEffect(
    useCallback(() => {
      gen.resetBusy();
      if (pendingDiscardRef.current) {
        pendingDiscardRef.current = false;
        confirmDiscard();
      }
      return () => {
        // If user navigates away via tab bar with unsaved dreams, warn on next focus
        if (albumLenRef.current > 0 && phaseRef.current === 'reveal') {
          pendingDiscardRef.current = true;
        }
      };
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
    setShowSettings(false);
    gen.resetBusy();
    gen.imgOpacity.value = 0;
    gen.imgScale.value = 0.85;
  }

  /** Prompt user before discarding unsaved dreams */
  function confirmDiscard() {
    if (album.album.length === 0) {
      reset();
      return;
    }
    const count = album.album.length;
    showAlert(
      'Unsaved dreams',
      `You have ${count} unsaved ${count === 1 ? 'dream' : 'dreams'} that will be lost.`,
      [
        { text: 'Discard', style: 'destructive', onPress: () => reset() },
        { text: 'Go Back', style: 'cancel' },
      ]
    );
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

  // ── Inline helpers (not components — avoid remount on re-render) ────

  const sparklePill = (
    <TouchableOpacity
      style={s.sparklePill}
      onPress={() => router.push('/sparkleStore')}
      activeOpacity={0.7}
    >
      <Ionicons name="sparkles" size={14} color={colors.accent} />
      <Text style={s.sparklePillText}>{formatCompact(sparkleBalance)}</Text>
    </TouchableOpacity>
  );

  const modeScrollRef = useRef<ScrollView>(null);
  const promptScrollRef = useRef<ScrollView>(null);
  const selectedModeIndex = PROMPT_MODE_TILES.findIndex((m) => m.key === album.selectedMode);

  const modePills = (
    <>
      <ScrollView
        ref={modeScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.modeRow}
        style={s.modeScroll}
        onLayout={() => {
          if (selectedModeIndex > 0) {
            // ~90px per pill, scroll so selected is visible
            modeScrollRef.current?.scrollTo({
              x: Math.max(0, selectedModeIndex * 90 - 40),
              animated: false,
            });
          }
        }}
      >
        {PROMPT_MODE_TILES.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[s.modePill, album.selectedMode === m.key && s.modePillActive]}
            onPress={() => album.setSelectedMode(m.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.modePillText, album.selectedMode === m.key && s.modePillTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {!kbOpen && (
        <Text style={s.modeHint}>
          {PROMPT_MODE_TILES.find((m) => m.key === album.selectedMode)?.hint ?? ''}
        </Text>
      )}
    </>
  );

  function renderPromptInput(value: string, onChange: (v: string) => void, placeholder: string) {
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

  // ── PICK (unified composer) ─────────────────────────────────────────

  const hasPhoto = !!photo.photoUri;

  // ── PHOTO PREVIEW (intercepts any phase when photo is attached) ────

  if (hasPhoto && (phase === 'pick' || phase === 'preview' || phase === 'reveal')) {
    return (
      <SafeAreaView style={s.root}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={10}
        >
          <View style={s.header}>
            <TouchableOpacity onPress={() => photo.clearPhoto()} hitSlop={12}>
              <Ionicons name="arrow-back" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Dream this photo</Text>
            {sparklePill}
          </View>
          <TouchableOpacity
            style={
              kbOpen
                ? { height: 190, justifyContent: 'center', alignItems: 'center' }
                : { flex: 1, justifyContent: 'center', alignItems: 'center' }
            }
            activeOpacity={1}
            onPress={() => kbOpen && Keyboard.dismiss()}
          >
            <View style={{ width: '100%', flex: 1, paddingHorizontal: 40, paddingVertical: 8 }}>
              <Image
                source={{ uri: photo.photoUri! }}
                style={{ width: '100%', flex: 1, borderRadius: 16 }}
                contentFit="contain"
              />
            </View>
          </TouchableOpacity>
          <View style={[s.composerFooter, { paddingBottom: kbOpen ? 0 : insets.bottom + 60 }]}>
            {modePills}
            {renderPromptInput(
              photo.userHint,
              photo.setUserHint,
              'Describe how to transform it (optional)...'
            )}
            <TouchableOpacity
              style={s.dreamCta}
              onPress={() => {
                setPhase('dreaming');
                gen.dream().then(() => photo.clearPhoto());
              }}
              activeOpacity={0.7}
            >
              <Text style={s.dreamCtaText}>{photo.userHint.trim() ? 'Dream This' : 'Dream'}</Text>
            </TouchableOpacity>
            {!kbOpen && (
              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                activeOpacity={0.7}
                style={{ alignSelf: 'center', marginTop: 14 }}
              >
                <Text style={s.settingsLink}>Customize your DreamBot</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── PICK ──────────────────────────────────────────────────────────────

  if (phase === 'pick' || phase === 'preview') {
    return (
      <SafeAreaView style={s.root}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={10}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={{ width: 28 }} />
            <Text style={s.headerTitle}>Dream</Text>
            {sparklePill}
          </View>

          {/* Top area — same height whether text or photo */}
          <TouchableOpacity
            style={
              kbOpen && hasPhoto
                ? { height: 190, justifyContent: 'center', alignItems: 'center' }
                : { flex: 1, justifyContent: 'center', alignItems: 'center' }
            }
            activeOpacity={1}
            onPress={() => kbOpen && Keyboard.dismiss()}
          >
            {hasPhoto ? (
              <View
                style={{
                  width: '100%',
                  flex: 1,
                  paddingHorizontal: kbOpen ? 80 : 40,
                  paddingVertical: 8,
                }}
              >
                <Image
                  source={{ uri: photo.photoUri! }}
                  style={{ width: '100%', flex: 1, borderRadius: 16 }}
                  contentFit="contain"
                />
                <TouchableOpacity
                  style={s.heroDismiss}
                  onPress={() => photo.clearPhoto()}
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              !kbOpen && (
                <RNAnimated.View style={{ alignItems: 'center', opacity: textFade, gap: 6 }}>
                  <Text style={s.pickHeading}>What will you dream today?</Text>
                  <Text style={s.pickHint}>Pick a vibe, type a prompt, or attach a photo</Text>
                </RNAnimated.View>
              )
            )}
          </TouchableOpacity>

          {/* Controls */}
          <View style={[s.composerFooter, { paddingBottom: kbOpen ? 0 : insets.bottom + 60 }]}>
            {modePills}
            {renderPromptInput(
              hasPhoto ? photo.userHint : album.customPrompt,
              hasPhoto ? photo.setUserHint : album.setCustomPrompt,
              hasPhoto
                ? 'Describe how to transform it (optional)...'
                : 'Type your own prompt (optional)...'
            )}
            {error && <Text style={s.errorText}>{error}</Text>}
            <View style={s.row}>
              <TouchableOpacity style={s.ctaHalf} onPress={photo.pickPhoto} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={18} color={colors.textPrimary} />
                <Text style={s.ctaSecondaryText}>{hasPhoto ? 'Change' : 'Photo'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.ctaHalf, { backgroundColor: colors.accent }]}
                onPress={() => {
                  setError(null);
                  if (hasPhoto) gen.dream();
                  else gen.justDream();
                }}
                activeOpacity={0.7}
              >
                <Text style={[s.ctaSecondaryText, { color: '#FFFFFF' }]}>
                  {(hasPhoto ? photo.userHint.trim() : album.customPrompt.trim())
                    ? 'Dream This'
                    : 'Dream'}
                </Text>
              </TouchableOpacity>
            </View>
            {!kbOpen && (
              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                activeOpacity={0.7}
                style={{ alignSelf: 'center', marginTop: 14 }}
              >
                <Text style={s.settingsLink}>Customize your DreamBot</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
        <QuickSettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
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
          <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 8 }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── REVEAL ────────────────────────────────────────────────────────────

  if (phase === 'reveal' && album.album.length > 0) {
    return (
      <SafeAreaView style={s.root}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={10}
        >
          <View style={s.header}>
            <TouchableOpacity onPress={confirmDiscard} hitSlop={12}>
              <Ionicons name="close" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Your dream</Text>
            {sparklePill}
          </View>
          <DreamReveal
            album={album.album}
            activeIndex={album.activeIndex}
            albumRef={album.albumRef}
            dreaming={dreaming}
            onIndexChange={(idx) => {
              album.saveControlsToActiveDream();
              album.setActiveIndex(idx);
              if (album.album[idx]) album.restoreControlsFromDream(album.album[idx]);
            }}
            compact={kbOpen}
            onRemove={album.removeDream}
            onPost={async (idx) => {
              const dream = album.album[idx];
              if (!dream) return;
              const result = await gen.post(dream, idx, album.album.length);
              if (result?.success) {
                if (result.isLastDream) {
                  reset();
                  router.replace('/(tabs)');
                } else {
                  album.removeDream(idx);
                }
              }
            }}
            imgOpacity={gen.imgOpacity}
            imgScale={gen.imgScale}
          />
          <View style={[s.composerFooter, { paddingBottom: kbOpen ? 0 : insets.bottom + 60 }]}>
            {modePills}
            {renderPromptInput(
              album.customPrompt,
              album.setCustomPrompt,
              'Type your own prompt (optional)...'
            )}
            {error && <Text style={s.errorText}>{error}</Text>}
            <View style={s.row}>
              <TouchableOpacity style={s.ctaHalf} onPress={photo.pickPhoto} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={18} color={colors.textPrimary} />
                <Text style={s.ctaSecondaryText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.ctaHalf, { backgroundColor: colors.accent }]}
                onPress={() => {
                  setError(null);
                  if (hasPhoto) gen.dream();
                  else gen.justDream();
                }}
                activeOpacity={0.7}
                disabled={posting || dreaming}
              >
                <Text style={[s.ctaSecondaryText, { color: '#FFFFFF' }]}>
                  {album.customPrompt.trim() ? 'Dream This' : 'Dream'}
                </Text>
              </TouchableOpacity>
            </View>
            {!kbOpen && (
              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                activeOpacity={0.7}
                style={{ alignSelf: 'center', marginTop: 14 }}
              >
                <Text style={s.settingsLink}>Customize your DreamBot</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  dreamCta: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  dreamCtaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  promptTabScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  composerFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 14,
  },
  inputCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  photoTabScroll: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 90,
    gap: 10,
  },
  photoPlaceholder: {
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.55 * 1.2,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  pickHint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  settingsLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },
  mascot: { width: 120, height: 120, borderRadius: 24, marginBottom: 12 },
  mascotSmall: { width: 60, height: 60, borderRadius: 14 },
  pickHeroPhoto: {
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.55 * 1.2,
    borderRadius: 14,
  },
  pickHeading: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  heroDismiss: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  modePillActive: { backgroundColor: 'transparent', borderColor: colors.accent },
  modePillText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  modePillTextActive: { color: colors.accent },
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
    minHeight: 60,
    maxHeight: 100,
    paddingVertical: 10,
    textAlignVertical: 'top',
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
  radioGroup: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  revealPhotoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  revealPhotoThumb: { width: 56, height: 56, borderRadius: 10 },
  revealPhotoDismiss: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealPhotoPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  revealPhotoPickerText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
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
