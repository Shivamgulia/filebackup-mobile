import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as api from '../api';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { colors, spacing, type } from '../theme';

/** Login: brand block + white form card + full-width primary button. */
export function LoginScreen() {
  const insets = useSafeAreaInsets();
  // On a physical phone, localhost won't reach the Mac — use the Mac's LAN IP.
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const usernameRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      await api.login(serverUrl.trim(), username.trim(), password);
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={type.title}>FileBackup</Text>
            <Text style={type.sub}>Your photos, safely on your own server</Text>
          </View>

          <Card style={styles.card}>
            <TextField
              label="Server URL"
              placeholder="http://192.168.1.20:8080"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoComplete="url"
              textContentType="URL"
              returnKeyType="next"
              submitBehavior="submit"
              value={serverUrl}
              onChangeText={setServerUrl}
              onSubmitEditing={() => usernameRef.current?.focus()}
            />
            <TextField
              ref={usernameRef}
              label="Username"
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              submitBehavior="submit"
              value={username}
              onChangeText={setUsername}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextField
              ref={passwordRef}
              label="Password"
              placeholder="Password"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
            />

            {error !== '' && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton title="Sign in" loading={busy} onPress={submit} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.xs },
  card: { gap: spacing.md },
  error: { ...type.sub, color: colors.danger },
});
