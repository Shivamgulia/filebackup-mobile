import { StyleSheet, Text, View } from 'react-native';
import { TextButton } from './TextButton';
import { colors, spacing, type } from '../theme';

/** Message plus an optional retry action. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.message}>{message}</Text>
      {onRetry !== undefined && <TextButton title="Try again" onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  message: { ...type.sub, color: colors.danger, textAlign: 'center' },
});
