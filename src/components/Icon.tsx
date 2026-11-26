import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** One icon family, one size/color default. Decorative unless the caller labels it. */
export function Icon({
  name,
  size = 20,
  color = colors.muted,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
