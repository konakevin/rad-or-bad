import { useState, useEffect, useRef, useCallback } from 'react';
import type { FeedItem } from '@/hooks/useFeed';
import type { PendingPost } from '@/store/feed';
import { useFeedStore } from '@/store/feed';

/**
 * Manages the card deck — loading feed data, merging, voting, dismissing.
 *
 * Owns: deck, sessionVotes, loadedFeedKey, pending post injection.
 * Does NOT own: milestones, streaks, feed selection.
 */
export function useFeedDeck(feed: FeedItem[], currentUserId: string | undefined) {
  const [deck, setDeck] = useState<FeedItem[]>([]);
  const [sessionVotes, setSessionVotes] = useState<Map<string, 'rad' | 'bad'>>(new Map());
  const [resetCounter, setResetCounter] = useState(0);
  const loadedFeedKey = useRef('');
  const sessionVotesRef = useRef(sessionVotes);

  const pendingPost = useFeedStore((s) => s.pendingPost);
  const setPendingPost = useFeedStore((s) => s.setPendingPost);
  const resetToken = useFeedStore((s) => s.resetToken);

  // Keep ref in sync
  useEffect(() => { sessionVotesRef.current = sessionVotes; }, [sessionVotes]);

  // When a new upload happens, wipe the deck
  useEffect(() => {
    if (resetToken === 0) return;
    loadedFeedKey.current = '';
    setDeck([]);
    setSessionVotes(new Map());
  }, [resetToken]);

  // Prepend pending post (own upload)
  useEffect(() => {
    if (!pendingPost) return;
    setDeck((prev) => {
      if (prev.some((d) => d.id === pendingPost.id)) return prev;
      return [pendingPost as FeedItem, ...prev];
    });
    setPendingPost(null);
  }, [pendingPost]);

  // Merge feed data into deck
  useEffect(() => {
    const newKey = feed.map((f) => f.id).join(',');
    if (newKey && newKey !== loadedFeedKey.current) {
      loadedFeedKey.current = newKey;
      const feedIds = new Set(feed.map((f) => f.id));
      setDeck((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        const voted = sessionVotesRef.current;
        const external = useFeedStore.getState().externalVotes;
        // Filter out posts voted in this session OR externally (photo detail, other feeds)
        const freshItems = feed.filter((f) =>
          !existingIds.has(f.id) && !voted.has(f.id) && !external.has(f.id)
        );
        const retained = prev.filter((item) =>
          feedIds.has(item.id) ||
          voted.has(item.id) ||
          item.user_id === currentUserId
        );
        return [...retained, ...freshItems];
      });
    }
  }, [feed, resetCounter]);

  // Computed: top card + 2 unvoted behind it
  // Externally-voted posts (photo detail, other feeds) are invisible — skip them.
  // Session-voted posts stay briefly (score animation + auto-dismiss).
  const externalVotes = useFeedStore((s) => s.externalVotes);
  const playableDeck = deck.filter((item) =>
    !externalVotes.has(item.id) || sessionVotes.has(item.id)
  );
  const topCard = playableDeck[0];
  const behindCards = playableDeck.slice(1).filter((item) => !sessionVotes.has(item.id)).slice(0, 2);
  const topCards = topCard ? [topCard, ...behindCards] : [];
  const topItem = topCards[0];
  const topItemVoted = topItem ? sessionVotes.has(topItem.id) : false;

  const recordVote = useCallback((itemId: string, vote: 'rad' | 'bad') => {
    setSessionVotes((prev) => new Map(prev).set(itemId, vote));
  }, []);

  const dismissCard = useCallback((itemId: string) => {
    setDeck((prev) => prev.filter((c) => c.id !== itemId));
  }, []);

  const updateItem = useCallback((itemId: string, updates: Partial<FeedItem>) => {
    setDeck((prev) => prev.map((item) => item.id === itemId ? { ...item, ...updates } : item));
  }, []);

  const resetDeck = useCallback(() => {
    loadedFeedKey.current = '';
    setDeck([]);
    setResetCounter((c) => c + 1); // force feed merge effect to re-run
  }, []);

  return {
    deck,
    topCards,
    topItem,
    topItemVoted,
    sessionVotes,
    recordVote,
    dismissCard,
    updateItem,
    resetDeck,
  };
}
