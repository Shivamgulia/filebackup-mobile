import { useState, type Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { colors, layout, radius, spacing, type } from '../theme';

/** The one text input: visible label, optional hint/error, focus ring. */
export function TextField({
  label,
  hint,
  error,
  style,
  ref,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label?: string; hint?: string; error?: string; ref?: Ref<TextInputInstance> }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.group}>
      {label !== undefined && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...props}
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          focused && styles.focused,
          error !== undefined && styles.inputError,
          style,
        ]}
        onFocus={e => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {error !== undefined ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint !== undefined ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { ...type.caption, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    minHeight: layout.control,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...type.body,
  },
  focused: { borderColor: colors.primary },
  inputError: { borderColor: colors.danger },
  hint: type.meta,
  error: { ...type.meta, color: colors.danger },
});
