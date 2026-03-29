import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export type StatsTab = 'posts' | 'friends' | 'followers' | 'following' | 'streaks';

interface Props {
  postCount: number;
  friendCount: number;
  followerCount: number;
  followingCount: number;
  activeTab: StatsTab;
  onTabChange: (tab: StatsTab) => void;
  pendingCount?: number;
  hiddenTabs?: StatsTab[];
}

export function ProfileStatsRow({ postCount, friendCount, followerCount, followingCount, activeTab, onTabChange, pendingCount = 0, hiddenTabs = [] }: Props) {
  const hidden = new Set(hiddenTabs);
  return (
    <View style={styles.statsRow}>
      <TouchableOpacity style={styles.stat} onPress={() => onTabChange('posts')} activeOpacity={0.7}>
        <Text style={styles.statNumber}>{postCount}</Text>
        <Text style={[styles.statLabel, activeTab === 'posts' && styles.statLabelActive]}>Posts</Text>
      </TouchableOpacity>
      {!hidden.has('friends') && (
        <>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.stat} onPress={() => onTabChange('friends')} activeOpacity={0.7}>
            <View style={styles.statWithBadge}>
              <Text style={styles.statNumber}>{friendCount}</Text>
              {pendingCount > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.statLabel, activeTab === 'friends' && styles.statLabelActive]}>Friends</Text>
          </TouchableOpacity>
        </>
      )}
      <View style={styles.statDivider} />
      <TouchableOpacity style={styles.stat} onPress={() => onTabChange('followers')} activeOpacity={0.7}>
        <Text style={styles.statNumber}>{followerCount}</Text>
        <Text style={[styles.statLabel, activeTab === 'followers' && styles.statLabelActive]}>Followers</Text>
      </TouchableOpacity>
      <View style={styles.statDivider} />
      <TouchableOpacity style={styles.stat} onPress={() => onTabChange('following')} activeOpacity={0.7}>
        <Text style={styles.statNumber}>{followingCount}</Text>
        <Text style={[styles.statLabel, activeTab === 'following' && styles.statLabelActive]}>Following</Text>
      </TouchableOpacity>
      {!hidden.has('streaks') && (
        <>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.stat} onPress={() => onTabChange('streaks')} activeOpacity={0.7}>
            <Ionicons name="flash" size={18} color={activeTab === 'streaks' ? colors.textPrimary : colors.textSecondary} />
            <Text style={[styles.statLabel, activeTab === 'streaks' && styles.statLabelActive]}>Streaks</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statNumber: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  statLabelActive: { color: colors.textPrimary },
  statWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pendingBadge: {
    backgroundColor: '#F4212E',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pendingBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  statDivider: { width: 0.5, height: 28, backgroundColor: colors.border },
});
