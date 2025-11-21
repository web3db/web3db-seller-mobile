/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const palette = {
  dark: {
    // UGA-inspired dark surfaces with Arch Black vibes
    bg: '#0B0B0B',
    surface: '#111316',
    elevated: '#16191D',
    border: '#1F1F1F',
    muted: '#20232A',

    // Bulldog Red (primary brand color)
    primary: '#BA0C2F',

    // Functional statuses (kept readable in dark)
    success: '#2ECC71',
    warning: '#F5C04E',
    danger: '#FF6B6B',

    // Text on dark
    text: {
      primary: '#FFFFFF',
      secondary: '#9EA2A2',
      muted: '#6B7280',
      inverse: '#FFFFFF',
    },

    overlay: 'rgba(0,0,0,0.5)',

    // Activity rings (functional, not brand-locked)
    rings: { move: '#BA0C2F', exercise: '#30D158', stand: '#64D2FF' },
  },

  light: {
    // UGA light base using Chapel Bell White
    bg: '#FFFFFF',
    surface: '#F7F7F9',
    elevated: '#FFFFFF',
    border: '#E6E6E6',
    muted: '#EEF0F3',

    // Bulldog Red (primary brand color)
    primary: '#BA0C2F',

    // Functional statuses tuned for contrast on light
    success: '#23B26D',
    warning: '#E3A82B',
    danger: '#E15555',

    // Text on light (Arch Black primary)
    text: {
      primary: '#000000',
      secondary: '#4B5563',
      muted: '#6B7280',
      inverse: '#FFFFFF',
    },

    overlay: 'rgba(0,0,0,0.35)',

    // Activity rings
    rings: { move: '#BA0C2F', exercise: '#30D158', stand: '#64D2FF' },
  },
} as const;

export type AppTheme = typeof palette.dark;

// Keep a `Colors` export for backward compatibility with existing imports.
// Map a small set of commonly used keys to the new palette structure.
export const Colors = {
  light: {
    text: palette.light.text.primary,
    background: palette.light.bg,
    tint: palette.light.primary,
    icon: palette.light.text.secondary,
    tabIconDefault: palette.light.text.secondary,
    tabIconSelected: palette.light.primary,
  },
  dark: {
    text: palette.dark.text.primary,
    background: palette.dark.bg,
    tint: palette.dark.primary,
    icon: palette.dark.text.secondary,
    tabIconDefault: palette.dark.text.secondary,
    tabIconSelected: palette.dark.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
