/**
 * App-wide design tokens — flat, minimalist system.
 * Palette: cool grey surfaces, one blue for actions, amber for warnings,
 * red only for destructive. No shadows, hairline borders, generous spacing.
 */
export const colors = {
  bg: '#F8FAFC', // app background
  card: '#FFFFFF', // surfaces
  fg: '#0F172A', // primary text
  muted: '#64748B', // secondary text
  faint: '#94A3B8', // placeholder-level text
  border: '#E2E8F0', // hairlines
  primary: '#2563EB', // actions, links, focus
  onPrimary: '#FFFFFF',
  primarySoft: '#EFF6FF', // selected/tinted backgrounds
  success: '#15803D',
  warning: '#B45309', // suspended marker (amber, AA on card)
  onWarning: '#FFFFFF',
  danger: '#DC2626',
  onDanger: '#FFFFFF',
} as const;

export const radius = { sm: 8, md: 12 } as const;

export const spacing = (n: number) => n * 4;

export const type = {
  title: { fontSize: 22, fontWeight: '700', color: colors.fg, letterSpacing: -0.3 },
  section: { fontSize: 13, fontWeight: '600', color: colors.muted, letterSpacing: 0.2 },
  body: { fontSize: 15, color: colors.fg },
  sub: { fontSize: 13, color: colors.muted },
} as const;
