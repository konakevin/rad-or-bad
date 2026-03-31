import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { useFeedStore } from '@/store/feed';

export default function TabLayout() {
  const { session, initialized } = useAuthStore();
  const bumpProfileReset = useFeedStore((s) => s.bumpProfileReset);

  if (initialized && !session) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(0,0,0,0.95)',
          borderTopColor: 'rgba(255,255,255,0.1)',
          borderTopWidth: 0.5,
          position: 'absolute',
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="top"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="moon-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => bumpProfileReset(),
        }}
      />
    </Tabs>
  );
}
