import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme';

// Native stack headers; only the gate, login, and the media viewer hide them.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.fg },
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ title: 'FileBackup', headerLargeTitle: true }} />
        <Stack.Screen name="files" options={{ title: 'Photos & Videos' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="failed" options={{ title: 'Uploads that failed' }} />
        <Stack.Screen name="share" options={{ title: 'Share' }} />
        <Stack.Screen name="shared" options={{ title: 'Sharing' }} />
        <Stack.Screen name="shared-folder" options={{ title: 'Shared folder' }} />
        <Stack.Screen name="viewer" options={{ headerShown: false }} />
        <Stack.Screen name="users" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
