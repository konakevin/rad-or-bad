import { showAlert } from '@/components/CustomAlert';
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import ImageCropPicker from 'react-native-image-crop-picker';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/auth';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useFeedStore } from '@/store/feed';
import { colors } from '@/constants/theme';

function SettingsRow({ icon, label, onPress, destructive, trailing }: {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.accent} />
      <Text style={[styles.rowLabel, destructive && styles.destructiveText]}>{label}</Text>
      {trailing ?? (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();
  const bumpReset = useFeedStore((s) => s.bumpReset);
  const regenerateSeed = useFeedStore((s) => s.regenerateSeed);
  const { data: profile } = usePublicProfile(user?.id ?? '');
  const { mutate: uploadAvatar, isPending: uploading } = useAvatarUpload();
  const [changingUsername, setChangingUsername] = useState(false);

  function handleChangePhoto() {
    showAlert('Profile picture', '', [
      {
        text: 'Choose from library',
        onPress: async () => {
          try {
            const image = await ImageCropPicker.openPicker({
              mediaType: 'photo',
              cropping: true,
              cropperCircleOverlay: true,
              width: 400,
              height: 400,
              forceJpg: true,
            });
            const uri = image.path.startsWith('file://') ? image.path : `file://${image.path}`;
            uploadAvatar(uri);
          } catch (e: unknown) {
            if ((e as { code?: string }).code !== 'E_PICKER_CANCELLED') {
              showAlert('Error', 'Could not open photo library.');
            }
          }
        },
      },
      {
        text: 'Take photo',
        onPress: async () => {
          try {
            const image = await ImageCropPicker.openCamera({
              mediaType: 'photo',
              cropping: true,
              cropperCircleOverlay: true,
              width: 400,
              height: 400,
              forceJpg: true,
            });
            const uri = image.path.startsWith('file://') ? image.path : `file://${image.path}`;
            uploadAvatar(uri);
          } catch (e: unknown) {
            if ((e as { code?: string }).code !== 'E_PICKER_CANCELLED') {
              showAlert('Error', 'Could not open camera.');
            }
          }
        },
      },
      ...(profile?.avatar_url ? [{
        text: 'Remove photo',
        style: 'destructive' as const,
        onPress: async () => {
          await supabase.from('users').update({ avatar_url: null }).eq('id', user!.id);
          queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
          queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
      }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  function handleChangeUsername() {
    Alert.prompt(
      'Change username',
      'Enter your new username',
      async (newUsername: string) => {
        const trimmed = newUsername.trim().toLowerCase();
        if (!trimmed || trimmed.length < 3) {
          showAlert('Too short', 'Username must be at least 3 characters.');
          return;
        }
        setChangingUsername(true);
        try {
          const { error } = await supabase
            .from('users')
            .update({ username: trimmed })
            .eq('id', user!.id);
          if (error) {
            if (error.message.includes('unique') || error.message.includes('duplicate')) {
              showAlert('Taken', 'That username is already in use.');
            } else {
              showAlert('Error', error.message);
            }
            return;
          }
          await supabase.auth.updateUser({ data: { username: trimmed } });
          queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
          queryClient.invalidateQueries({ queryKey: ['feed'] });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: unknown) {
          showAlert('Error', (err as Error).message);
        } finally {
          setChangingUsername(false);
        }
      },
      'plain-text',
      profile?.username ?? '',
    );
  }

  function handleChangePassword() {
    showAlert(
      'Reset password',
      `We'll send a reset link to ${user?.email}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send link',
          onPress: async () => {
            await supabase.auth.resetPasswordForEmail(user!.email!);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showAlert('Sent', 'Check your email for the reset link.');
          },
        },
      ],
    );
  }

  function handleRefreshAll() {
    showAlert('Refresh App', 'Refresh all app data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Refresh',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          queryClient.clear();
          regenerateSeed();
          bumpReset();
          router.replace('/(tabs)');
        },
      },
    ]);
  }

  function handleSignOut() {
    showAlert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await signOut();
          router.replace('/(auth)');
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    showAlert(
      'Delete account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            showAlert('Are you absolutely sure?', 'There is no going back.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, delete my account',
                style: 'destructive',
                onPress: async () => {
                  try {
                    const { error } = await supabase.rpc('delete_own_account');
                    if (error) throw error;
                    await signOut();
                    router.replace('/(auth)');
                  } catch (err: unknown) {
                    showAlert('Error', (err as Error).message);
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  }

  const initial = (profile?.username ?? user?.user_metadata?.username ?? '?')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar hero */}
        <TouchableOpacity style={styles.avatarHero} onPress={handleChangePhoto} activeOpacity={0.8}>
          {uploading ? (
            <View style={styles.avatarLarge}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarLarge} />
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{initial}</Text>
            </View>
          )}
          <Text style={styles.changePhotoLabel}>Change photo</Text>
        </TouchableOpacity>

        {/* Profile section */}
        <Text style={styles.sectionHeader}>PROFILE</Text>
        <View style={styles.section}>
          <SettingsRow icon="camera-outline" label="Profile picture" onPress={handleChangePhoto} />
          <SettingsRow
            icon="person-outline"
            label="Username"
            onPress={handleChangeUsername}
            trailing={
              changingUsername
                ? <ActivityIndicator size="small" color={colors.textSecondary} />
                : <View style={styles.rowTrailing}>
                    <Text style={styles.rowValue}>{profile?.username ?? ''}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </View>
            }
          />
          <SettingsRow
            icon="mail-outline"
            label="Email"
            onPress={() => {}}
            trailing={<Text style={styles.rowValue}>{user?.email}</Text>}
          />
        </View>

        {/* Dream Engine */}
        <Text style={styles.sectionHeader}>DREAM ENGINE</Text>
        <View style={styles.section}>
          <SettingsRow icon="sparkles" label="Edit My Dream Bot" onPress={() => {
            const { useOnboardingStore } = require('@/store/onboarding');
            useOnboardingStore.getState().reset();
            useOnboardingStore.getState().setIsEditing(true);
            router.push('/(onboarding)');
          }} />
          <SettingsRow icon="trash-outline" label="Reset My Dream Bot" onPress={async () => {
            await supabase.from('users').update({ has_ai_recipe: false }).eq('id', user!.id);
            await supabase.from('user_recipes').delete().eq('user_id', user!.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const { Toast } = require('@/components/Toast');
            Toast.show('Dream Bot reset — reload to set up again', 'checkmark-circle');
          }} destructive trailing={null} />
        </View>

        {/* App section */}
        <Text style={styles.sectionHeader}>APP</Text>
        <View style={styles.section}>
          <SettingsRow icon="refresh-outline" label="Refresh App" onPress={handleRefreshAll} trailing={null} />
        </View>

        {/* Account section */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={styles.section}>
          <SettingsRow icon="lock-closed-outline" label="Change password" onPress={handleChangePassword} />
          <SettingsRow icon="log-out-outline" label="Sign out" onPress={handleSignOut} destructive trailing={null} />
          <SettingsRow icon="trash-outline" label="Delete account" onPress={handleDeleteAccount} destructive trailing={null} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  scroll: { paddingBottom: 60 },
  avatarHero: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLargeText: { color: colors.textPrimary, fontSize: 32, fontWeight: '700' },
  changePhotoLabel: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  section: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  destructiveText: { color: colors.textPrimary },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
