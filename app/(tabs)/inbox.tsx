import { showAlert } from '@/components/CustomAlert';
import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useInbox, type NotificationItem } from '@/hooks/useInbox';
import { useMarkShareSeen } from '@/hooks/useMarkShareSeen';
import { useDeleteShare } from '@/hooks/useDeleteShare';
import { useMarkAllSeen } from '@/hooks/useMarkAllSeen';
import { useDeleteAllNotifications } from '@/hooks/useDeleteAllNotifications';
import { useRespondFriendRequest } from '@/hooks/useRespondFriendRequest';
import { colors } from '@/constants/theme';

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function getNotificationText(item: NotificationItem): { action: string; preview: string | null } {
  switch (item.type) {
    case 'post_share':
      return { action: 'sent you a post', preview: null };
    case 'post_comment':
      return { action: 'commented on your post', preview: item.body };
    case 'comment_reply':
      return { action: 'replied to your comment', preview: item.body };
    case 'comment_mention':
      return { action: 'mentioned you', preview: item.body };
    case 'friend_request':
      return { action: 'wants to dream with you', preview: null };
    case 'friend_accepted':
      return { action: 'accepted your dream request', preview: null };
    case 'post_milestone':
      return { action: 'Your post hit ' + (item.body ?? 'a milestone!'), preview: null };
    default:
      return { action: '', preview: null };
  }
}

function getNotificationIcon(type: NotificationItem['type']): string {
  switch (type) {
    case 'post_share': return 'paper-plane';
    case 'post_comment': return 'chatbubble';
    case 'comment_reply': return 'arrow-undo';
    case 'comment_mention': return 'at';
    default: return 'notifications';
  }
}

function NotificationRow({ item, onPress, onDelete, selectMode, isSelected, onToggleSelect, onAcceptDream, onDeclineDream, dreamAccepted }: {
  item: NotificationItem; onPress: () => void; onDelete: () => void;
  selectMode: boolean; isSelected: boolean; onToggleSelect: () => void;
  onAcceptDream?: () => void; onDeclineDream?: () => void;
  dreamAccepted?: boolean;
}) {
  const { action, preview } = getNotificationText(item);

  return (
    <TouchableOpacity
      style={[styles.row, !item.isSeen && styles.rowUnseen]}
      onPress={selectMode ? onToggleSelect : onPress}
      onLongPress={selectMode ? undefined : () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showAlert('Delete', 'Remove this item?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ]);
      }}
      delayLongPress={400}
      activeOpacity={0.7}
    >
      {/* Checkbox in select mode */}
      {selectMode && (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={14} color="#000" />}
        </View>
      )}

      {/* Actor avatar */}
      {item.actorAvatarUrl ? (
        <Image source={{ uri: item.actorAvatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>{item.actorUsername[0].toUpperCase()}</Text>
        </View>
      )}

      {/* Text */}
      <View style={styles.textCol}>
        <Text style={styles.mainLine} numberOfLines={2}>
          <Text style={styles.actorName}>{item.actorUsername}</Text>
          <Text style={styles.actionText}> {action}</Text>
        </Text>
        {preview && (
          <Text style={styles.preview} numberOfLines={1}>"{preview}"</Text>
        )}
      </View>

      {/* Accept/Decline for friend requests */}
      {item.type === 'friend_request' && !selectMode && (
        dreamAccepted ? (
          <View style={styles.dreamersBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAA64" />
            <Text style={styles.dreamersBadgeText}>Dreamers</Text>
          </View>
        ) : onAcceptDream ? (
          <View style={styles.dreamActions}>
            <TouchableOpacity style={styles.acceptDreamButton} onPress={onAcceptDream} activeOpacity={0.7} hitSlop={4}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineDreamButton} onPress={onDeclineDream} activeOpacity={0.7} hitSlop={4}>
              <Ionicons name="close" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : null
      )}

      {/* Post thumbnail */}
      {item.imageUrl && (
        <Image
          source={{ uri: item.thumbnailUrl ?? item.imageUrl }}
          style={styles.thumbnail}
          contentFit="cover"
        />
      )}

      {/* Time + delete */}
      <View style={styles.timeCol}>
        <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
        {!item.isSeen && <View style={styles.unseenDot} />}
      </View>

    </TouchableOpacity>
  );
}

export default function InboxScreen() {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInbox();
  const { mutate: markSeen } = useMarkShareSeen();
  const { mutate: deleteNotification } = useDeleteShare();
  const { mutate: markAllSeen } = useMarkAllSeen();
  const { mutate: deleteAll } = useDeleteAllNotifications();
  const { mutate: respondRequest } = useRespondFriendRequest();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allSelectedGlobal, setAllSelectedGlobal] = useState(false);
  const [acceptedDreamIds, setAcceptedDreamIds] = useState<Set<string>>(new Set());

  const inbox = useMemo(() => data?.pages.flat() ?? [], [data]);
  const hasUnread = inbox.some((item) => !item.isSeen);
  const hasAny = inbox.length > 0;
  const allSelected = hasAny && selected.size === inbox.length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelectedGlobal) {
      setAllSelectedGlobal(false);
      setSelected(new Set());
    } else {
      setAllSelectedGlobal(true);
      setSelected(new Set(inbox.map((item) => item.id)));
    }
  }

  function deleteSelected() {
    if (allSelectedGlobal) {
      // Delete ALL notifications server-side, not just loaded ones
      deleteAll();
    } else {
      for (const id of selected) {
        deleteNotification(id);
      }
    }
    setSelected(new Set());
    setAllSelectedGlobal(false);
    setSelectMode(false);
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
    setAllSelectedGlobal(false);
  }

  function handleTap(item: NotificationItem) {
    if (!item.isSeen) {
      markSeen(item.id);
    }
    // Friend notifications → profile, everything else → post
    if (item.type === 'friend_request' || item.type === 'friend_accepted') {
      router.push(`/user/${item.actorId}`);
    } else if (item.uploadId) {
      router.push(`/photo/${item.uploadId}`);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {selectMode ? (
          <>
            <TouchableOpacity onPress={exitSelectMode} activeOpacity={0.7}>
              <Text style={styles.headerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{allSelectedGlobal ? 'All' : selected.size} selected</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={toggleSelectAll} activeOpacity={0.7} hitSlop={8}>
                <Text style={styles.selectAllText}>{allSelectedGlobal ? 'Deselect all' : 'Select all'}</Text>
              </TouchableOpacity>
              {(selected.size > 0 || allSelectedGlobal) && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      if (allSelectedGlobal) {
                        markAllSeen();
                      } else {
                        for (const id of selected) markSeen(id);
                      }
                      setSelected(new Set());
                      setAllSelectedGlobal(false);
                      setSelectMode(false);
                    }}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <Ionicons name="checkmark-done" size={20} color={colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const label = allSelectedGlobal ? 'all' : `${selected.size}`;
                      showAlert(`Delete ${label} notifications?`, 'This cannot be undone.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: deleteSelected },
                      ]);
                    }}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <Ionicons name="trash" size={20} color="#F4212E" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.headerTitle}>Inbox</Text>
            <View style={styles.headerActions}>
              {hasUnread && (
                <TouchableOpacity onPress={() => markAllSeen()} activeOpacity={0.7} hitSlop={8}>
                  <Text style={styles.markAllRead}>Mark all read</Text>
                </TouchableOpacity>
              )}
              {hasAny && (
                <TouchableOpacity onPress={() => setSelectMode(true)} activeOpacity={0.7} hitSlop={8}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>

      <FlatList
        data={inbox}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            onPress={() => handleTap(item)}
            onDelete={() => deleteNotification(item.id)}
            selectMode={selectMode}
            isSelected={selected.has(item.id)}
            onToggleSelect={() => toggleSelect(item.id)}
            dreamAccepted={acceptedDreamIds.has(item.id)}
            onAcceptDream={item.type === 'friend_request' ? () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              respondRequest({ requesterId: item.actorId, accept: true });
              setAcceptedDreamIds((prev) => new Set(prev).add(item.id));
            } : undefined}
            onDeclineDream={item.type === 'friend_request' ? () => {
              respondRequest({ requesterId: item.actorId, accept: false });
              deleteNotification(item.id);
            } : undefined}
          />
        )}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <>
                <Ionicons name="notifications-outline" size={40} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyTitle}>All caught up</Text>
                <Text style={styles.emptySubtitle}>Comments, replies, and shares will show up here</Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  markAllRead: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.card,
    gap: 12,
  },
  rowUnseen: {
    backgroundColor: 'rgba(255,215,0,0.04)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  textCol: {
    flex: 1,
    gap: 2,
  },
  mainLine: {
    fontSize: 14,
    lineHeight: 19,
  },
  actorName: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  actionText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  preview: {
    color: colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  timeCol: {
    alignItems: 'center',
    gap: 4,
    minWidth: 28,
  },
  time: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  unseenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  headerCancel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  selectAllText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  editText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  dreamActions: {
    flexDirection: 'row',
    gap: 6,
  },
  acceptDreamButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineDreamButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dreamersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dreamersBadgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  trashButton: {
    padding: 4,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
