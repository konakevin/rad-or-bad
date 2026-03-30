import { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { showAlert } from '@/components/CustomAlert';
import { useVibeSuggestions, type VibeSuggestion } from '@/hooks/useVibeSuggestions';
import { useSendFriendRequest } from '@/hooks/useSendFriendRequest';
import { useRemoveFriend } from '@/hooks/useRemoveFriend';
import { VibeSuggestionRow } from '@/components/VibeSuggestionRow';
import { colors } from '@/constants/theme';

export default function DiscoverVibersScreen() {
  const { data: suggestions = [], isLoading } = useVibeSuggestions();
  const { mutate: sendFriendRequest } = useSendFriendRequest();
  const { mutate: removeFriend } = useRemoveFriend();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  function handleVibe(userId: string, username: string) {
    showAlert(
      'Send Vibe Request?',
      `Send a vibe request to ${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            sendFriendRequest(userId);
            setSentIds((prev) => new Set(prev).add(userId));
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="sparkles" size={20} color="#FFD700" />
            <View>
              <Text style={styles.headerTitle}>Discover Vibers</Text>
              <Text style={styles.subtitle}>People who vote like you</Text>
            </View>
          </View>
        </View>
        <View style={styles.backButton} />
      </View>

      <FlatList<VibeSuggestion>
        data={suggestions}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <VibeSuggestionRow
            suggestion={item}
            localSent={sentIds.has(item.userId)}
            onStartVibing={(id) => handleVibe(id, item.username)}
            onCancelRequest={(id) => {
              removeFriend(id);
              setSentIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>No suggestions yet</Text>
                <Text style={styles.emptySubtitle}>
                  Keep voting to find people who share your vibes!
                </Text>
              </>
            )}
          </View>
        }
        contentContainerStyle={suggestions.length === 0 ? styles.emptyList : undefined}
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
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyList: { flex: 1 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
