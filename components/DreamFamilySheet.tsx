/**
 * DreamFamilySheet — shows twins and fuses of a dream post.
 * Two tabs: Twins / Fuses. Grid of thumbnails. Twin/Fuse action buttons.
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, Pressable, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';
import { useDreamFamily, type FamilyMember } from '@/hooks/useDreamFamily';
import { useAlbumStore } from '@/store/album';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - 48 - GRID_GAP) / 2;

type Tab = 'twins' | 'fuses';

interface Props {
  visible: boolean;
  onClose: () => void;
  uploadId: string;
  isAiGenerated: boolean;
  aiPrompt: string | null;
  onTwin: () => void;
  onFuse: () => void;
}

function FamilyTile({ item }: { item: FamilyMember }) {
  return (
    <TouchableOpacity
      style={s.tile}
      onPress={() => {
        useAlbumStore.getState().clearAlbum();
        router.push(`/photo/${item.id}`);
      }}
      activeOpacity={0.9}
    >
      <Image source={{ uri: item.image_url }} style={s.tileImage} contentFit="cover" transition={150} />
      <View style={s.tileInfo}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={s.tileAvatar} />
        ) : (
          <View style={s.tileAvatarFallback}>
            <Text style={s.tileAvatarText}>{(item.username || '?')[0].toUpperCase()}</Text>
          </View>
        )}
        <Text style={s.tileUsername} numberOfLines={1}>{item.username}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function DreamFamilySheet({ visible, onClose, uploadId, isAiGenerated, aiPrompt, onTwin, onFuse }: Props) {
  const [tab, setTab] = useState<Tab>('twins');
  const { data, isLoading } = useDreamFamily(uploadId, visible);
  const twins = data?.twins ?? [];
  const fuses = data?.fuses ?? [];
  const items = tab === 'twins' ? twins : fuses;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />

          <View style={s.header}>
            <Text style={s.title}>Dream Family</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, tab === 'twins' && s.tabActive]}
              onPress={() => setTab('twins')}
              activeOpacity={0.7}
            >
              <Ionicons name="dice-outline" size={16} color={tab === 'twins' ? colors.textPrimary : colors.textSecondary} />
              <Text style={[s.tabText, tab === 'twins' && s.tabTextActive]}>
                Twins{twins.length > 0 ? ` (${twins.length})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, tab === 'fuses' && s.tabActive]}
              onPress={() => setTab('fuses')}
              activeOpacity={0.7}
            >
              <Ionicons name="git-merge-outline" size={16} color={tab === 'fuses' ? colors.textPrimary : colors.textSecondary} />
              <Text style={[s.tabText, tab === 'fuses' && s.tabTextActive]}>
                Fuses{fuses.length > 0 ? ` (${fuses.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Grid */}
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={s.gridRow}
            contentContainerStyle={s.grid}
            renderItem={({ item }) => <FamilyTile item={item} />}
            ListEmptyComponent={
              <View style={s.empty}>
                {isLoading ? (
                  <ActivityIndicator color={colors.textSecondary} />
                ) : (
                  <>
                    <Ionicons
                      name={tab === 'twins' ? 'dice-outline' : 'git-merge-outline'}
                      size={36}
                      color="rgba(255,255,255,0.15)"
                    />
                    <Text style={s.emptyText}>
                      {tab === 'twins' ? 'No twins yet' : 'No fuses yet'}
                    </Text>
                    <Text style={s.emptySubtext}>
                      {tab === 'twins'
                        ? 'Twin this dream to see parallel versions'
                        : 'Fuse with this dream to blend styles'}
                    </Text>
                  </>
                )}
              </View>
            }
          />

          {/* Action buttons */}
          {isAiGenerated && (
            <View style={s.actions}>
              {aiPrompt && (
                <TouchableOpacity
                  style={s.actionButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onClose();
                    onTwin();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="dice-outline" size={18} color="#FFFFFF" />
                  <Text style={s.actionText}>Twin this dream</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.actionButton, s.actionButtonSecondary]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onClose();
                  onFuse();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="git-merge-outline" size={18} color={colors.accent} />
                <Text style={[s.actionText, s.actionTextSecondary]}>Fuse with this dream</Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 34,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  title: {
    color: colors.textPrimary, fontSize: 18, fontWeight: '800',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.card,
  },
  tabText: {
    color: colors.textSecondary, fontSize: 14, fontWeight: '600',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  grid: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  tile: {
    width: TILE_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  tileImage: {
    width: TILE_SIZE,
    height: TILE_SIZE * 1.4,
  },
  tileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  tileAvatar: {
    width: 20, height: 20, borderRadius: 10,
  },
  tileAvatarFallback: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  tileAvatarText: {
    color: colors.textPrimary, fontSize: 10, fontWeight: '700',
  },
  tileUsername: {
    color: colors.textSecondary, fontSize: 12, fontWeight: '600',
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    gap: 8,
  },
  emptyText: {
    color: colors.textPrimary, fontSize: 16, fontWeight: '700',
  },
  emptySubtext: {
    color: colors.textSecondary, fontSize: 14, textAlign: 'center',
    paddingHorizontal: 20,
  },
  actions: {
    paddingHorizontal: 20,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  actionText: {
    color: '#FFFFFF', fontSize: 16, fontWeight: '700',
  },
  actionTextSecondary: {
    color: colors.accent,
  },
});
