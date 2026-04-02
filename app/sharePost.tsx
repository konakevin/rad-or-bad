import { showAlert } from '@/components/CustomAlert';
import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator, StyleSheet, Dimensions, Pressable, Animated, Share } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { useShareableVibers, type ShareableViber } from '@/hooks/useShareableVibers';
import { useSendShare } from '@/hooks/useSendShare';
import { useSheetDismiss } from '@/hooks/useSheetDismiss';
import { colors } from '@/constants/theme';
import { Toast } from '@/components/Toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65;
const COLUMNS = 3;
const AVATAR_SIZE = 64;
const CELL_WIDTH = (SCREEN_WIDTH - 32) / COLUMNS;
const DEFAULT_ROWS = 4;
const DEFAULT_LIMIT = DEFAULT_ROWS * COLUMNS;

function ViberBubble({ item, selected, onToggle }: { item: ShareableViber; selected: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.bubble, { width: CELL_WIDTH }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={[styles.avatar, selected && styles.avatarSelected]} />
        ) : (
          <View style={[styles.avatarFallback, selected && styles.avatarSelected]}>
            <Text style={styles.avatarInitial}>{(item.username || '?')[0].toUpperCase()}</Text>
          </View>
        )}
        {selected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={12} color="#000000" />
          </View>
        )}
      </View>
      <Text style={[styles.bubbleName, selected && styles.bubbleNameSelected]} numberOfLines={1}>
        {item.username}
      </Text>
    </TouchableOpacity>
  );
}

export default function SharePostScreen() {
  const { uploadId } = useLocalSearchParams<{ uploadId: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: vibers = [], isLoading } = useShareableVibers();
  const { mutate: sendShare, isPending } = useSendShare();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const { translateY, panHandlers } = useSheetDismiss();
  const insets = useSafeAreaInsets();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return vibers.slice(0, DEFAULT_LIMIT);
    return vibers.filter((v) => v.username.toLowerCase().includes(q));
  }, [vibers, search]);

  function toggleViber(userId: string) {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function handleSend() {
    if (selected.size === 0) return;

    sendShare(
      { uploadId: uploadId!, receiverIds: Array.from(selected) },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: () => {
          showAlert('Error', 'Failed to share. Please try again.');
        },
      }
    );
  }

  function handleCopyLink() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Share.share({ url: `https://dreambot.app/post/${uploadId}`, message: 'Check out this dream on DreamBot' });
  }

  return (
    <View style={styles.root}>
      {/* Tap backdrop to dismiss */}
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      {/* Bottom sheet */}
      <Animated.View {...panHandlers} style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Share</Text>
          <TouchableOpacity onPress={handleCopyLink} style={styles.linkButton} activeOpacity={0.7}>
            <View style={styles.linkIcon}>
              <Ionicons name="link-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={styles.linkLabel}>Copy</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search fellow dreamers"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Grid */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.userId}
          numColumns={COLUMNS}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <ViberBubble
              item={item}
              selected={selected.has(item.userId)}
              onToggle={() => toggleViber(item.userId)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              {isLoading ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : search.length > 0 ? (
                <Text style={styles.emptyText}>No matches</Text>
              ) : (
                <>
                  <Ionicons name="people-outline" size={36} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.emptyText}>No friends to share with yet</Text>
                </>
              )}
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />

        {/* Send button — bottom anchored */}
        <View style={[styles.sendRow, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.sendButton, selected.size === 0 && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={selected.size === 0 || isPending}
            activeOpacity={0.7}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={[styles.sendButtonText, selected.size === 0 && styles.sendButtonTextDisabled]}>
                {selected.size > 0 ? `Send to ${selected.size} friend${selected.size > 1 ? 's' : ''}` : 'Select friends to send'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  linkButton: {
    alignItems: 'center',
    gap: 4,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    height: 40,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bubble: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: colors.accent,
  },
  avatarInitial: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  bubbleName: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: CELL_WIDTH - 8,
    textAlign: 'center',
  },
  bubbleNameSelected: {
    color: colors.textPrimary,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    gap: 10,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  sendRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  sendButtonTextDisabled: {
    color: colors.textSecondary,
  },
});
