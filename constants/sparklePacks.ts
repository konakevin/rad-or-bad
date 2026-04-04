/**
 * Sparkle pack definitions — single source of truth for product IDs and amounts.
 * Used by: sparkleStore UI, revenuecat-webhook, and anywhere packs are referenced.
 *
 * Product IDs must match EXACTLY what's in App Store Connect + RevenueCat.
 */

export interface SparklePack {
  productId: string;
  sparkles: number;
  label: string;
  icon: string;
}

export const SPARKLE_PACKS: SparklePack[] = [
  {
    productId: 'com.konakevin.radorbad.sparkles.25',
    sparkles: 25,
    label: 'Starter',
    icon: 'sparkles-outline',
  },
  { productId: 'com.konakevin.radorbad.sparkles.50', sparkles: 50, label: 'Popular', icon: 'star' },
  {
    productId: 'com.konakevin.radorbad.sparkles.100__',
    sparkles: 100,
    label: 'Best Value',
    icon: 'diamond',
  },
  {
    productId: 'com.konakevin.radorbad.sparkles.500',
    sparkles: 500,
    label: 'Mega Pack',
    icon: 'rocket',
  },
];

/** Quick lookup: product ID → sparkle amount */
export const PRODUCT_TO_SPARKLES: Record<string, number> = Object.fromEntries(
  SPARKLE_PACKS.map((p) => [p.productId, p.sparkles])
);

/** Quick lookup: product ID → display info */
export const PACK_INFO: Record<string, { sparkles: number; icon: string; label: string }> =
  Object.fromEntries(
    SPARKLE_PACKS.map((p) => [p.productId, { sparkles: p.sparkles, icon: p.icon, label: p.label }])
  );
