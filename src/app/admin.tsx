import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../api';
import { AdminUsersScreen } from '../screens/AdminUsersScreen';
import { colors } from '../theme';

/** Admin-only. Self-guarded: non-admins (even via deep link) are redirected home. */
export default function Admin() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    api.me().then(m => setAllowed(m.admin)).catch(() => setAllowed(false));
  }, []);

  if (allowed === null) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (!allowed) {
    router.replace('/home');
    return null;
  }
  return <AdminUsersScreen />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center' },
});
