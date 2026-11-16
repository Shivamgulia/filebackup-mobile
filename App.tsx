import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as api from './src/api';
import { syncAndUpload } from './src/sync';
import { retryFailed } from './src/upload';
import { registerSyncTask } from './src/background';
import { FileListScreen } from './src/FileListScreen';
import { AdminUsersScreen } from './src/AdminUsersScreen';
import * as db from './src/db';
import type { AssetRow } from './src/db';
import { colors, radius, type as typeScale } from './src/theme';

export default function App() {
  const [state, setState] = useState<'loading' | 'login' | 'home'>('loading');

  useEffect(() => {
    api.restoreSession().then(ok => setState(ok ? 'home' : 'login'));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {state === 'loading' ? (
        <View style={[styles.screen, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : state === 'login' ? (
        <LoginScreen onDone={() => setState('home')} />
      ) : (
        <HomeScreen onLogout={() => setState('login')} />
      )}
    </SafeAreaProvider>
  );
}

function LoginScreen({ onDone }: { onDone: () => void }) {
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
      onDone();
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
      <ScrollView contentContainerStyle={styles.centered} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>FileBackup</Text>
        <TextInput
          style={styles.input}
          placeholder="Server URL (e.g. http://192.168.1.20:8080)"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={serverUrl}
          onChangeText={setServerUrl}
        />
        <TextInput
          style={styles.input}
          placeholder="Username"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error !== '' && <Text style={styles.error}>{error}</Text>}
        {busy ? (
          <ActivityIndicator style={styles.spinner} />
        ) : (
          <Button title="Log in" onPress={submit} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HomeScreen({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState<'home' | 'files' | 'admin'>('home');
  const [server, setServer] = useState('');
  const [counts, setCounts] = useState({ total: 0, uploaded: 0, pending: 0, failed: 0 });
  const [failedRows, setFailedRows] = useState<AssetRow[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const refresh = useCallback(async () => {
    setCounts(await db.getStateCounts());
    setFailedRows(await db.listFailed(10));
    const ts = await db.getMeta('last_sync');
    setLastSync(ts ? new Date(Number(ts)).toLocaleString() : null);
  }, []);

  const runSync = useCallback(
    async (mode: 'sync' | 'retry') => {
      setBusy(true);
      setStatus('Scanning library and uploading…');
      try {
        const r = mode === 'retry' ? await retryFailed() : await syncAndUpload();
        setStatus(`Library: ${r.total} · uploaded ${r.uploaded} · failed ${r.failed}`);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
        await refresh();
      }
    },
    [refresh],
  );

  useEffect(() => {
    setServer(api.getServerUrl());
    registerSyncTask();
    refresh();
    api.me().then(m => setIsAdmin(m.admin)).catch(() => setIsAdmin(false));
    // On-open backfill: catches anything missed while the app was closed.
    runSync('sync');
  }, [refresh, runSync]);

  if (view === 'files') {
    return <FileListScreen onBack={() => setView('home')} />;
  }
  if (view === 'admin') {
    return <AdminUsersScreen onBack={() => setView('home')} />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.centered}>
        <Text style={styles.title}>FileBackup</Text>
        <Text style={styles.status}>Server: {server}</Text>
        <Text style={styles.counts}>
          {counts.total} indexed · {counts.uploaded} uploaded · {counts.pending} pending ·{' '}
          {counts.failed} failed
        </Text>
        {lastSync && <Text style={styles.status}>Last sync: {lastSync}</Text>}
        {status !== '' && <Text style={styles.status}>{status}</Text>}
        <Button
          title={busy ? 'Working…' : 'Sync now'}
          onPress={() => runSync('sync')}
          disabled={busy}
        />
        {counts.failed > 0 && (
          <>
            <Button
              title={`Retry ${counts.failed} failed`}
              onPress={() => runSync('retry')}
              disabled={busy}
            />
            <Text style={styles.error}>
              {failedRows.map(r => `- ${r.filename}${r.error ? ` — ${r.error}` : ''}`).join('\n')}
            </Text>
          </>
        )}
        <View style={styles.gap} />
        <Button title="View backed-up files" onPress={() => setView('files')} />
        {isAdmin && (
          <Button title="User management" onPress={() => setView('admin')} />
        )}
        <Button title="Log out" onPress={() => api.logout().then(onLogout)} />
        <Button
          title="Reset local index"
          color="#c33"
          disabled={busy}
          onPress={() =>
            Alert.alert(
              'Reset local index?',
              'Clears the upload history on this phone. Nothing on the server is touched — the next sync will re-upload everything.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: () =>
                    db
                      .resetIndex()
                      .then(refresh)
                      .then(() => setStatus('Local index cleared'))
                      .catch(e =>
                        setStatus(e instanceof Error ? e.message : String(e)),
                      ),
                },
              ],
            )
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { ...typeScale.title, fontSize: 28, textAlign: 'center', marginBottom: 12 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.fg,
  },
  error: { color: colors.danger, textAlign: 'center' },
  status: { ...typeScale.sub, textAlign: 'center' },
  counts: { ...typeScale.body, fontWeight: '600', textAlign: 'center' },
  gap: { height: 12 },
  spinner: { marginVertical: 8 },
});
