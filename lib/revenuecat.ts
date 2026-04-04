import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_IOS_KEY = 'appl_gDwFXEmOsQLWUTUndcldpmruekW';
const RC_ANDROID_KEY = 'YOUR_REVENUECAT_ANDROID_API_KEY';

let configured = false;

/**
 * Call once at app startup after the user is authenticated.
 * Pass the Supabase user ID so RevenueCat links purchases to your user.
 */
export async function configureRevenueCat(userId: string) {
  if (configured) return;

  const key = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (key.startsWith('YOUR_') || key.startsWith('test_')) {
    if (__DEV__) console.log('[RevenueCat] Skipping — using test key, products not ready yet');
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: key, appUserID: userId });
  configured = true;
}

/**
 * Fetch available sparkle packs from RevenueCat.
 * Returns the packages from your "sparkles" offering.
 */
export async function getSparklePackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  const sparkles = offerings.current ?? offerings.all['sparkle_packs'];
  if (!sparkles) return [];
  return sparkles.availablePackages;
}

/**
 * Purchase a sparkle pack. Returns true on success, false on user cancel.
 * Throws on real errors.
 */
export async function purchaseSparklePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    await Purchases.purchasePackage(pkg);
    return true;
  } catch (err: unknown) {
    const rcErr = err as { userCancelled?: boolean };
    if (rcErr.userCancelled) return false;
    throw err;
  }
}

/**
 * Restore previous purchases (required by Apple).
 */
export async function restorePurchases() {
  return Purchases.restorePurchases();
}
