/**
 * Dream Post — shared logic for posting AI-generated dreams and pinning to feed.
 */

import { supabase } from '@/lib/supabase';
import { useFeedStore } from '@/store/feed';

interface PostDreamOpts {
  userId: string;
  imageUrl: string;
  prompt: string;
  recipeId?: string | null;
  fromWish?: string | null;
}

/**
 * Insert a dream post into the uploads table.
 * Returns the upload ID.
 */
export async function postDream(opts: PostDreamOpts): Promise<string> {
  const caption = opts.prompt.length > 200 ? opts.prompt.slice(0, 197) + '...' : opts.prompt;

  const { data, error } = await supabase.from('uploads').insert({
    user_id: opts.userId,
    image_url: opts.imageUrl,
    media_type: 'image',
    categories: ['art'],
    caption,
    is_active: true,
    is_approved: true,
    is_moderated: true,
    is_ai_generated: true,
    ai_prompt: opts.prompt,
    total_votes: 0,
    rad_votes: 0,
    bad_votes: 0,
    width: 768,
    height: 1664,
    from_wish: opts.fromWish ?? null,
    recipe_id: opts.recipeId ?? null,
  }).select('id').single();

  if (error) throw error;
  return data.id;
}

interface PinToFeedOpts {
  id: string;
  userId: string;
  imageUrl: string;
  caption?: string | null;
  username: string;
  avatarUrl: string | null;
}

/**
 * Pin a post to the home feed so it appears as the first card.
 */
export function pinToFeed(opts: PinToFeedOpts) {
  useFeedStore.getState().setPinnedPost({
    id: opts.id,
    user_id: opts.userId,
    image_url: opts.imageUrl,
    caption: opts.caption ?? null,
    username: opts.username,
    avatar_url: opts.avatarUrl,
    is_ai_generated: true,
    created_at: new Date().toISOString(),
    comment_count: 0,
  });
}
