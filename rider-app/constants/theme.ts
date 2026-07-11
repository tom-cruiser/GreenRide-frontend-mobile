/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Neutral base with brand accent (matches More tab green)
const tintColorLight = '#43a047';
const tintColorDark = '#43a047';

export const Colors = {
  light: {
    text: '#0B0B0B',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#4B5563',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorLight,

    // Extended tokens (new)
    surface: '#FFFFFF',
    surfaceAlt: '#F6F6F6',
    muted: '#6B7280',
    border: '#E5E7EB',
    danger: '#DC2626',
    success: '#16A34A',
  },
  dark: {
    text: '#F3F4F6',
    background: '#0B0B0B',
    tint: tintColorDark,
    icon: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorDark,

    // Extended tokens (new)
    surface: '#111111',
    surfaceAlt: '#1A1A1A',
    muted: '#9CA3AF',
    border: '#262626',
    danger: '#F87171',
    success: '#4ADE80',
  },
};

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
} as const;

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
