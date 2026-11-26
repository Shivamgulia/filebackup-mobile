import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/** Inline loading state; the native header stays visible. */
export function LoadingState() {
  return (
    <View style={styles.state}>
      <ActivityIndicator size="large" color={colors.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  state: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
