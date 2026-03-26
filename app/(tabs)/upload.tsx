import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUpload } from '@/hooks/useUpload';
import type { Category } from '@/types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAPTION_LIMIT = 200;

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'people',  label: 'People',  color: '#6699EE' },
  { value: 'animals', label: 'Animals', color: '#DDAA66' },
  { value: 'food',    label: 'Food',    color: '#DD7766' },
  { value: 'nature',  label: 'Nature',  color: '#77CC88' },
  { value: 'memes',   label: 'Memes',   color: '#BB88EE' },
];

export default function UploadScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [caption, setCaption] = useState('');
  const { mutate: upload, isPending } = useUpload();

  const canPost = !!imageUri && !!category;

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library in Settings to upload photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setImageUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access in Settings to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setImageUri(result.assets[0].uri);
    }
  }

  function handlePost() {
    if (!canPost) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    upload(
      { uri: imageUri!, category: category!, caption },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setImageUri(null);
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

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo picker */}
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
              <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage} activeOpacity={0.8}>
                <Text style={styles.changePhotoText}>Change photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerRow}>
              <TouchableOpacity style={styles.pickerButton} onPress={pickImage} activeOpacity={0.8}>
                <Ionicons name="images-outline" size={26} color="#71767B" />
                <Text style={styles.pickerButtonText}>Library</Text>
              </TouchableOpacity>
              <View style={styles.pickerDivider} />
              <TouchableOpacity style={styles.pickerButton} onPress={takePhoto} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={26} color="#71767B" />
                <Text style={styles.pickerButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>
          )}

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

          {/* Disabled hint */}
          {!canPost && (
            <Text style={styles.hint}>
              {!imageUri ? 'Choose a photo to get started' : 'Pick a category to continue'}
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

  // Picker
  pickerRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#2F2F2F',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 28,
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

  // Image preview
  imagePreviewContainer: { marginBottom: 24, borderRadius: 16, overflow: 'hidden' },
  imagePreview: { width: '100%', height: IMAGE_HEIGHT, borderRadius: 16 },
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

  // Section label
  sectionLabel: {
    color: '#71767B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  optional: { color: '#3E4144', fontWeight: '400', letterSpacing: 0 },

  // Categories
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
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

  // Caption
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

  // Hint
  hint: {
    color: '#3E4144',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
});
