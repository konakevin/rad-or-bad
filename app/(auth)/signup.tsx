import { showAlert } from '@/components/CustomAlert';
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);

  async function handleSignup() {
    if (!username.trim() || !email.trim() || !password.trim()) {
      showAlert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      showAlert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } },
    });
    setLoading(false);
    if (error) {
      showAlert('Sign up failed', error.message);
    } else if (data.session) {
      // Email confirmation is off — logged in immediately
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      // Email confirmation is on — show check-your-email UI
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAwaitingConfirmation(true);
    }
  }

  async function handleResend() {
    setResendCooldown(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) {
      showAlert('Could not resend', error.message);
    } else {
      showAlert('Email sent', 'Check your inbox again.');
    }
    // 30-second cooldown to prevent spam
    setTimeout(() => setResendCooldown(false), 30_000);
  }

  if (awaitingConfirmation) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-4 pt-4 pb-8">
          <TouchableOpacity
            onPress={() => setAwaitingConfirmation(false)}
            className="w-11 h-11 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 px-6 justify-center">
          <Text className="text-5xl mb-6 text-center">📬</Text>
          <Text className="text-white text-2xl font-bold mb-3 text-center">
            Check your email
          </Text>
          <Text className="text-text-secondary text-center text-base leading-6 mb-2">
            We sent a confirmation link to
          </Text>
          <Text className="text-white text-center font-semibold text-base mb-8">
            {email.trim()}
          </Text>
          <Text className="text-text-secondary text-center text-sm leading-6 mb-10">
            Tap the link in the email to verify your account and get started. Check your spam folder if you don't see it.
          </Text>

          <TouchableOpacity
            className={`border border-border rounded-full py-4 items-center ${resendCooldown ? 'opacity-40' : ''}`}
            onPress={handleResend}
            disabled={resendCooldown}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">
              {resendCooldown ? 'Email sent' : 'Resend email'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6">
            <Text className="text-text-secondary">Wrong email? </Text>
            <TouchableOpacity onPress={() => setAwaitingConfirmation(false)}>
              <Text className="text-flame font-semibold">Go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="px-4 pt-4 pb-8">
            <TouchableOpacity onPress={() => router.back()} className="w-11 h-11 items-center justify-center">
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 px-6">
            <Text className="text-3xl mb-2">🔥</Text>
            <Text className="text-white text-2xl font-bold mb-1">Create your account</Text>
            <Text className="text-text-secondary mb-8">Join and start rating.</Text>

            <Text className="text-text-secondary text-xs mb-2 ml-1">USERNAME</Text>
            <View className="bg-card border border-border rounded-2xl px-4 py-4 flex-row items-center mb-5">
              <Text className="text-text-secondary mr-2">@</Text>
              <TextInput
                className="flex-1 text-white text-base"
                placeholder="yourhandle"
                placeholderTextColor="#3E4144"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text className="text-text-secondary text-xs mb-2 ml-1">EMAIL</Text>
            <View className="bg-card border border-border rounded-2xl px-4 py-4 mb-5">
              <TextInput
                className="text-white text-base"
                placeholder="you@example.com"
                placeholderTextColor="#3E4144"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <Text className="text-text-secondary text-xs mb-2 ml-1">PASSWORD</Text>
            <View className="bg-card border border-border rounded-2xl px-4 py-4 flex-row items-center mb-8">
              <TextInput
                className="flex-1 text-white text-base"
                placeholder="Min. 8 characters"
                placeholderTextColor="#3E4144"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="ml-2 w-8 h-8 items-center justify-center">
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#71767B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className={`bg-flame rounded-full py-4 items-center ${loading ? 'opacity-70' : ''}`}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white font-bold text-base">Create account</Text>}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className="text-text-secondary">Already have an account? </Text>
              <Link href="/(auth)/login">
                <Text className="text-flame font-semibold">Sign in</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
