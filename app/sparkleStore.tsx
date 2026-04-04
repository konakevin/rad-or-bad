import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type PurchasesPackage } from 'react-native-purchases';
import { colors } from '@/constants/theme';
import { Toast } from '@/components/Toast';
import {
  useSparkleBalance,
  useSparklePackages,
  usePurchaseSparkles,
  useRestorePurchases,
} from '@/hooks/useSparkles';

// Fallback display info keyed by product ID
import { PACK_INFO } from '@/constants/sparklePacks';

function PackCard({
  pkg,
  onPurchase,
  purchasing,
}: {
  pkg: PurchasesPackage;
  onPurchase: (pkg: PurchasesPackage) => void;
  purchasing: boolean;
}) {
  const product = pkg.product;
  const info = PACK_INFO[product.identifier] ?? {
    sparkles: 0,
    icon: 'sparkles-outline',
    label: '',
  };
  const isBestValue = info.label === 'Best Value';

  return (
    <TouchableOpacity
      style={[s.packCard, isBestValue && s.packCardFeatured]}
      onPress={() => onPurchase(pkg)}
      activeOpacity={0.7}
      disabled={purchasing}
    >
      {isBestValue && (
        <View style={s.featuredBadge}>
          <Text style={s.featuredBadgeText}>BEST VALUE</Text>
        </View>
      )}
      {info.label === 'Popular' && (
        <View style={s.popularBadge}>
          <Text style={s.popularBadgeText}>POPULAR</Text>
        </View>
      )}

      <Ionicons
        name={info.icon as keyof typeof Ionicons.glyphMap}
        size={28}
        color={colors.accent}
      />
      <Text style={s.packSparkles}>{info.sparkles}</Text>
      <Text style={s.packLabel}>sparkles</Text>

      <View style={[s.priceButton, isBestValue && s.priceButtonFeatured]}>
        {purchasing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={s.priceText}>{product.priceString}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SparkleStoreScreen() {
  const { data: balance = 0 } = useSparkleBalance();
  const { data: packages = [], isLoading } = useSparklePackages();
  const { mutate: purchase, isPending: purchasing } = usePurchaseSparkles();
  const { mutate: restore, isPending: restoring } = useRestorePurchases();

  // Sort packages by sparkle count (ascending)
  const sorted = [...packages].sort((a, b) => {
    const aInfo = PACK_INFO[a.product.identifier];
    const bInfo = PACK_INFO[b.product.identifier];
    return (aInfo?.sparkles ?? 0) - (bInfo?.sparkles ?? 0);
  });

  function handlePurchase(pkg: PurchasesPackage) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    purchase(pkg, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const info = PACK_INFO[pkg.product.identifier];
        Toast.show(`${info?.sparkles ?? ''} sparkles added!`, 'sparkles');
      },
      onError: (err) => {
        if (err.message === 'cancelled') return;
        Toast.show('Purchase failed — try again', 'close-circle');
      },
    });
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.title}>Get Sparkles</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Balance display */}
        <View style={s.balanceCard}>
          <Ionicons name="sparkles" size={32} color={colors.accent} />
          <Text style={s.balanceAmount}>{balance}</Text>
          <Text style={s.balanceLabel}>sparkles</Text>
        </View>

        <Text style={s.sectionTitle}>Sparkle Packs</Text>
        <Text style={s.sectionSub}>
          Use sparkles to fuse dreams, dream in others{"'"} styles, and more
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : sorted.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="bag-outline" size={48} color={colors.textSecondary} />
            <Text style={s.emptyText}>Store not available yet</Text>
            <Text style={s.emptySub}>Packs will appear here once the store is configured</Text>
          </View>
        ) : (
          <View style={s.packRow}>
            {sorted.map((pkg) => (
              <PackCard
                key={pkg.identifier}
                pkg={pkg}
                onPurchase={handlePurchase}
                purchasing={purchasing}
              />
            ))}
          </View>
        )}

        {/* Restore purchases */}
        <TouchableOpacity
          style={s.restoreButton}
          onPress={() =>
            restore(undefined, {
              onSuccess: () => Toast.show('Purchases restored', 'checkmark-circle'),
              onError: () => Toast.show('Restore failed', 'close-circle'),
            })
          }
          activeOpacity={0.7}
          disabled={restoring}
        >
          <Text style={s.restoreText}>{restoring ? 'Restoring...' : 'Restore Purchases'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 60 },

  // Balance
  balanceCard: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 32,
  },
  balanceAmount: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: '800',
  },
  balanceLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Section
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionSub: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 20,
  },

  // Pack cards
  packRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  packCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  packCardFeatured: {
    borderColor: colors.accent,
    backgroundColor: colors.accentBg,
  },
  featuredBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: colors.warning,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  popularBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  packEmoji: { fontSize: 32, marginTop: 4 },
  packSparkles: { color: colors.textPrimary, fontSize: 28, fontWeight: '800' },
  packLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  priceButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  priceButtonFeatured: {
    backgroundColor: colors.accentDark,
  },
  priceText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Empty state
  emptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptySub: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },

  // Restore
  restoreButton: { alignItems: 'center', paddingVertical: 24 },
  restoreText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
