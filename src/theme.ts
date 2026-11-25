/**
 * App-wide design tokens — classy complementary system
 * (source of truth: design-system/filebackup-mobile/MASTER.md + agent/plans/mobile-ux/design.md).
 *
 * Color roles (complementary harmony, muted so it reads classy):
 * - Neutrals carry ~90% of the UI — Apple system grays (iOS systemGroupedBackground,
 *   label, separator). Accents are muted and rare.
 * - PRIMARY  #2E5E4F deep forest — CTAs, links/back, + New, avatar, "All synced",
 *   admin badge, focus. The one accent.
 * - SECONDARY #527A6B sage — in-progress state ("Syncing", spinners), quiet/Cancel
 *   buttons, selected states. Green at rest, never competing with primary.
 * - TERTIARY #9C6B3D bronze — suspended/warning badge only. The single warm accent
 *   (sits in green's split-complement zone).
 * - DANGER #C0392B muted brick — destructive text/actions and failures only.
 * No shadows, hairline borders, generous spacing. Type: iOS text styles via system font.
 */
export const colors = {
  bg: '#F2F2F7', // app background (iOS systemGroupedBackground)
  card: '#FFFFFF', // surfaces
  fg: '#1C1C1E', // primary text (iOS label)
  muted: '#6E6E73', // secondary text (iOS secondaryLabel)
  faint: '#AEAEB2', // placeholder-level text (iOS tertiaryLabel)
  border: '#E5E5EA', // hairlines (iOS separator)
  primary: '#2E5E4F', // CTAs, links, focus
  onPrimary: '#FFFFFF',
  primarySoft: '#E8F0EC', // selected/tinted backgrounds
  secondary: '#527A6B', // in-progress state, quiet buttons
  secondarySoft: '#EDF3EF',
  success: '#2E5E4F',
  warning: '#9C6B3D', // tertiary: suspended marker (bronze, AA on card)
  onWarning: '#FFFFFF',
  danger: '#C0392B',
  onDanger: '#FFFFFF',
  fill: '#E9E9EB', // search fields and segmented controls (iOS fill)
} as const;

export const radius = { card: 16, control: 10, sm: 8, full: 9999 } as const;

/** Repeated component heights; values stay 44+ so they remain touch targets. */
export const layout = { row: 52, control: 48 } as const;

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
  meta: { fontSize: 13, color: colors.muted },
  caption: { fontSize: 12, fontWeight: '600', color: colors.muted, letterSpacing: 0.3 },
} as const;
