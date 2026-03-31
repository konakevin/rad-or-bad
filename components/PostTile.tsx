import { TouchableOpacity, Text, StyleSheet, Dimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDeletePost } from '@/hooks/useDeletePost';
import { handleImageLongPress } from '@/lib/imageLongPress';
import { useAlbumStore } from '@/store/album';
import type { PostItem } from '@/hooks/useUserPosts';
import { colors } from '@/constants/theme';

const TILE_GAP = 2;
const TILE_SIZE = (Dimensions.get('window').width - TILE_GAP) / 2;

interface PostTileProps {
  item: PostItem;
  isOwn?: boolean;
  albumIds?: string[];
  isHighlighted?: boolean;
}

export function PostTile({ item, isOwn = false, albumIds, isHighlighted = false }: PostTileProps) {
  const { mutate: deletePost } = useDeletePost();

  function handlePress() {
    if (albumIds?.length) {
      useAlbumStore.getState().setAlbum(albumIds);
    } else {
      useAlbumStore.getState().clearAlbum();
    }
    router.push(`/photo/${item.id}`);
  }

  function handleLongPress() {
    handleImageLongPress({
      id: item.id,
      imageUrl: item.image_url,
      onDelete: isOwn ? () => deletePost(item.id) : undefined,
    });
  }

  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.thumbnail_url ?? item.image_url }}
        style={styles.image}
        contentFit="cover"
        transition={150}
      />
      {item.media_type === 'video' && (
        <View style={styles.playBadge}>
          <Ionicons name="play" size={12} color="#FFFFFF" />
        </View>
      )}
      {isHighlighted && (
        <View style={styles.highlightOverlay}>
          <View style={styles.highlightPill}>
            <Ionicons name="eye-outline" size={13} color="#FFFFFF" />
            <Text style={styles.highlightText}>Just viewed</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: colors.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 3,
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  highlightText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
