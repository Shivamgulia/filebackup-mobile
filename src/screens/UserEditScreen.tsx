import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { changePassword, listUsers, setSuspended, setUserRole, type AdminUser } from '../api';
import { colors, radius, spacing, type } from '../theme';

/** J6 — edit one user: access level, suspension, password. */
export function UserEditScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState('');

  const reload = useCallback(async () => {
    const all = await listUsers();
    const found = all.find(u => u.username === username) ?? null;
    setUser(found);
    if (found === null) setError(`No user: ${username}`);
    return found;
  }, [username]);

  useEffect(() => {
    void Promise.resolve()
      .then(() => reload())
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, [reload]);

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
    Alert.alert('Access level', `What should ${u.username} be able to do?`, [
      {
        text: 'Admin — manage all users and files',
        onPress: () => run(() => setUserRole(u.username, 'admin'), `${u.username} is now admin`).catch(() => {}),
      },
      {
        text: 'User — their own files only',
        onPress: () => run(() => setUserRole(u.username, 'user'), `${u.username} is now user`).catch(() => {}),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (user === null) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.secondary} />
        {error !== '' && <Text style={styles.error}>{error}</Text>}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle} numberOfLines={1}>{user.username}</Text>
          <View style={{ width: 64 }} />
        </View>

        {error !== '' && <Text style={styles.error}>{error}</Text>}
        {status !== '' && <Text style={styles.status}>{status}</Text>}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Access level</Text>
          <TouchableOpacity style={styles.row} onPress={() => pickRole(user)} hitSlop={{ top: 8, bottom: 8 }}>
            <Text style={styles.rowLabel}>
              {user.role === 'admin' ? 'Admin — all users and files' : 'User — their own files'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          {user.role !== 'admin' && (
            <TouchableOpacity
              style={styles.row}
              disabled={busy}
              onPress={() =>
                run(
                  () => setSuspended(user.username, !user.suspended),
                  user.suspended ? 'Account restored' : 'Account suspended',
                ).catch(() => {})
              }>
              <Text style={[styles.rowLabel, user.suspended ? styles.goText : styles.dangerText]}>
                {user.suspended ? 'Restore access' : 'Suspend account'}
              </Text>
            </TouchableOpacity>
          )}
          {user.role === 'admin' && !user.suspended && (
            <Text style={type.sub}>
              Configured admins cannot be suspended from the app.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Change password</Text>
          <TextInput
            style={styles.input}
            placeholder="New password (min 8 characters)"
            placeholderTextColor={colors.faint}
            secureTextEntry
            value={pw}
            onChangeText={setPw}
          />
          <TouchableOpacity
            style={[styles.primaryButton, (busy || pw.length < 8) && styles.disabled]}
            disabled={busy || pw.length < 8}
            onPress={() => {
              const target = user.username;
              setPw('');
              run(() => changePassword(target, pw), 'Password changed').catch(() => {});
            }}>
            <Text style={styles.primaryButtonText}>Save password</Text>
          </TouchableOpacity>
        </View>

        {busy && <ActivityIndicator style={styles.spinner} color={colors.secondary} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  content: { paddingBottom: spacing.xxl, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { color: colors.primary, fontSize: 17, fontWeight: '600', width: 64 },
  screenTitle: { flex: 1, textAlign: 'center', ...type.headline },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { ...type.caption, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  rowLabel: { ...type.headline },
  chevron: { color: colors.faint, fontSize: 22, fontWeight: '600' },
  goText: { color: colors.success },
  dangerText: { color: colors.danger },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.control,
    padding: 12,
    fontSize: 17,
    color: colors.fg,
    backgroundColor: colors.card,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.control,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  spinner: { marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 15, marginHorizontal: spacing.lg },
  status: { color: colors.success, fontSize: 15, marginHorizontal: spacing.lg },
});
