import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function AuthLayout() {
  const { session, initialized } = useAuthStore();

  if (initialized && session) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
