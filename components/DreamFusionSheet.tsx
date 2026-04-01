/**
 * DreamFusionSheet — bottom sheet for fusing dreams or dreaming in another's style.
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';
import { MASCOT_URLS } from '@/constants/mascots';
import { Toast } from '@/components/Toast';
import { showAlert } from '@/components/CustomAlert';
import { useSparkleBalance, useSpendSparkles } from '@/hooks/useSparkles';
import { useDreamFusion } from '@/hooks/useDreamFusion';
import { useFeedStore, type PinnedPost } from '@/store/feed';

const FUSE_COST = 3;
const STYLE_COST = 2;

interface Props {
  visible: boolean;
  onClose: () => void;
  sourcePostId: string;
  sourcePrompt: string;
  sourceImageUrl: string;
  sourceUsername: string;
}

export function DreamFusionSheet({ visible, onClose, sourcePostId, sourcePrompt, sourceImageUrl, sourceUsername }: Props) {
  const { data: balance = 0 } = useSparkleBalance();
  const { mutateAsync: spend } = useSpendSparkles();
  const { mutateAsync: fuse, isPending } = useDreamFusion();
  const [mode, setMode] = useState<'pick' | 'generating' | 'done'>('pick');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const setPinnedPost = useFeedStore((s) => s.setPinnedPost);

  async function handleFuse(fusionMode: 'fuse' | 'style') {
    const cost = fusionMode === 'fuse' ? FUSE_COST : STYLE_COST;

    if (balance < cost) {
      showAlert('Not enough sparkles', `You need ${cost}✨ but have ${balance}✨`, [
        { text: 'OK' },
      ]);
      return;
    }

    try {
      // Spend first
      await spend({ amount: cost, reason: `dream_${fusionMode}`, referenceId: sourcePostId });

      setMode('generating');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await fuse({ mode: fusionMode, sourcePostId, sourcePrompt });

      setResultUrl(result.imageUrl);
      setResultId(result.uploadId ?? null);
      setMode('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setMode('pick');
      const msg = (err as Error).message;
      if (msg === 'Not enough sparkles') {
        showAlert('Not enough sparkles', `You need ${cost}✨ but have ${balance}✨`);
      } else {
        Toast.show('Dream fusion failed', 'close-circle');
      }
    }
  }

  function handleViewDream() {
    onClose();
    if (resultId) {
      router.push(`/photo/${resultId}`);
    }
  }

  function handleGoToFeed() {
    if (resultUrl && resultId) {
      setPinnedPost({
        id: resultId,
        user_id: '',
        image_url: resultUrl,
        caption: null,
        username: '',
        avatar_url: null,
        is_ai_generated: true,
        created_at: new Date().toISOString(),
        comment_count: 0,
      });
    }
    onClose();
    setMode('pick');
    setResultUrl(null);
    router.navigate('/(tabs)');
  }

  function handleClose() {
    onClose();
    setMode('pick');
    setResultUrl(null);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <Pressable style={s.overlay} onPress={isPending ? undefined : handleClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />

          {mode === 'pick' && (
            <>
              <Image source={{ uri: sourceImageUrl }} style={s.sourceThumb} contentFit="cover" />

              <Text style={s.title}>Dream Fusion</Text>
              <Text style={s.subtitle}>
                Blend @{sourceUsername}'s dream with your Dream Bot
              </Text>

              <View style={s.balanceRow}>
                <Ionicons name="sparkles" size={16} color={colors.accent} />
                <Text style={s.balanceText}>{balance} sparkles</Text>
              </View>

              <TouchableOpacity
                style={s.optionCard}
                onPress={() => handleFuse('fuse')}
                activeOpacity={0.7}
              >
                <View style={s.optionIcon}>
                  <Ionicons name="git-merge" size={22} color={colors.accent} />
                </View>
                <View style={s.optionText}>
                  <Text style={s.optionTitle}>Fuse Dreams</Text>
                  <Text style={s.optionSub}>Combine this dream with yours into something new</Text>
                </View>
                <View style={s.costBadge}>
                  <Text style={s.costText}>{FUSE_COST}✨</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.optionCard}
                onPress={() => handleFuse('style')}
                activeOpacity={0.7}
              >
                <View style={s.optionIcon}>
                  <Ionicons name="color-wand" size={22} color={colors.accent} />
                </View>
                <View style={s.optionText}>
                  <Text style={s.optionTitle}>Dream in this style</Text>
                  <Text style={s.optionSub}>Your Dream Bot dreams using this style</Text>
                </View>
                <View style={s.costBadge}>
                  <Text style={s.costText}>{STYLE_COST}✨</Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          {mode === 'generating' && (
            <View style={s.loadingWrap}>
              <Image source={{ uri: MASCOT_URLS[2] }} style={s.mascot} contentFit="cover" />
              <Text style={s.loadingTitle}>Fusing dreams...</Text>
              <Text style={s.loadingSub}>Your Dream Bot is blending two worlds together</Text>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}

          {mode === 'done' && resultUrl && (
            <View style={s.resultWrap}>
              <Text style={s.resultTitle}>A new dream is born ✨</Text>
              <Image source={{ uri: resultUrl }} style={s.resultImage} contentFit="cover" />
              <TouchableOpacity style={s.viewButton} onPress={handleViewDream} activeOpacity={0.7}>
                <Text style={s.viewButtonText}>View Dream</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.secondaryBtn} onPress={handleGoToFeed} activeOpacity={0.7}>
                <Text style={s.secondaryBtnText}>Go to Feed</Text>
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
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, alignItems: 'center', gap: 14,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 4,
  },
  sourceThumb: {
    width: 60, height: 80, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    padding: 16, gap: 14,
  },
  optionIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentBg,
    alignItems: 'center', justifyContent: 'center',
  },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  optionSub: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  costBadge: {
    backgroundColor: colors.accentBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  costText: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  loadingWrap: { alignItems: 'center', gap: 14, paddingVertical: 20 },
  mascot: { width: 100, height: 100, borderRadius: 24 },
  loadingTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  loadingSub: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  resultWrap: { alignItems: 'center', gap: 14, width: '100%' },
  resultTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  resultImage: {
    width: '100%', height: 280, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
  },
  viewButton: {
    backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, width: '100%',
    alignItems: 'center',
  },
  viewButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 8 },
  secondaryBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
