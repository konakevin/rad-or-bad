import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';

// Configure once on app load
GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

/**
 * Sign in with Google using native SDK.
 * Returns the Supabase session or throws on error.
 */
export async function signInWithGoogle() {
  // Check if Google Play Services are available (Android) — always true on iOS
  await GoogleSignin.hasPlayServices();

  // Trigger the native Google Sign-In UI
  const response = await GoogleSignin.signIn();

  if (!response.data?.idToken) {
    throw new Error('No ID token returned from Google Sign-In');
  }

  // Exchange the Google ID token for a Supabase session
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: response.data.idToken,
  });

  if (error) throw error;
  return data;
}
