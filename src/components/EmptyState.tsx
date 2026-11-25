import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { spacing, type } from '../theme';

/** One empty-state line, centered under the list area. */
export function EmptyState({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.text, style]}>{text}</Text>;
}

const styles = StyleSheet.create({
  text: { ...type.sub, textAlign: 'center', marginTop: spacing.xl },
});
