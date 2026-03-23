import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/auth';

export default function Index() {
  const { session, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FF4500" />
      </View>
    );
  }

  return <Redirect href={session ? '/(tabs)' : '/(auth)'} />;
}
