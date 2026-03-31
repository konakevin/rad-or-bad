import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system';
import { showAlert } from '@/components/CustomAlert';
import { Toast } from '@/components/Toast';

async function saveToPhotos(id: string, imageUrl: string) {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    showAlert('Permission needed', 'Allow access to save images.');
    return;
  }
  try {
    const dest = new File(Paths.cache, `${id}.jpg`);
    const downloaded = await File.downloadFileAsync(imageUrl, dest);
    await MediaLibrary.saveToLibraryAsync(downloaded.uri);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show('Saved to photos', 'checkmark-circle');
  } catch {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Toast.show('Failed to save image', 'close-circle');
  }
}

/**
 * Standard long-press handler for images.
 * - Not your post: straight to save confirmation
 * - Your post: Options menu with Save + Delete
 */
export function handleImageLongPress(opts: {
  id: string;
  imageUrl: string;
  onDelete?: () => void;
}) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

  if (opts.onDelete) {
    showAlert('Options', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save to Photos',
        onPress: () => {
          showAlert('Save Image', 'Save this dream to your photos?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Save', onPress: () => saveToPhotos(opts.id, opts.imageUrl) },
          ]);
        },
      },
      {
        text: 'Delete',
        style: 'destructive' as const,
        onPress: () => {
          showAlert('Delete Dream', 'Are you sure? This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive' as const, onPress: opts.onDelete! },
          ]);
        },
      },
    ]);
  } else {
    showAlert('Save Image', 'Save this dream to your photos?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: () => saveToPhotos(opts.id, opts.imageUrl) },
    ]);
  }
}
