/**
 * CommentOverlay — inline comment pane that slides over the feed.
 *
 * The dream image animates from full-screen to a small thumbnail at top,
 * and the comment list slides up underneath — Instagram/TikTok style.
 */

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { useComments, type Comment } from '@/hooks/useComments';
import { useAddComment } from '@/hooks/useAddComment';
import { useSearchUsers, type SearchUser } from '@/hooks/useSearchUsers';
import { CommentRow } from '@/components/CommentRow';
import type { DreamPostItem } from '@/components/DreamCard';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMB_SIZE = 72;
const THUMB_MARGIN_TOP = 12;
const MAX_COMMENT_LENGTH = 500;
const ANIM_DURATION = 350;
const EASING = Easing.bezier(0.32, 0.72, 0, 1);

interface Props {
  post: DreamPostItem;
  onClose: () => void;
}

export function CommentOverlay({ post, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);

  // ── Animation ────────────────────────────────────────────────────────────
  // 0 = full-screen image, 1 = thumbnail + comments
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const closing = useRef(false);

  useEffect(() => {
    progress.value = withTiming(1, { duration: ANIM_DURATION, easing: EASING });
  }, []);

  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    progress.value = withTiming(0, { duration: 280, easing: EASING }, () => {
      runOnJS(onClose)();
    });
  }, [onClose]);

  // Swipe down to dismiss
  const panGesture = Gesture.Pan()
    .activeOffsetY([10, 300])
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      if (e.translationY > 0) {
        dragY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100 || e.velocityY > 500) {
        runOnJS(dismiss)();
      } else {
        dragY.value = withTiming(0, { duration: 200 });
      }
    });

  // Top section: image thumbnail row
  const HEADER_HEIGHT = insets.top + THUMB_SIZE + THUMB_MARGIN_TOP * 2 + 16;

  // Image goes from full-screen to a small thumbnail in the top-left
  const imageStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const dy = dragY.value;

    const width = interpolate(p, [0, 1], [SCREEN_WIDTH, THUMB_SIZE * 0.8]);
    const height = interpolate(p, [0, 1], [SCREEN_HEIGHT, THUMB_SIZE]);
    const borderRadius = interpolate(p, [0, 1], [0, 10]);
    const translateX = interpolate(p, [0, 1], [0, 16]);
    const translateY = interpolate(p, [0, 1], [0, insets.top + THUMB_MARGIN_TOP]) + dy * 0.3;

    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width,
      height,
      borderRadius,
      transform: [{ translateX }, { translateY }],
      zIndex: 10,
    };
  });

  // Overlay background
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.6, 1]),
    transform: [{ translateY: dragY.value }],
  }));

  // Comment pane slides up from the bottom
  const paneStyle = useAnimatedStyle(() => {
    const translateY =
      interpolate(progress.value, [0, 1], [SCREEN_HEIGHT, 0]) + dragY.value;
    return {
      transform: [{ translateY }],
    };
  });

  // ── Comments ─────────────────────────────────────────────────────────────
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useComments(post.id);
  const { mutate: addComment, isPending } = useAddComment();
  const comments = useMemo(() => data?.pages.flat() ?? [], [data]);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const mentionStart = useRef(-1);
  const inputRef = useRef<TextInput>(null);
  const { data: mentionResults = [] } = useSearchUsers(mentionQuery);

  function handleTextChange(newText: string) {
    setText(newText.slice(0, MAX_COMMENT_LENGTH));
    const lastAt = newText.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = newText.slice(lastAt + 1);
      const charBefore = lastAt > 0 ? newText[lastAt - 1] : ' ';
      if (
        (charBefore === ' ' || charBefore === '\n' || lastAt === 0) &&
        !afterAt.includes(' ') &&
        afterAt.length >= 1
      ) {
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
    const targetComment = comment.parentId ? { ...comment, id: comment.parentId } : comment;
    setReplyTo(targetComment);
    setText(`@${comment.username} `);
    inputRef.current?.focus();
  }

  function handleSend() {
    const body = text.trim();
    if (!body) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addComment(
      { uploadId: post.id, body, parentId: replyTo?.id },
      {
        onSuccess: () => {
          if (replyTo?.id) setExpandedCommentId(replyTo.id);
          setText('');
          setReplyTo(null);
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setText('');
        },
      }
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dark overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="box-none">
        {/* Tap backdrop to dismiss */}
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT }}
          onPress={dismiss}
          activeOpacity={1}
        />

        {/* Floating thumbnail image */}
        <Animated.View style={imageStyle}>
          <Image
            source={{ uri: post.image_url }}
            style={{ width: '100%', height: '100%', borderRadius: 10 }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>

        {/* Username + close next to thumbnail (fades in) */}
        <Animated.View
          style={[
            styles.thumbMeta,
            { top: insets.top + THUMB_MARGIN_TOP },
            useAnimatedStyle(() => ({
              opacity: interpolate(progress.value, [0.6, 1], [0, 1]),
            })),
          ]}
        >
          <View style={styles.thumbUserRow}>
            {post.avatar_url ? (
              <Image source={{ uri: post.avatar_url }} style={styles.thumbAvatar} />
            ) : (
              <View style={styles.thumbAvatarFallback}>
                <Text style={styles.thumbAvatarText}>
                  {(post.username || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.thumbUsername} numberOfLines={1}>
                {post.username}
              </Text>
              <Text style={styles.thumbCount}>
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={dismiss} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Comment pane */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.pane, { top: HEADER_HEIGHT }, paneStyle]}>
            <KeyboardAvoidingView
              behavior="padding"
              style={{ flex: 1 }}
              keyboardVerticalOffset={HEADER_HEIGHT}
              enabled={Platform.OS === 'ios'}
            >
              {/* Handle */}
              <View style={styles.handleRow}>
                <View style={styles.handle} />
              </View>

              {/* Comments list */}
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <CommentRow
                    comment={item}
                    uploadId={post.id}
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
                        <Ionicons
                          name="chatbubble-outline"
                          size={36}
                          color="rgba(255,255,255,0.15)"
                        />
                        <Text style={styles.emptyTitle}>No comments yet</Text>
                        <Text style={styles.emptySub}>Be the first to say something</Text>
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
                  <Text style={styles.replyText}>
                    Replying to{' '}
                    <Text style={styles.replyUsername}>{replyTo.username ?? 'comment'}</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setReplyTo(null);
                      setText('');
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Mention autocomplete */}
              {mentionQuery.length >= 1 && mentionResults.length > 0 && (
                <View style={styles.mentionList}>
                  {mentionResults.slice(0, 5).map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.mentionRow}
                      onPress={() => completeMention(u)}
                      activeOpacity={0.7}
                    >
                      {u.avatarUrl ? (
                        <Image source={{ uri: u.avatarUrl }} style={styles.mentionAvatar} />
                      ) : (
                        <View style={styles.mentionAvatarFallback}>
                          <Text style={styles.mentionAvatarInitial}>
                            {(u.username || '?')[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.mentionUsername}>{u.username}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Input bar */}
              <View style={[styles.inputBar, { paddingBottom: insets.bottom || 16 }]}>
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
                      style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
                      onPress={handleSend}
                      disabled={!text.trim() || isPending}
                      activeOpacity={0.7}
                    >
                      {isPending ? (
                        <ActivityIndicator color="#000" size="small" />
                      ) : (
                        <Ionicons
                          name="arrow-up"
                          size={18}
                          color={text.trim() ? '#000000' : colors.textSecondary}
                        />
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.signInPrompt}>Sign in to comment</Text>
                )}
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  // ── Thumbnail meta ─────────────────────────────────────────────────────────
  thumbMeta: {
    position: 'absolute',
    left: 16 + THUMB_SIZE * 0.8 + 12,
    right: 16,
    height: THUMB_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 11,
  },
  thumbUserRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumbAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  thumbAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  thumbUsername: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  thumbCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  // ── Comment pane ───────────────────────────────────────────────────────────
  pane: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  emptySub: {
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
  replyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  replyUsername: {
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
  mentionAvatarInitial: {
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
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
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
