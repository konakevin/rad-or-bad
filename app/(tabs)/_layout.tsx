import { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useFeedStore } from '@/store/feed';
import { useUnreadCount } from '@/hooks/useUnreadCount';

export default function TabLayout() {
  const { session, initialized } = useAuthStore();
  const bumpProfileReset = useFeedStore((s) => s.bumpProfileReset);
  const regenerateSeed = useFeedStore((s) => s.regenerateSeed);
  const queryClient = useQueryClient();
  const activeTab = useRef('index');
  const { data: unreadCount = 0 } = useUnreadCount();

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
        listeners={{
          tabPress: () => {
            if (activeTab.current === 'index') {
              regenerateSeed();
            }
            activeTab.current = 'index';
          },
        }}
      />
      <Tabs.Screen
        name="top"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
        listeners={{ tabPress: () => {
          if (activeTab.current === 'top') regenerateSeed();
          activeTab.current = 'top';
        } }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="moon-outline" size={size} color={color} />
          ),
        }}
        listeners={{ tabPress: () => { activeTab.current = 'upload'; } }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubble-outline" size={size} color={color} />
              {unreadCount > 0 && (
                <View style={tabStyles.badge}>
                  <Text style={tabStyles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
        listeners={{ tabPress: () => { activeTab.current = 'inbox'; } }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => { activeTab.current = 'profile'; bumpProfileReset(); },
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#E8485F',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
