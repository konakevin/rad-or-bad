import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';

/**
 * Sign in with Apple using native SDK.
 * Returns the Supabase session or throws on error.
 */
export async function signInWithApple() {
  // Generate a nonce for security
  const rawNonce = Crypto.getRandomBytes(16)
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');

  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  // Trigger the native Apple Sign-In UI
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('No identity token returned from Apple Sign-In');
  }

  // Build a display name from Apple's fullName (only sent on first sign-in)
  const givenName = credential.fullName?.givenName ?? '';
  const familyName = credential.fullName?.familyName ?? '';
  const fullName = [givenName, familyName].filter(Boolean).join(' ');

  // Exchange the Apple identity token for a Supabase session
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) throw error;

  // Save the name to user metadata if Apple provided it
  if (fullName && data.user) {
    const username = givenName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'dreamer';
    await supabase.auth.updateUser({
      data: { username, full_name: fullName },
    });
    // Also update the users table directly since the trigger already ran
    await supabase
      .from('users')
      .update({ username })
      .eq('id', data.user.id);
  }

  return data;
}
