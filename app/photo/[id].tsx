import { useState, useRef, useMemo } from 'react';
import { View, FlatList, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';
import { useAlbumStore } from '@/store/album';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FullScreenFeed } from '@/components/FullScreenFeed';
import type { DreamPostItem } from '@/components/DreamCard';
import { colors } from '@/constants/theme';

/** Fetch a single post + user info */
function useAlbumPosts(albumIds: string[], currentId: string) {
  return useQuery({
    queryKey: ['albumPosts', albumIds.join(','), currentId],
    queryFn: async (): Promise<DreamPostItem[]> => {
      if (albumIds.length === 0) {
        // Single post — no album
        const { data, error } = await supabase
          .from('uploads')
          .select('id, user_id, image_url, caption, created_at, is_ai_generated, comment_count, like_count, from_wish, recipe_id, ai_prompt, twin_count, fuse_count, twin_of, fuse_of, users!inner(username, avatar_url)')
          .eq('id', currentId)
          .single();
        if (error) throw error;
        const u = data.users as Record<string, unknown>;
        return [{
          id: data.id,
          user_id: data.user_id,
          image_url: data.image_url,
          caption: data.caption,
          username: u.username as string,
          avatar_url: u.avatar_url as string | null,
          is_ai_generated: data.is_ai_generated ?? false,
          created_at: data.created_at,
          comment_count: data.comment_count ?? 0,
          like_count: data.like_count ?? 0,
          from_wish: data.from_wish ?? null,
          recipe_id: data.recipe_id ?? null,
          ai_prompt: data.ai_prompt ?? null,
          twin_count: data.twin_count ?? 0,
          fuse_count: data.fuse_count ?? 0,
          twin_of: data.twin_of ?? null,
          fuse_of: data.fuse_of ?? null,
        }];
      }

      // Album — fetch all posts in order
      const { data, error } = await supabase
        .from('uploads')
        .select('id, user_id, image_url, caption, created_at, is_ai_generated, comment_count, like_count, from_wish, recipe_id, ai_prompt, twin_count, fuse_count, twin_of, fuse_of, users!inner(username, avatar_url)')
        .in('id', albumIds)
        .eq('is_active', true);
      if (error) throw error;

      // Sort by album order
      const orderMap = new Map(albumIds.map((id, i) => [id, i]));
      return (data ?? [])
        .map((row: Record<string, unknown>) => {
          const u = row.users as Record<string, unknown>;
          return {
            id: row.id as string,
            user_id: row.user_id as string,
            image_url: row.image_url as string,
            caption: row.caption as string | null,
            username: u.username as string,
            avatar_url: u.avatar_url as string | null,
            is_ai_generated: (row.is_ai_generated as boolean) ?? false,
            created_at: row.created_at as string,
            comment_count: (row.comment_count as number) ?? 0,
            like_count: (row.like_count as number) ?? 0,
            from_wish: (row.from_wish as string | null) ?? null,
            recipe_id: (row.recipe_id as string | null) ?? null,
            ai_prompt: (row.ai_prompt as string | null) ?? null,
            twin_count: (row.twin_count as number) ?? 0,
            fuse_count: (row.fuse_count as number) ?? 0,
            twin_of: (row.twin_of as string | null) ?? null,
            fuse_of: (row.fuse_of as string | null) ?? null,
          };
        })
        .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    },
    enabled: true,
    staleTime: 60_000,
  });
}

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const albumIds = useAlbumStore((s) => s.ids);
  const { translateX, panHandlers } = useSwipeBack();

  const { data: posts = [], isLoading } = useAlbumPosts(albumIds, id);

  // Find initial index for the tapped post
  const initialIndex = useMemo(() => {
    const idx = posts.findIndex((p) => p.id === id);
    return idx >= 0 ? idx : 0;
  }, [posts, id]);

  return (
    <Animated.View {...panHandlers} style={[s.root, { transform: [{ translateX }] }]}>
      <StatusBar hidden />
      <TouchableOpacity style={s.backButton} onPress={() => router.back()} hitSlop={12}>
        <View style={s.backCircle}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      <FullScreenFeed
        posts={posts}
        isLoading={isLoading}
        initialIndex={initialIndex}
        disableSwipeToProfile
        hideTabBar
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  backButton: { position: 'absolute', top: 54, left: 16, zIndex: 10 },
  backCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
});
