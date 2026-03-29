import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCount } from '@/lib/formatCount';
import { colors } from '@/constants/theme';

interface VoteCountProps {
  count: number;
  size?: 'sm' | 'md';
}

export function VoteCount({ count, size = 'md' }: VoteCountProps) {
  if (count <= 0) return null;

  const iconSize = size === 'sm' ? 9 : 12;
  const fontSize = size === 'sm' ? 10 : 13;

  return (
    <View style={styles.row}>
      <Ionicons name="people-outline" size={iconSize} color="rgba(255,255,255,0.85)" style={styles.icon} />
      <Text style={[styles.text, { fontSize }]}>{formatCount(count)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  icon: {
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  text: {
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
