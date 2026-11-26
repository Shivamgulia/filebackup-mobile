import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../../api';
import { colors } from '../../theme';

/** One admin guard for every /users screen — deep links included. */
export default function UsersLayout() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    api.me().then(m => setAllowed(m.admin)).catch(() => setAllowed(false));
  }, []);

  if (allowed === null) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }
  if (!allowed) {
    router.replace('/home');
    return null;
  }
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.fg },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Screen name="index" options={{ title: 'Users' }} />
      <Stack.Screen name="new" options={{ title: 'New user' }} />
      <Stack.Screen name="[username]" options={{ title: 'User' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center' },
});
