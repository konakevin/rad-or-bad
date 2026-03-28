// Light/dark tokens for legacy boilerplate components (app is dark-only)
export const Colors = {
  light: { text: '#000000', background: '#FFFFFF', icon: '#687076', tabIconDefault: '#687076', tabIconSelected: '#FF4500' },
  dark:  { text: '#FFFFFF', background: '#000000', icon: '#9BA1A6', tabIconDefault: '#9BA1A6', tabIconSelected: '#FF4500' },
};

export const colors = {
  background: '#000000',
  surface: '#0F0F0F',
  card: '#1A1A1A',
  border: '#2F2F2F',
  flame: '#FF4500',
  ember: '#FF6B00',
  spark: '#FFB800',
  textPrimary: '#FFFFFF',
  textSecondary: '#71767B',
  textTertiary: '#3E4144',
  error: '#F4212E',
  success: '#00BA7C',
} as const;

/** Auto-dismiss delay (ms) after voting on a card */
export const DISMISS_DELAY = 430;

/** Brand gradient arrays — pass directly to LinearGradient `colors` prop */
export const gradients: { rad: string[]; bad: string[] } = {
  rad: ['#CCDD55', '#DDAA66', '#DD7766'],
  bad: ['#BB88EE', '#6699EE', '#44BBCC'],
};
