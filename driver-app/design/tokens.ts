// Flow design tokens, shared by the rider and driver apps (and matching the
// website, https://flow-web-app.apps.gravyflow.bi): black and white, Inter,
// rounded cards and pill buttons.
//
// Source of truth: GreenRide-frontend-mobile/design. Run
// `node scripts/sync-design.mjs` after a change; it copies this folder into
// rider-app/design and driver-app/design.

export const colors = {
  // Surfaces
  bg: '#F6F6F7',        // page background
  surface: '#FFFFFF',   // cards, sheets
  soft: '#F1F1F3',      // quiet fills (chips, inputs at rest)
  soft2: '#E8E8EC',
  line: '#E4E4E7',      // borders
  // Text
  ink: '#0B0B0B',       // primary text, primary buttons
  ink2: '#27272A',
  ink3: '#52525B',      // secondary text
  muted: '#71717A',     // hints
  // On dark
  night: '#0A0A0A',     // dark panels (headers, the driver's online card)
  night2: '#18181B',
  onDark: '#FFFFFF',
  onDarkMuted: 'rgba(255,255,255,0.65)',
  // Meaning (the only colours besides black and white)
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  success: '#0B0B0B',   // "done" is black, as on the website
  successSoft: '#E8E8EC',
} as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, xxl: 28, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

// Inter, one family per weight (Android needs the exact family name).
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export type Weight = keyof typeof fonts;

// Type scale for the rider app; the driver app multiplies it (bigger text,
// read at a glance while working).
export const type = {
  display: { size: 34, line: 38, weight: 'bold' as Weight, tracking: -0.8 },
  title: { size: 24, line: 30, weight: 'bold' as Weight, tracking: -0.4 },
  heading: { size: 18, line: 24, weight: 'semibold' as Weight, tracking: -0.2 },
  body: { size: 15, line: 21, weight: 'regular' as Weight, tracking: 0 },
  label: { size: 14, line: 18, weight: 'semibold' as Weight, tracking: 0 },
  caption: { size: 12, line: 16, weight: 'medium' as Weight, tracking: 0.1 },
  overline: { size: 11, line: 14, weight: 'semibold' as Weight, tracking: 1.2 },
} as const;

export type TypeVariant = keyof typeof type;

export const shadow = {
  card: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  float: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
} as const;
