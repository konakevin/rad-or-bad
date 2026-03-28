import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export type StatsTab = 'posts' | 'followers' | 'following' | 'streaks';

interface Props {
  postCount: number;
  followerCount: number;
  followingCount: number;
  streakCount?: number;
  activeTab: StatsTab;
  onTabChange: (tab: StatsTab) => void;
}

export function ProfileStatsRow({ postCount, followerCount, followingCount, streakCount, activeTab, onTabChange }: Props) {
  return (
    <View style={styles.statsRow}>
      <TouchableOpacity style={styles.stat} onPress={() => onTabChange('posts')} activeOpacity={0.7}>
        <Text style={styles.statNumber}>{postCount}</Text>
        <Text style={[styles.statLabel, activeTab === 'posts' && styles.statLabelActive]}>Posts</Text>
      </TouchableOpacity>
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
      <View style={styles.statDivider} />
      <TouchableOpacity style={styles.stat} onPress={() => onTabChange('streaks')} activeOpacity={0.7}>
        <Ionicons name="flash" size={18} color={activeTab === 'streaks' ? colors.textPrimary : colors.textSecondary} />
        <Text style={[styles.statLabel, activeTab === 'streaks' && styles.statLabelActive]}>Streaks</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statNumber: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  statLabelActive: { color: colors.textPrimary },
  statDivider: { width: 0.5, height: 28, backgroundColor: colors.border },
});
