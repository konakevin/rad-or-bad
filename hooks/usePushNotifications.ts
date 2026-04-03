import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

// Show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.log('[Push] Permission not granted');
    return null;
  }

  // Get Expo push token
  const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
    projectId: '315a034e-ee26-4d53-9dc3-e3c5078b4b3c',
  });

  if (__DEV__) console.log('[Push] Token:', tokenData);
  return tokenData;
}

async function savePushToken(userId: string, token: string) {
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    );

  if (error && __DEV__) console.warn('[Push] Failed to save token:', error.message);
}

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const notificationListener = useRef<Notifications.Subscription>(undefined);
  const responseListener = useRef<Notifications.Subscription>(undefined);

  useEffect(() => {
    if (!user) return;

    // Register and save token
    registerForPushNotifications().then((token) => {
      if (token) savePushToken(user.id, token);
    });

    // Handle notification received while app is open (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      if (__DEV__) console.log('[Push] Received:', notification.request.content.title);
    });

    // Handle notification tapped (opens app or brought to foreground)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.uploadId) {
        router.push(`/photo/${data.uploadId}`);
      } else if (data?.userId) {
        router.push(`/user/${data.userId}`);
      }
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [user?.id]);
}
