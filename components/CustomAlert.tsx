import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, Modal, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
}

// Global ref so showAlert can be called from anywhere (no hook required)
let globalShowAlert: ((title: string, message: string, buttons?: AlertButton[]) => void) | null = null;

/**
 * Drop-in replacement for showAlert() — uses our dark theme styling.
 * Works from any component or callback without needing a hook.
 */
export function showAlert(title: string, message: string, buttons?: AlertButton[]) {
  if (globalShowAlert) {
    globalShowAlert(title, message, buttons);
  }
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({ visible: false, title: '', message: '', buttons: [] });

  const show = useCallback((title: string, message: string, buttons?: AlertButton[]) => {
    setAlert({
      visible: true,
      title,
      message,
      buttons: buttons ?? [{ text: 'OK' }],
    });
  }, []);

  // Register the global function
  globalShowAlert = show;

  function dismiss() {
    setAlert((prev) => ({ ...prev, visible: false }));
  }

  function handlePress(button: AlertButton) {
    dismiss();
    setTimeout(() => button.onPress?.(), 150);
  }

  const isStacked = alert.buttons.length !== 2;
  // For stacked: cancel at bottom. For row: cancel on left.
  const sortedButtons = [...alert.buttons].sort((a, b) => {
    if (isStacked) {
      if (a.style === 'cancel') return 1;
      if (b.style === 'cancel') return -1;
    } else {
      if (a.style === 'cancel') return -1;
      if (b.style === 'cancel') return 1;
    }
    return 0;
  });

  return (
    <>
      {children}
      <Modal visible={alert.visible} transparent animationType="fade" statusBarTranslucent>
        <Pressable style={styles.overlay} onPress={dismiss}>
          <Pressable style={styles.card} onPress={() => {}}>
            {alert.title ? <Text style={styles.title}>{alert.title}</Text> : null}
            {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}
            <View style={isStacked ? styles.buttonCol : styles.buttonRow}>
              {sortedButtons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.button,
                    !isStacked && styles.buttonFlex,
                    btn.style === 'destructive' && styles.buttonDestructive,
                    btn.style === 'cancel' && styles.buttonCancel,
                    btn.style !== 'cancel' && btn.style !== 'destructive' && styles.buttonDefault,
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.buttonText,
                    btn.style === 'destructive' && styles.buttonTextDestructive,
                    btn.style === 'cancel' && styles.buttonTextCancel,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  buttonCol: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonFlex: {
    flex: 1,
  },
  buttonDefault: {
    backgroundColor: colors.accent,
  },
  buttonDestructive: {
    backgroundColor: colors.accent,
  },
  buttonCancel: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonTextDestructive: {
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    color: colors.textSecondary,
  },
});
