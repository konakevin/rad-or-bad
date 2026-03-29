import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/auth';
import { useReplies } from '@/hooks/useReplies';
import { useToggleCommentLike } from '@/hooks/useToggleCommentLike';
import { useDeleteComment } from '@/hooks/useDeleteComment';
import type { Comment } from '@/hooks/useComments';
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

interface CommentRowProps {
  comment: Comment;
  uploadId: string;
  isReply?: boolean;
  onReply: (comment: Comment) => void;
  expandedCommentId?: string | null;
}

export function CommentRow({ comment, uploadId, isReply = false, onReply, expandedCommentId }: CommentRowProps) {
  const currentUser = useAuthStore((s) => s.user);
  const isOwn = currentUser?.id === comment.userId;
  const [showReplies, setShowReplies] = useState(expandedCommentId === comment.id);

  // Auto-expand when a reply is posted to this comment
  useEffect(() => {
    if (expandedCommentId === comment.id) setShowReplies(true);
  }, [expandedCommentId, comment.id]);
  const { data: replies = [] } = useReplies(comment.id, showReplies && !isReply);
  const { mutate: toggleLike } = useToggleCommentLike();
  const { mutate: deleteComment } = useDeleteComment();

  function handleLike() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike({
      commentId: comment.id,
      uploadId,
      parentId: comment.parentId,
      currentlyLiked: comment.isLiked,
    });
  }

  function handleLongPress() {
    if (!isOwn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteComment({ commentId: comment.id, uploadId, parentId: comment.parentId }),
      },
    ]);
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.row, isReply && styles.replyRow]}
        onLongPress={handleLongPress}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <TouchableOpacity onPress={() => router.push(`/user/${comment.userId}`)} activeOpacity={0.7}>
          {comment.avatarUrl ? (
            <Image source={{ uri: comment.avatarUrl }} style={[styles.avatar, isReply && styles.replyAvatar]} />
          ) : (
            <View style={[styles.avatarFallback, isReply && styles.replyAvatar]}>
              <Text style={styles.avatarText}>{comment.username[0].toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.headerLine}>
            <Text style={styles.username}>{comment.username}</Text>
            <Text style={styles.time}>  {formatTimeAgo(comment.createdAt)}</Text>
          </Text>
          <Text style={styles.commentText}>{comment.body}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => onReply(comment)} hitSlop={8}>
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Like */}
        <TouchableOpacity style={styles.likeButton} onPress={handleLike} hitSlop={8}>
          <Ionicons
            name={comment.isLiked ? 'heart' : 'heart-outline'}
            size={16}
            color={comment.isLiked ? '#FF4500' : 'rgba(255,255,255,0.4)'}
          />
          {comment.likeCount > 0 && (
            <Text style={[styles.likeCount, comment.isLiked && styles.likeCountActive]}>
              {comment.likeCount}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Replies toggle + list */}
      {!isReply && comment.replyCount > 0 && (
        <View style={styles.repliesContainer}>
          <TouchableOpacity
            style={styles.repliesToggle}
            onPress={() => setShowReplies(!showReplies)}
            activeOpacity={0.7}
          >
            <View style={styles.repliesLine} />
            <Text style={styles.repliesToggleText}>
              {showReplies ? 'Hide replies' : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
            </Text>
          </TouchableOpacity>

          {showReplies && replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              uploadId={uploadId}
              isReply
              onReply={onReply}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  replyRow: {
    paddingLeft: 48,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  replyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  time: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  commentText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  likeButton: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 4,
  },
  likeCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  likeCountActive: {
    color: '#FF4500',
  },
  repliesContainer: {
    paddingLeft: 0,
  },
  repliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 58,
    paddingVertical: 6,
    gap: 6,
  },
  repliesLine: {
    width: 12,
    height: 1,
    backgroundColor: colors.textSecondary,
  },
  repliesToggleText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
