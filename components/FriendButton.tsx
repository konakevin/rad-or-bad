import { showAlert } from '@/components/CustomAlert';
import { Alert, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

interface Props {
  status: FriendshipStatus;
  onSendRequest: () => void;
  onCancelRequest: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onRemove: () => void;
}

export function FriendButton({ status, onSendRequest, onCancelRequest, onAccept, onDecline, onRemove }: Props) {
  if (status === 'pending_received') {
    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAccept(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            showAlert('Decline request?', 'They won\'t be notified.', [
              { text: 'Keep', style: 'cancel' },
              { text: 'Decline', style: 'destructive', onPress: onDecline },
            ]);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'pending_sent') {
    return (
      <TouchableOpacity
        style={styles.pendingButton}
        onPress={() => {
          showAlert('Cancel request?', 'Withdraw your friend request?', [
            { text: 'No', style: 'cancel' },
            { text: 'Cancel request', style: 'destructive', onPress: onCancelRequest },
          ]);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.pendingText}>Request Sent</Text>
      </TouchableOpacity>
    );
  }

  if (status === 'friends') {
    return (
      <TouchableOpacity
        style={styles.friendsButton}
        onPress={() => {
          showAlert('Remove friend?', 'You can always add them back later.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: onRemove },
          ]);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="checkmark-circle" size={14} color="#4CAA64" />
        <Text style={styles.friendsText}>Vibers</Text>
      </TouchableOpacity>
    );
  }

  // status === 'none'
  return (
    <TouchableOpacity
      style={styles.addButton}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSendRequest(); }}
      activeOpacity={0.7}
    >
      <Ionicons name="person-add" size={14} color="#FFD700" />
      <Text style={styles.addText}>Vibe</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
  },
  pendingButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pendingText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  friendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  friendsText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  declineButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
});
