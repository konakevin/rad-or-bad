import { useMemo } from 'react';
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

function NotificationRow({ item, onPress, onDelete }: { item: NotificationItem; onPress: () => void; onDelete: () => void }) {
  const { action, preview } = getNotificationText(item);

  function handleLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  }

  return (
    <TouchableOpacity
      style={[styles.row, !item.isSeen && styles.rowUnseen]}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      delayLongPress={400}
    >
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

      {/* Post thumbnail */}
      {item.imageUrl && (
        <Image
          source={{ uri: item.thumbnailUrl ?? item.imageUrl }}
          style={styles.thumbnail}
          contentFit="cover"
        />
      )}

      {/* Time + unseen dot */}
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

  const inbox = useMemo(() => data?.pages.flat() ?? [], [data]);
  const hasUnread = inbox.some((item) => !item.isSeen);

  function handleTap(item: NotificationItem) {
    if (!item.isSeen) {
      markSeen(item.id);
    }
    // All notification types navigate to the post
    if (item.uploadId) {
      router.push(`/photo/${item.uploadId}`);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox</Text>
        {hasUnread && (
          <TouchableOpacity onPress={() => markAllSeen()} activeOpacity={0.7} hitSlop={8}>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
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
  markAllRead: {
    color: '#FFD700',
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
    backgroundColor: '#FFD700',
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
