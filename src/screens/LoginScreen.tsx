import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as api from '../api';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { colors, spacing, type } from '../theme';

/** Login: brand block + white form card + full-width green primary button. */
export function LoginScreen() {
  const insets = useSafeAreaInsets();
  // On a physical phone, localhost won't reach the Mac — use the Mac's LAN IP.
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
            <View style={styles.group}>
              <Text style={styles.sectionTitle}>Server</Text>
              <TextField
                placeholder="http://192.168.1.20:8080"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                value={serverUrl}
                onChangeText={setServerUrl}
              />
            </View>

            <View style={styles.group}>
              <Text style={styles.sectionTitle}>Account</Text>
              <View style={styles.fields}>
                <TextField
                  placeholder="Username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={setUsername}
                />
                <TextField
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

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
  group: { gap: spacing.sm },
  fields: { gap: spacing.md },
  sectionTitle: { ...type.caption, textTransform: 'uppercase' },
  error: { ...type.sub, color: colors.danger },
});
