import { showAlert } from '@/components/CustomAlert';
import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageCropPicker from 'react-native-image-crop-picker';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUpload } from '@/hooks/useUpload';
import type { Category } from '@/types/database';
import { colors } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAPTION_LIMIT = 200;
const MAX_VIDEO_DURATION = 10; // seconds

const COMPRESS_MESSAGES = [
  'Squishing pixels...',
  'Making it rad...',
  'Shrinking the vibes...',
  'Almost ready to be judged...',
  'Bottling the energy...',
];

function VideoPreview({ uri, height }: { uri: string; height: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={[styles.imagePreview, { height }]}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

export default function UploadScreen() {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaDimensions, setMediaDimensions] = useState<{ width: number; height: number } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [caption, setCaption] = useState('');
  const { mutate: upload, isPending } = useUpload();
  const [uploadPhase, setUploadPhase] = useState<string | null>(null);
  const compressMsg = useMemo(
    () => COMPRESS_MESSAGES[Math.floor(Math.random() * COMPRESS_MESSAGES.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPending],
  );

  const canPost = !!mediaUri && categories.length > 0;

  const previewWidth = SCREEN_WIDTH - 32;
  const previewHeight = mediaDimensions
    ? Math.min(previewWidth * (mediaDimensions.height / mediaDimensions.width), IMAGE_HEIGHT)
    : IMAGE_HEIGHT;

  async function pickFromLibrary() {
    try {
      const media = await ImageCropPicker.openPicker({
        mediaType: 'any',
        cropping: false,
        forceJpg: true,
        compressImageQuality: 0.95,
      });

      if (media.mime.startsWith('video/')) {
        const durationSec = (media.duration ?? 0) / 1000;
        if (durationSec > MAX_VIDEO_DURATION) {
          showAlert('Too long', `Videos must be ${MAX_VIDEO_DURATION} seconds or less. Trim it in the Photos app first.`);
          return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const uri = media.path.startsWith('file://') ? media.path : `file://${media.path}`;
        setMediaUri(uri);
        setMediaType('video');
        setMediaDimensions({ width: media.width, height: media.height });
      } else {
        // Crop images — same library handles the modal stack so no timing issues
        const cropped = await ImageCropPicker.openCropper({
          path: media.path,
          forceJpg: true,
          compressImageQuality: 0.95,
          cropperCancelText: 'Cancel',
          cropperChooseText: 'Choose',
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const uri = cropped.path.startsWith('file://') ? cropped.path : `file://${cropped.path}`;
        setMediaUri(uri);
        setMediaType('image');
        setMediaDimensions({ width: cropped.width, height: cropped.height });
      }
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'E_PICKER_CANCELLED') {
        showAlert('Error', 'Could not open photo library.');
      }
    }
  }

  async function recordVideo() {
    try {
      const media = await ImageCropPicker.openCamera({
        mediaType: 'any',
        cropping: true,
        forceJpg: true,
        compressImageQuality: 0.95,
        cropperCancelText: 'Cancel',
        cropperChooseText: 'Choose',
        videoMaxDuration: MAX_VIDEO_DURATION,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const uri = media.path.startsWith('file://') ? media.path : `file://${media.path}`;
      setMediaUri(uri);
      setMediaType(media.mime.startsWith('video/') ? 'video' : 'image');
      setMediaDimensions({ width: media.width, height: media.height });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'E_PICKER_CANCELLED') {
        showAlert('Error', 'Could not open camera.');
      }
    }
  }

  function handlePost() {
    if (!mediaUri) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showAlert('No content, no glory.', 'Pick a photo or video first.');
      return;
    }
    if (categories.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showAlert('Whoa there.', 'Category-less posts are illegal here. Pick one.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUploadPhase(null);
    upload(
      { uri: mediaUri!, categories, caption, mediaType, width: mediaDimensions?.width ?? null, height: mediaDimensions?.height ?? null, onPhase: setUploadPhase },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setMediaUri(null);
          setMediaType('image');
          setMediaDimensions(null);
          setCategories([]);
          setCaption('');
          router.replace('/(tabs)');
        },
        onError: (err) => {
          showAlert('Upload failed', err.message);
        },
      },
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New post</Text>
          <TouchableOpacity
            style={[styles.postButton, !canPost && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={isPending}
            activeOpacity={0.8}
          >
              {isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.postButtonText}>Post</Text>}
          </TouchableOpacity>
        </View>
        {isPending && uploadPhase && (
          <Text style={styles.uploadStatus}>{uploadPhase}</Text>
        )}

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Media picker / preview */}
          {mediaUri ? (
            <View style={[styles.imagePreviewContainer, { height: previewHeight }]}>
              {mediaType === 'video' ? (
                <VideoPreview uri={mediaUri} height={previewHeight} />
              ) : (
                <Image source={{ uri: mediaUri }} style={[styles.imagePreview, { height: previewHeight }]} contentFit="contain" />
              )}
              {mediaType === 'video' && (
                <View style={styles.videoBadge}>
                  <Ionicons name="videocam" size={12} color="#FFFFFF" />
                  <Text style={styles.videoBadgeText}>Video</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => { setMediaUri(null); setMediaType('image'); setMediaDimensions(null); }}
                activeOpacity={0.7}
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.changePhotoButton} onPress={pickFromLibrary} activeOpacity={0.8}>
                <Text style={styles.changePhotoText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerRow}>
              <TouchableOpacity style={styles.pickerButton} onPress={pickFromLibrary} activeOpacity={0.8}>
                <Ionicons name="images-outline" size={26} color={colors.textSecondary} />
                <Text style={styles.pickerButtonText}>Library</Text>
              </TouchableOpacity>
              <View style={styles.pickerDivider} />
              <TouchableOpacity style={styles.pickerButton} onPress={recordVideo} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={26} color={colors.textSecondary} />
                <Text style={styles.pickerButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.pickerHint}>Photos or videos up to {MAX_VIDEO_DURATION}s</Text>

          {/* Category */}
          <View style={styles.categoryHeader}>
            <Text style={styles.sectionLabel}>CATEGORY</Text>
            <Text style={styles.categoryLimit}>{categories.length}/3</Text>
          </View>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const selected = categories.includes(cat.key);
              const atMax = categories.length >= 3 && !selected;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryChip,
                    selected && styles.categoryChipSelected,
                    atMax && styles.categoryChipDisabled,
                  ]}
                  onPress={() => {
                    if (atMax) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      showAlert('Max 3 categories', 'Remove one before adding another.');
                      return;
                    }
                    Haptics.selectionAsync();
                    setCategories((prev) =>
                      prev.includes(cat.key)
                        ? prev.filter((c) => c !== cat.key)
                        : [...prev, cat.key]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={13} color={selected ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected, atMax && styles.categoryChipTextDisabled]} numberOfLines={1}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Caption */}
          <Text style={styles.sectionLabel}>CAPTION <Text style={styles.optional}>(optional)</Text></Text>
          <View style={styles.captionContainer}>
            <TextInput
              style={styles.captionInput}
              placeholder="Say something about it..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={caption}
              onChangeText={(t) => setCaption(t.slice(0, CAPTION_LIMIT))}
              multiline
              maxLength={CAPTION_LIMIT}
              returnKeyType="done"
            />
            <Text style={[
              styles.charCount,
              caption.length >= CAPTION_LIMIT ? styles.charCountError :
              caption.length >= CAPTION_LIMIT * 0.9 ? styles.charCountWarning : null,
            ]}>
              {CAPTION_LIMIT - caption.length}
            </Text>
          </View>

          {!canPost && mediaUri && categories.length === 0 && (
            <Text style={styles.hint}>Pick at least one category to continue</Text>
          )}
          {!mediaUri && (
            <Text style={styles.hint}>Choose a photo or video to get started</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const IMAGE_HEIGHT = (SCREEN_WIDTH - 32) * (4 / 3);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  postButton: {
    backgroundColor: colors.flame,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  postButtonDisabled: { backgroundColor: colors.border },
  postButtonText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  scroll: { padding: 16, paddingBottom: 40 },
  pickerRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: 'hidden',
    height: 100,
  },
  pickerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111111',
  },
  pickerButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  pickerDivider: { width: 1, backgroundColor: colors.border },
  pickerHint: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  imagePreviewContainer: { borderRadius: 16, overflow: 'hidden' },
  imagePreview: { width: '100%', height: IMAGE_HEIGHT },
  videoBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  videoBadgeText: { color: colors.textPrimary, fontSize: 11, fontWeight: '600' },
  clearButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  changePhotoText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  optional: { color: colors.textSecondary, fontWeight: '400', letterSpacing: 0 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  categoryLimit: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28, justifyContent: 'space-between' },
  categoryChipDisabled: { opacity: 0.35 },
  categoryChipTextDisabled: { color: colors.textTertiary },
  categoryChip: {
    width: '31%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 16,
    paddingVertical: 10,
  },
  categoryChipSelected: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  categoryChipTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  categoryChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  captionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  captionInput: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
    fontWeight: '500',
  },
  charCountWarning: { color: colors.spark },
  charCountError: { color: colors.error, fontWeight: '700' },
  hint: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 20 },
  uploadStatus: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
});
