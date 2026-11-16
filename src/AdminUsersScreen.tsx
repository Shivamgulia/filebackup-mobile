import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as api from './api';
import type { AdminUser } from './api';

/** Admin-only user management: list, create, password change, suspend/unsuspend, role select. */
export function AdminUsersScreen({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [pwFor, setPwFor] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState('');

  const reload = useCallback(async () => {
    try {
      setUsers(await api.listUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .listUsers()
      .then(u => alive && setUsers(u))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, []);

  async function run(action: () => Promise<void>, done: string) {
    setError('');
    setStatus('');
    setBusy(true);
    try {
      await action();
      setStatus(done);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function pickRole(u: AdminUser) {
    Alert.alert(`Access level for ${u.username}`, undefined, [
      {
        text: 'Admin — sees and manages every user and all files',
        onPress: () =>
          run(() => api.setUserRole(u.username, 'admin'), `${u.username} is now admin`).catch(
            () => {},
          ),
      },
      {
        text: 'User — only their own files',
        onPress: () =>
          run(() => api.setUserRole(u.username, 'user'), `${u.username} is now user`).catch(
            () => {},
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.back}>‹ Back to home</Text>
      </TouchableOpacity>
      <Text style={styles.title}>User management</Text>
      {error !== '' && <Text style={styles.error}>{error}</Text>}
      {status !== '' && <Text style={styles.status}>{status}</Text>}

      <Text style={styles.section}>Create user</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        autoCapitalize="none"
        autoCorrect={false}
        value={newName}
        onChangeText={setNewName}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 8 chars)"
        secureTextEntry
        value={newPass}
        onChangeText={setNewPass}
      />
      <Button
        title="Create"
        disabled={busy || newName.trim() === '' || newPass.length < 8}
        onPress={() => {
          const name = newName.trim();
          setNewName('');
          setNewPass('');
          run(
            () => api.createUser(name, newPass),
            `Created ${name}`,
          ).catch(() => {});
        }}
      />

      <Text style={styles.section}>Users</Text>
      {users.map(u => (
        <View key={u.username} style={styles.row}>
          <Text style={styles.name}>
            {u.username} — {u.role === 'admin' ? 'admin' : 'user'}
            {u.suspended ? '  ⛔ suspended' : ''}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => pickRole(u)}>
              <Text style={styles.select}>
                Access: {u.role === 'admin' ? 'Admin ▾' : 'User ▾'}
              </Text>
            </TouchableOpacity>
            <Button
              title="Password"
              disabled={busy}
              onPress={() => {
                setPwFor(u.username);
                setPwValue('');
              }}
            />
            <Button
              title={u.suspended ? 'Unsuspend' : 'Suspend'}
              color={u.suspended ? '#2a7' : '#c33'}
              disabled={busy}
              onPress={() =>
                run(
                  () => api.setSuspended(u.username, !u.suspended),
                  u.suspended ? `Unsuspended ${u.username}` : `Suspended ${u.username}`,
                ).catch(() => {})
              }
            />
          </View>
        </View>
      ))}

      {pwFor !== null && (
        <View style={styles.pwBox}>
          <Text style={styles.section}>New password for {pwFor}</Text>
          <TextInput
            style={styles.input}
            placeholder="New password (min 8 chars)"
            secureTextEntry
            value={pwValue}
            onChangeText={setPwValue}
          />
          <Button
            title="Set password"
            disabled={busy || pwValue.length < 8}
            onPress={() => {
              const target = pwFor;
              setPwFor(null);
              setPwValue('');
              run(
                () => api.changePassword(target, pwValue),
                `Password changed for ${target}`,
              ).catch(() => {});
            }}
          />
          <Button title="Cancel" onPress={() => setPwFor(null)} />
        </View>
      )}

      {busy && <ActivityIndicator style={styles.spinner} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 8 },
  back: { color: '#06c', fontSize: 15, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '600', marginTop: 8 },
  section: { fontSize: 14, fontWeight: '600', marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
  },
  row: { marginTop: 8, gap: 6 },
  name: { fontSize: 15, fontWeight: '500' },
  select: { color: '#06c', fontSize: 14, alignSelf: 'center', paddingVertical: 6 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  pwBox: { marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, gap: 8 },
  error: { color: '#c33' },
  status: { color: '#2a7' },
  spinner: { marginTop: 12 },
});
