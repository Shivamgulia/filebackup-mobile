import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../api';
import { colors } from '../theme';

/** Session gate: existing session → home, otherwise login. */
export default function Gate() {
  useEffect(() => {
    api.restoreSession().then(ok => router.replace(ok ? '/home' : '/login'));
  }, []);
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center' },
});
