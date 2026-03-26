import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUpload } from '@/hooks/useUpload';
import type { Category } from '@/types/database';

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

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'people',  label: 'People',  color: '#6699EE' },
  { value: 'animals', label: 'Animals', color: '#DDAA66' },
  { value: 'food',    label: 'Food',    color: '#DD7766' },
  { value: 'nature',  label: 'Nature',  color: '#77CC88' },
  { value: 'memes',   label: 'Memes',   color: '#BB88EE' },
];

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={styles.imagePreview}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export default function UploadScreen() {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaDimensions, setMediaDimensions] = useState<{ width: number; height: number } | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [caption, setCaption] = useState('');
  const { mutate: upload, isPending } = useUpload();
  const compressMsg = useMemo(
    () => COMPRESS_MESSAGES[Math.floor(Math.random() * COMPRESS_MESSAGES.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPending],
  );

  const canPost = !!mediaUri && !!category;

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
      videoMaxDuration: MAX_VIDEO_DURATION,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.type === 'video' && (asset.duration ?? 0) > MAX_VIDEO_DURATION * 1000) {
        Alert.alert('Too long', `Videos must be ${MAX_VIDEO_DURATION} seconds or less.`);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMediaUri(asset.uri);
      setMediaType(asset.type === 'video' ? 'video' : 'image');
      setMediaDimensions(asset.width && asset.height ? { width: asset.width, height: asset.height } : null);
    }
  }

  async function recordVideo() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
      videoMaxDuration: MAX_VIDEO_DURATION,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMediaUri(asset.uri);
      setMediaType(asset.type === 'video' ? 'video' : 'image');
      setMediaDimensions(asset.width && asset.height ? { width: asset.width, height: asset.height } : null);
    }
  }

  function handlePost() {
    if (!canPost) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    upload(
      { uri: mediaUri!, category: category!, caption, mediaType, width: mediaDimensions?.width ?? null, height: mediaDimensions?.height ?? null },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setMediaUri(null);
          setMediaType('image');
          setMediaDimensions(null);
          setCategory(null);
          setCaption('');
          router.replace('/(tabs)');
        },
        onError: (err) => {
          Alert.alert('Upload failed', err.message);
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
            disabled={!canPost || isPending}
            activeOpacity={0.8}
          >
              {isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.postButtonText}>Post</Text>}
          </TouchableOpacity>
        </View>
        {isPending && mediaType === 'video' && (
          <Text style={styles.uploadStatus}>{compressMsg}</Text>
        )}

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Media picker / preview */}
          {mediaUri ? (
            <View style={styles.imagePreviewContainer}>
              {mediaType === 'video' ? (
                <VideoPreview uri={mediaUri} />
              ) : (
                <Image source={{ uri: mediaUri }} style={styles.imagePreview} contentFit="cover" />
              )}
              {mediaType === 'video' && (
                <View style={styles.videoBadge}>
                  <Ionicons name="videocam" size={12} color="#FFFFFF" />
                  <Text style={styles.videoBadgeText}>Video</Text>
                </View>
              )}
              <TouchableOpacity style={styles.changePhotoButton} onPress={pickFromLibrary} activeOpacity={0.8}>
                <Text style={styles.changePhotoText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerRow}>
              <TouchableOpacity style={styles.pickerButton} onPress={pickFromLibrary} activeOpacity={0.8}>
                <Ionicons name="images-outline" size={26} color="#71767B" />
                <Text style={styles.pickerButtonText}>Library</Text>
              </TouchableOpacity>
              <View style={styles.pickerDivider} />
              <TouchableOpacity style={styles.pickerButton} onPress={recordVideo} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={26} color="#71767B" />
                <Text style={styles.pickerButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.pickerHint}>Photos or videos up to {MAX_VIDEO_DURATION}s</Text>

          {/* Category */}
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    selected && { borderColor: cat.color, backgroundColor: `${cat.color}1A` },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setCategory(cat.value); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryChipText, selected && { color: cat.color, fontWeight: '700' }]} numberOfLines={1}>
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
              placeholderTextColor="#3E4144"
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

          {!canPost && (
            <Text style={styles.hint}>
              {!mediaUri ? 'Choose a photo or video to get started' : 'Pick a category to continue'}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const IMAGE_HEIGHT = (SCREEN_WIDTH - 32) * (4 / 3);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2F2F2F',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  postButton: {
    backgroundColor: '#FF4500',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  postButtonDisabled: { backgroundColor: '#2F2F2F' },
  postButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  scroll: { padding: 16, paddingBottom: 40 },
  pickerRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#2F2F2F',
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
  pickerButtonText: { color: '#71767B', fontSize: 14, fontWeight: '500' },
  pickerDivider: { width: 1, backgroundColor: '#2F2F2F' },
  pickerHint: {
    color: '#3E4144',
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
  videoBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  changePhotoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  changePhotoText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  sectionLabel: {
    color: '#71767B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  optional: { color: '#3E4144', fontWeight: '400', letterSpacing: 0 },
  categoryRow: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  categoryChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2F2F2F',
    borderRadius: 16,
    paddingVertical: 7,
  },
  categoryChipText: { color: '#71767B', fontSize: 13, fontWeight: '600' },
  captionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#2F2F2F',
    paddingBottom: 8,
  },
  captionInput: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#3E4144',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
    fontWeight: '500',
  },
  charCountWarning: { color: '#FFB800' },
  charCountError: { color: '#F4212E', fontWeight: '700' },
  hint: { color: '#3E4144', fontSize: 13, textAlign: 'center', marginTop: 20 },
  uploadStatus: {
    color: '#71767B',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2F2F2F',
  },
});
