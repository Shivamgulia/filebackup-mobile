import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { changePassword, listUsers, setSuspended, setUserRole, type AdminUser } from '../api';
import { Card } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { Icon } from '../components/Icon';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { LoadingState } from '../components/LoadingState';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { colors, spacing, type } from '../theme';

/** J6 — edit one user: access level, suspension, password. */
export function UserEditScreen() {
  const insets = useSafeAreaInsets();
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

  function savePassword() {
    const target = user?.username;
    if (target === undefined) return;
    const next = pw;
    setPw('');
    run(() => changePassword(target, next), 'Password changed').catch(() => {});
  }

  if (user === null) {
    return (
      <SafeAreaView style={styles.screen} edges={['left', 'right']}>
        {error !== '' ? (
          <ErrorState message={error} onRetry={() => void reload().catch(() => {})} />
        ) : (
          <LoadingState />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <Stack.Screen options={{ title: user.username }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
        keyboardShouldPersistTaps="handled">
        {error !== '' && <Text style={styles.error}>{error}</Text>}
        {status !== '' && <Text style={styles.status}>{status}</Text>}

        <SectionLabel>Access level</SectionLabel>
        <ListSection>
          <ListRow onPress={() => pickRole(user)} style={styles.row}>
            <Text style={styles.rowLabel}>
              {user.role === 'admin' ? 'Admin — all users and files' : 'User — their own files'}
            </Text>
            <Icon name="chevron-forward" size={18} color={colors.faint} />
          </ListRow>
          {user.role !== 'admin' && (
            <ListRow
              divider
              disabled={busy}
              onPress={() =>
                run(
                  () => setSuspended(user.username, !user.suspended),
                  user.suspended ? 'Account restored' : 'Account suspended',
                ).catch(() => {})
              }
              style={styles.row}>
              <Text style={[styles.rowLabel, user.suspended ? styles.goText : styles.dangerText]}>
                {user.suspended ? 'Restore access' : 'Suspend account'}
              </Text>
            </ListRow>
          )}
        </ListSection>
        {user.role === 'admin' && !user.suspended && (
          <Text style={styles.note}>Configured admins cannot be suspended from the app.</Text>
        )}

        <Card style={styles.card}>
          <TextField
            label="New password"
            hint="At least 8 characters"
            placeholder="New password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            value={pw}
            onChangeText={setPw}
            onSubmitEditing={savePassword}
          />
          <PrimaryButton
            title="Save password"
            loading={busy}
            disabled={pw.length < 8}
            onPress={savePassword}
          />
        </Card>

        {busy && <ActivityIndicator style={styles.spinner} color={colors.secondary} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowLabel: { ...type.headline, flexShrink: 1 },
  goText: { color: colors.success },
  dangerText: { color: colors.danger },
  note: type.meta,
  spinner: { marginTop: spacing.sm },
  error: { ...type.sub, color: colors.danger },
  status: { ...type.sub, color: colors.success },
});
