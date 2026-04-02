import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GradientUsername } from '@/components/GradientUsername';
import { colors } from '@/constants/theme';
import type { PendingRequest } from '@/hooks/usePendingRequests';

interface Props {
  request: PendingRequest;
  onAccept: (requesterId: string) => void;
  onDecline: (requesterId: string) => void;
}

export function FriendRequestRow({ request, onAccept, onDecline }: Props) {
  const initial = (request.username || '?')[0].toUpperCase();

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.info}
        onPress={() => router.push(`/user/${request.requesterId}`)}
        activeOpacity={0.7}
      >
        {request.avatarUrl ? (
          <Image source={{ uri: request.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        <GradientUsername
          username={request.username}
          rank={null}
          style={styles.username}
        />
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAccept(request.requesterId);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDecline(request.requesterId);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  username: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
