import { showAlert } from '@/components/CustomAlert';
import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithGoogle } from '@/lib/googleAuth';
import { signInWithApple } from '@/lib/appleAuth';
import { signInWithFacebook } from '@/lib/facebookAuth';

const HOT_GRADIENT: [string, string, ...string[]] = ['#FFD700', '#FF8C00', colors.accent];
const COLD_GRADIENT: [string, string, ...string[]] = ['#44DDCC', '#6699EE', '#BB88EE'];

function Tagline() {
  return null;
}

function GradientWord({ text, colors }: { text: string; colors: [string, string, ...string[]] }) {
  return (
    <MaskedView maskElement={<Text style={authStyles.logoWord}>{text}</Text>}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={[authStyles.logoWord, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

function Logo() {
  return (
    <View style={authStyles.logoContainer}>
      <GradientWord text="DREAM" colors={HOT_GRADIENT} />
      <GradientWord text="BOT" colors={COLD_GRADIENT} />
    </View>
  );
}

const authStyles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoWord: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    letterSpacing: 6,
  },
  _logoOrRemoved: {
  },
  tagline: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 3,
    marginTop: 10,
  },
});

export default function WelcomeScreen() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSocialSignIn(provider: 'google' | 'apple' | 'facebook') {
    try {
      setLoading(provider);
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'apple') {
        await signInWithApple();
      } else {
        await signInWithFacebook();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (!msg.includes('canceled') && !msg.includes('cancelled') && !msg.includes('ERR_CANCELED')) {
        const label = provider === 'google' ? 'Google' : 'Apple';
        showAlert(`${label} Sign-In failed`, msg);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8">
        <Logo />
        <View style={{ overflow: 'visible', alignItems: 'center' }}>
          <Tagline />
        </View>
      </View>

      <View className="px-6 pb-8 gap-3">
        {/* Apple Sign-In (iOS only) */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            className="bg-white rounded-full py-4 flex-row items-center justify-center gap-3"
            onPress={() => handleSocialSignIn('apple')}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === 'apple' ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#000000" />
                <Text className="text-black font-semibold text-base">Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Google Sign-In */}
        <TouchableOpacity
          className="bg-card border border-border rounded-full py-4 flex-row items-center justify-center gap-3"
          onPress={() => handleSocialSignIn('google')}
          disabled={loading !== null}
          activeOpacity={0.8}
        >
          {loading === 'google' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold text-base">Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Facebook Sign-In */}
        <TouchableOpacity
          className="bg-card border border-border rounded-full py-4 flex-row items-center justify-center gap-3"
          onPress={() => handleSocialSignIn('facebook')}
          disabled={loading !== null}
          activeOpacity={0.8}
        >
          {loading === 'facebook' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="logo-facebook" size={20} color="#1877F2" />
              <Text className="text-white font-semibold text-base">Continue with Facebook</Text>
            </>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity
            className="bg-flame rounded-full py-4 items-center"
            activeOpacity={0.8}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          >
            <Text className="text-white font-bold text-base">Create account</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity
            className="border border-border rounded-full py-4 items-center"
            activeOpacity={0.8}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Text className="text-white font-semibold text-base">Sign in</Text>
          </TouchableOpacity>
        </Link>

        <Text className="text-text-tertiary text-xs text-center mt-2 px-4">
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}
