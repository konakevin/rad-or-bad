import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-7xl mb-4">🔥</Text>
        <Text className="text-white text-4xl font-bold tracking-tight">Rad or Bad</Text>
        <Text className="text-text-secondary text-lg mt-3 text-center">
          Rate anything. Get rated.{'\n'}No filter.
        </Text>
      </View>

      <View className="px-6 pb-8 gap-3">
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
