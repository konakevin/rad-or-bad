import { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator,
  StyleSheet, Dimensions, Pressable, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/auth';
import { useComments, type Comment } from '@/hooks/useComments';
import { useAddComment } from '@/hooks/useAddComment';
import { useSearchUsers, type SearchUser } from '@/hooks/useSearchUsers';
import { CommentRow } from '@/components/CommentRow';
import { useSheetDismiss } from '@/hooks/useSheetDismiss';
import { colors } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const MAX_COMMENT_LENGTH = 500;

export default function CommentsScreen() {
  const { uploadId, postOwnerId } = useLocalSearchParams<{ uploadId: string; postOwnerId?: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useComments(uploadId ?? '');
  const { mutate: addComment, isPending } = useAddComment();
  const { translateY, panHandlers } = useSheetDismiss();

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const mentionStart = useRef(-1);
  const inputRef = useRef<TextInput>(null);

  const comments = useMemo(() => data?.pages.flat() ?? [], [data]);
  const { data: mentionResults = [] } = useSearchUsers(mentionQuery);

  function handleTextChange(newText: string) {
    setText(newText.slice(0, MAX_COMMENT_LENGTH));

    // Detect @mention in progress
    const cursorPos = newText.length;
    const lastAt = newText.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = newText.slice(lastAt + 1);
      // Only trigger if @ is at start or preceded by a space, and no space after
      const charBefore = lastAt > 0 ? newText[lastAt - 1] : ' ';
      if ((charBefore === ' ' || charBefore === '\n' || lastAt === 0) && !afterAt.includes(' ') && afterAt.length >= 1) {
        mentionStart.current = lastAt;
        setMentionQuery(afterAt);
        return;
      }
    }
    mentionStart.current = -1;
    setMentionQuery('');
  }

  function completeMention(user: SearchUser) {
    if (mentionStart.current < 0) return;
    const before = text.slice(0, mentionStart.current);
    const after = text.slice(mentionStart.current + 1 + mentionQuery.length);
    setText(`${before}@${user.username} ${after}`);
    mentionStart.current = -1;
    setMentionQuery('');
  }

  function handleReply(comment: Comment) {
    // If it's a reply, reply to its parent instead (keep flat)
    const targetComment = comment.parentId ? { ...comment, id: comment.parentId } : comment;
    setReplyTo(targetComment);
    setText(`@${comment.username} `);
    inputRef.current?.focus();
  }

  function handleSend() {
    const body = text.trim();
    if (!body || !uploadId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addComment(
      {
        uploadId,
        body,
        parentId: replyTo?.id,
      },
      {
        onSuccess: () => {
          if (replyTo?.id) setExpandedCommentId(replyTo.id);
          setText('');
          setReplyTo(null);
        },
        onError: (err) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          // Show the moderation message inline instead of alert
          setText('');
        },
      },
    );
  }

  function cancelReply() {
    setReplyTo(null);
    setText('');
  }

  return (
    <View style={styles.root}>
      {/* Tap backdrop to dismiss */}
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      {/* Bottom sheet */}
      <Animated.View {...panHandlers} style={[styles.sheet, { transform: [{ translateY }] }]}>
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={SCREEN_HEIGHT - SHEET_HEIGHT}
        enabled={Platform.OS === 'ios'}
      >
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Comments</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Comments list */}
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommentRow
              comment={item}
              uploadId={uploadId!}
              postOwnerId={postOwnerId}
              onReply={handleReply}
              expandedCommentId={expandedCommentId}
            />
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
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
                  <Ionicons name="chatbubble-outline" size={36} color="rgba(255,255,255,0.15)" />
                  <Text style={styles.emptyTitle}>No comments yet</Text>
                  <Text style={styles.emptySubtitle}>Be the first to say something</Text>
                </>
              )}
            </View>
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        />

        {/* Reply indicator */}
        {replyTo && (
          <View style={styles.replyBar}>
            <Text style={styles.replyBarText}>
              Replying to <Text style={styles.replyBarUsername}>{replyTo.username ?? 'comment'}</Text>
            </Text>
            <TouchableOpacity onPress={cancelReply} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Mention autocomplete */}
        {mentionQuery.length >= 1 && mentionResults.length > 0 && (
          <View style={styles.mentionList}>
            {mentionResults.slice(0, 5).map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.mentionRow}
                onPress={() => completeMention(user)}
                activeOpacity={0.7}
              >
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.mentionAvatar} />
                ) : (
                  <View style={styles.mentionAvatarFallback}>
                    <Text style={styles.mentionAvatarText}>{user.username[0].toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.mentionUsername}>{user.username}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          {currentUser ? (
            <>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textSecondary}
                value={text}
                onChangeText={handleTextChange}
                multiline
                maxLength={MAX_COMMENT_LENGTH}
              />
              <TouchableOpacity
                style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!text.trim() || isPending}
                activeOpacity={0.7}
              >
                {isPending ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color={text.trim() ? '#000000' : colors.textSecondary} style={{ marginTop: -1 }} />
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.signInPrompt}>Sign in to comment</Text>
          )}
        </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  listContent: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  replyBarText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  replyBarUsername: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  mentionList: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    maxHeight: 200,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.card,
  },
  mentionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  mentionAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionAvatarText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  mentionUsername: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 16,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    maxHeight: 80,
    lineHeight: 20,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  signInPrompt: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
