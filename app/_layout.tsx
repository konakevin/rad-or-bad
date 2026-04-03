import '../global.css';

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { configureRevenueCat } from '@/lib/revenuecat';
import { AlertProvider } from '@/components/CustomAlert';
import { ToastHost } from '@/components/Toast';

import { queryClient } from '@/lib/queryClient';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

SplashScreen.preventAutoHideAsync();

function AuthInitializer() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  // Handle deep links from confirmation emails
  useEffect(() => {
    async function handleUrl(url: string) {
      const parsed = Linking.parse(url);

      // PKCE flow: Supabase redirects with ?code=xxx in the query string
      const code = parsed.queryParams?.code;
      if (typeof code === 'string') {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }

      // Implicit flow fallback: tokens in URL fragment #access_token=xxx
      const fragment = url.split('#')[1];
      if (!fragment) return;
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
      // onAuthStateChange in the auth store fires automatically after either path
    }

    // App already open when link is tapped
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    // App was closed and opened via the link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  return null;
}

function PushRegistrar() {
  usePushNotifications();
  return null;
}

function RevenueCatInitializer() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user?.id) {
      configureRevenueCat(user.id);
    }
  }, [user?.id]);

  return null;
}

function RealtimeSubscriber() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          // New notification — refresh inbox and unread count
          queryClient.invalidateQueries({ queryKey: ['inbox', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_recipes',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Recipe/wish updated (e.g. wish cleared after granting)
          queryClient.invalidateQueries({ queryKey: ['dreamWish', user.id] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'uploads', filter: `user_id=eq.${user.id}` },
        () => {
          // New dream generated for this user — refresh all feeds
          queryClient.invalidateQueries({ queryKey: ['feed'] });
          queryClient.invalidateQueries({ queryKey: ['friendsFeed'] });
          queryClient.invalidateQueries({ queryKey: ['followingFeed'] });
          queryClient.invalidateQueries({ queryKey: ['userPosts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return null;
}

function DataPrefetcher() {
  const user = useAuthStore((s) => s.user);
  const activityLogged = useRef(false);

  // Track last_active_at for nightly dream eligibility (once per session)
  // Must write to public.users (not auth.users) — nightly-dreams queries this table
  useEffect(() => {
    if (!user || activityLogged.current) return;
    activityLogged.current = true;
    supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);
  }, [user?.id]);

  // Refresh all data when app returns from background after 5+ minutes
  const backgroundedAt = useRef<number>(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current > 0) {
        const elapsed = Date.now() - backgroundedAt.current;
        if (elapsed > 5 * 60 * 1000) {
          queryClient.invalidateQueries();
        }
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!user) return;
    // Prefetch profile data so the profile tab renders instantly
    queryClient.prefetchQuery({
      queryKey: ['topStreaks', user.id],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_top_streaks', { p_user_id: user.id });
        if (error) throw error;
        return (data ?? []).map((row: Record<string, unknown>) => ({
          friendId: row.friend_id as string,
          friendUsername: row.friend_username as string,
          friendAvatar: (row.friend_avatar as string | null) ?? null,
          friendRank: (row.friend_rank as string | null) ?? null,
          currentStreak: row.current_streak as number,
          bestStreak: row.best_streak as number,
          streakType: (row.streak_type as 'rad' | 'bad' | null) ?? null,
          radStreak: (row.rad_streak as number) ?? 0,
          badStreak: (row.bad_streak as number) ?? 0,
          bestRadStreak: (row.best_rad_streak as number) ?? 0,
          bestBadStreak: (row.best_bad_streak as number) ?? 0,
        }));
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [user?.id]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppErrorBoundary>
          <AlertProvider>
            <AuthInitializer />
            <PushRegistrar />
            <RevenueCatInitializer />
            <RealtimeSubscriber />
            <DataPrefetcher />
            <Stack
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" options={{ gestureEnabled: false }} />
              <Stack.Screen
                name="settings"
                options={{ presentation: 'card', gestureEnabled: true }}
              />
              <Stack.Screen
                name="fusion"
                options={{ presentation: 'card', gestureEnabled: true }}
              />
              <Stack.Screen
                name="friendReveal/[uploadId]"
                options={{ presentation: 'card', gestureEnabled: true }}
              />
              <Stack.Screen
                name="photo/[id]"
                options={{ presentation: 'card', gestureEnabled: true }}
              />
              <Stack.Screen
                name="user/[userId]"
                options={{ presentation: 'card', gestureEnabled: true }}
              />
              <Stack.Screen
                name="sharePost"
                options={{
                  presentation: 'transparentModal',
                  gestureEnabled: true,
                  animation: 'fade',
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              />
              <Stack.Screen
                name="comments"
                options={{
                  presentation: 'formSheet',
                  gestureEnabled: true,
                  contentStyle: { backgroundColor: '#0F0F1A' },
                }}
              />
              <Stack.Screen
                name="search"
                options={{
                  presentation: 'transparentModal',
                  gestureEnabled: true,
                  animation: 'fade',
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              />
              <Stack.Screen
                name="sparkleStore"
                options={{ presentation: 'card', gestureEnabled: true }}
              />
            </Stack>
            <StatusBar style="light" />
            <ToastHost />
          </AlertProvider>
        </AppErrorBoundary>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
