// ─────────────────────────────────────────────────────────────────────────────
// SHELVED — Character Sheet (not in use)
//
// Idea: show each user a "RPG-style" breakdown of their behavior on the app —
// stats like CLOUT (votes received), GRIND (post frequency), TASTE (rad ratio),
// EDGE (chaos/controversy), JUDGE (votes cast), VARIETY (category breadth).
// Stats would combine into a class (The Provocateur, The Hidden Gem, etc.) and
// an alignment label based on how they vote.
//
// Why we shelved it: too complex to maintain before we have real users to
// validate whether people actually care. Every schema change requires updating
// the stat formulas, class matrix, and flavor text. Revive once the core
// product is validated and users are asking for richer profile features.
// ─────────────────────────────────────────────────────────────────────────────

import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useCharacterStats } from '@/hooks/useCharacterStats';
import { STAT_DISPLAY, statDescription } from '@/lib/characterSheet';
import type { CharacterStats } from '@/lib/characterSheet';
import { colors } from '@/constants/theme';

// Yellow → orange → deep red across 20 segments
// 0–7: #CCDD55 → #FFAA00, 7–13: #FFAA00 → #FF5500, 13–19: #FF5500 → #CC0000
const RAD_BAR = [
  '#CCDD55',
  '#D3D649',
  '#DACF3D',
  '#E2C731',
  '#E9C024',
  '#F0B918',
  '#F7B10C',
  '#FFAA00',
  '#FF9C00',
  '#FF8E00',
  '#FF7F00',
  '#FF7100',
  '#FF6300',
  '#FF5500',
  '#F64700',
  '#EE3900',
  '#E52B00',
  '#DD1C00',
  '#D40E00',
  '#CC0000',
];

// ── Stat bar ──────────────────────────────────────────────────────────────────

function StatBar({ score }: { score: number }) {
  return (
    <View style={styles.barTrack}>
      {RAD_BAR.map((segColor, i) => (
        <View
          key={i}
          style={[
            styles.barSegment,
            i < score
              ? {
                  backgroundColor: segColor,
                  shadowColor: segColor,
                  shadowOpacity: 0.6,
                  shadowRadius: 3,
                  shadowOffset: { width: 0, height: 0 },
                }
              : { backgroundColor: `${segColor}28` },
          ]}
        />
      ))}
    </View>
  );
}

// ── Single stat row ───────────────────────────────────────────────────────────

function StatRow({ statKey, score }: { statKey: keyof CharacterStats; score: number }) {
  const { label, subtitle } = STAT_DISPLAY[statKey];
  const desc = statDescription(statKey, score);

  return (
    <View style={styles.statRow}>
      <View style={styles.statHeader}>
        <View>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={styles.statSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.statScore}>
          <Text style={styles.statScoreValue}>{score}</Text>
          <Text style={styles.statScoreMax}> / 20</Text>
        </Text>
      </View>
      <StatBar score={score} />
      <Text style={styles.statDesc}>{desc}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const STAT_ORDER: (keyof CharacterStats)[] = ['taste', 'clout', 'judge', 'edge', 'range', 'grind'];

interface CharacterSheetProps {
  userId: string;
}

export function CharacterSheet({ userId }: CharacterSheetProps) {
  const { data, isLoading } = useCharacterStats(userId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Not enough data yet.</Text>
        <Text style={styles.emptySubtext}>Post more. Vote more. Become someone.</Text>
      </View>
    );
  }

  const { stats, alignment, alignmentColor, className, flavor } = data;

  // Top 3 stats by score — these drove the class assignment
  const top3 = (Object.keys(stats) as (keyof CharacterStats)[])
    .sort((a, b) => stats[b] - stats[a])
    .slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Class + alignment */}
      <Text style={styles.sectionTitle}>CHARACTER CLASS</Text>
      <View
        style={[
          styles.classCard,
          {
            shadowColor: alignmentColor,
            shadowOpacity: 0.6,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        <Text style={styles.className}>{className}</Text>
        <View style={styles.alignmentRow}>
          <Text style={styles.alignmentPrefix}>Alignment </Text>
          <Text style={[styles.alignmentValue, { color: alignmentColor }]}>{alignment}</Text>
        </View>
        <Text style={styles.flavor}>
          {'"'}
          {flavor}
          {'"'}
        </Text>

        {/* Top 3 stats */}
        <View style={styles.topStatsDivider} />
        <View style={styles.topStatsRow}>
          {top3.map((key) => (
            <View key={key} style={styles.topStatBlock}>
              <Text style={styles.topStatLabel}>{STAT_DISPLAY[key].label}</Text>
              <Text style={styles.topStatValue}>{stats[key]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Stats */}
      <Text style={styles.sectionTitle}>SKILLS</Text>
      <View style={styles.statList}>
        {STAT_ORDER.map((key) => (
          <StatRow key={key} statKey={key} score={stats[key]} />
        ))}
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const BAR_EMPTY = '#2A2A2A';

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 12,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  // Class card
  classCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 20,
    gap: 4,
    backgroundColor: colors.surface,
  },
  className: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  alignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  alignmentPrefix: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  alignmentValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  flavor: {
    color: colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 19,
  },
  topStatsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: 16,
  },
  topStatsRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  topStatBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  topStatLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  topStatValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },

  // Stat list
  statList: {
    gap: 2,
  },
  statRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  statSubtitle: {
    color: '#AAAAAA',
    fontSize: 12,
    marginTop: 1,
  },
  statScore: {},
  statScoreValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  statScoreMax: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  statDesc: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },

  // Bar
  barTrack: {
    flexDirection: 'row',
    gap: 3,
  },
  barSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  barEmpty: {
    backgroundColor: BAR_EMPTY,
  },
});
