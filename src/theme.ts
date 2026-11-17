/**
 * App-wide design tokens — green "easy on the eyes" system
 * (source of truth: design-system/filebackup-mobile/MASTER.md).
 * Palette: soft green-tinted surfaces, deep green for actions, amber for warnings,
 * red only for destructive. No shadows, hairline borders, generous spacing.
 */
export const colors = {
  bg: '#F0FDF4', // app background
  card: '#FFFFFF', // surfaces
  fg: '#0F172A', // primary text
  muted: '#475569', // secondary text
  faint: '#94A3B8', // placeholder-level text
  border: '#E2EFE7', // hairlines
  primary: '#15803D', // actions, links, focus
  onPrimary: '#FFFFFF',
  primarySoft: '#DCFCE7', // selected/tinted backgrounds
  success: '#15803D',
  warning: '#D97706', // suspended marker (amber, AA on card)
  onWarning: '#FFFFFF',
  danger: '#DC2626',
  onDanger: '#FFFFFF',
} as const;

export const radius = { card: 16, control: 10, sm: 8 } as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16, // screen padding, card padding
  xl: 24, // section gap
  xxl: 32,
} as const;

export const type = {
  title: { fontSize: 28, fontWeight: '700', color: colors.fg, letterSpacing: -0.4 },
  headline: { fontSize: 17, fontWeight: '600', color: colors.fg },
  body: { fontSize: 17, color: colors.fg },
  sub: { fontSize: 15, color: colors.muted },
  caption: { fontSize: 12, fontWeight: '600', color: colors.muted, letterSpacing: 0.3 },
} as const;
