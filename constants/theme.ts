import { StyleSheet } from 'react-native';

// ── Core Palette ─────────────────────────────────────────────────────────────
// Change these once → entire app updates.

export const colors = {
  // Backgrounds
  background: '#000000',
  surface: '#0F0F14',
  card: '#1A1A24',
  border: '#2A2A3A',

  // Accent
  accent: '#8B7BEE',
  accentLight: '#A99BF5',
  accentDark: '#6B5DC4',
  accentBg: 'rgba(139,123,238,0.1)',
  accentBorder: 'rgba(139,123,238,0.2)',

  // Semantic
  like: '#E8485F',
  error: '#E8485F',
  success: '#4CAA64',
  warning: '#FFB800',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E9E',
  textTertiary: '#3E3E4E',
  textMuted: '#6E6E7E',

  // Overlay
  overlay: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(0,0,0,0.3)',
  overlayWhite: 'rgba(255,255,255,0.12)',
  overlayWhiteActive: 'rgba(255,255,255,0.25)',
} as const;

// ── Brand Gradients ──────────────────────────────────────────────────────────

export const gradients = {
  dream: ['#FFD700', '#FF8C00', '#FF4500'] as [string, string, ...string[]],
  bot: ['#44DDCC', '#6699EE', '#BB88EE'] as [string, string, ...string[]],
  accent: ['#8B7BEE', '#6B5DC4'] as [string, string],
};

// ── Swipe / Gesture ──────────────────────────────────────────────────────────

export const SWIPE = {
  DISMISS_THRESHOLD: 40,
  VELOCITY_THRESHOLD: 300,
} as const;

// ── Shared Styles ────────────────────────────────────────────────────────────
// Reusable style fragments — import and spread into component StyleSheets.

export const ui = StyleSheet.create({
  // Buttons
  buttonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabledText: {
    color: colors.textSecondary,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  buttonSecondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Pill chips (category selectors, tags)
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.overlayWhite,
  },
  pillActive: {
    backgroundColor: colors.overlayWhiteActive,
  },
  pillText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Tiles (onboarding, grids)
  tile: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentBg,
  },
  tileLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tileLabelSelected: {
    color: colors.accent,
  },

  // Text shadows (for text over images)
  textShadow: {
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },

  // Progress dots (onboarding)
  progressBar: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.accent,
    width: 16,
    borderRadius: 3,
  },

  // Side action buttons (feed cards)
  sideButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayLight,
    borderRadius: 22,
  },
  sideCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    position: 'absolute',
    bottom: -2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },

  // Icon circles (welcome, dream upload)
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Legacy compat — remove these references over time
export const Colors = {
  light: { text: '#000000', background: '#FFFFFF', icon: '#687076', tabIconDefault: '#687076', tabIconSelected: colors.accent },
  dark: { text: '#FFFFFF', background: '#000000', icon: '#9BA1A6', tabIconDefault: '#9BA1A6', tabIconSelected: colors.accent },
};
