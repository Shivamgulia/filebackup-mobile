import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors, layout, radius } from '../theme';

/** The one text input: 48pt tall, 17pt text, hairline border. */
export function TextField({ style, ...props }: TextInputProps) {
  return <TextInput placeholderTextColor={colors.faint} style={[styles.input, style]} {...props} />;
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    minHeight: layout.control,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.fg,
  },
});
