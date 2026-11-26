import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { type } from '../theme';

/** Uppercase caption above a group. */
export function SectionLabel({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: { ...type.caption, textTransform: 'uppercase' },
});
