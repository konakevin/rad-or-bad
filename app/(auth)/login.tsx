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
import { signInWithGoogle } from '@/lib/googleAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign in failed', 'Invalid email or password.');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="px-4 pt-4 pb-8">
            <TouchableOpacity onPress={() => router.back()} className="w-11 h-11 items-center justify-center">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 px-6">
            <Text className="text-3xl mb-2">👋</Text>
            <Text className="text-white text-2xl font-bold mb-1">Welcome back</Text>
            <Text className="text-text-secondary mb-8">Sign in to your account.</Text>

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
            <View className="bg-card border border-border rounded-2xl px-4 py-4 flex-row items-center mb-2">
              <TextInput
                className="flex-1 text-white text-base"
                placeholder="Your password"
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

            <TouchableOpacity className="self-end mb-8">
              <Text className="text-flame text-sm">Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`bg-flame rounded-full py-4 items-center ${loading ? 'opacity-70' : ''}`}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white font-bold text-base">Sign in</Text>}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-border" />
              <Text className="text-text-secondary text-xs mx-4">OR</Text>
              <View className="flex-1 h-px bg-border" />
            </View>

            {/* Google Sign-In */}
            <TouchableOpacity
              className="bg-card border border-border rounded-full py-4 flex-row items-center justify-center gap-3"
              onPress={async () => {
                try {
                  setLoading(true);
                  await signInWithGoogle();
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  router.replace('/(tabs)');
                } catch (err: unknown) {
                  const msg = (err as Error).message;
                  if (!msg.includes('canceled') && !msg.includes('cancelled')) {
                    Alert.alert('Google Sign-In failed', msg);
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold text-base">Continue with Google</Text>
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className="text-text-secondary">Don't have an account? </Text>
              <Link href="/(auth)/signup">
                <Text className="text-flame font-semibold">Sign up</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
