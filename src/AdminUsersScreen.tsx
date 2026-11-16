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
import * as api from './api';
import type { AdminUser } from './api';
import { colors, radius, type } from './theme';

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
    Alert.alert(`Access level — ${u.username}`, undefined, [
      {
        text: 'Admin · every user, every file',
        onPress: () =>
          run(() => api.setUserRole(u.username, 'admin'), `${u.username} is now admin`).catch(
            () => {},
          ),
      },
      {
        text: 'User · their own files only',
        onPress: () =>
          run(() => api.setUserRole(u.username, 'user'), `${u.username} is now user`).catch(
            () => {},
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>User management</Text>
          <View style={styles.headerSpace} />
        </View>

        {error !== '' && <Text style={styles.error}>{error}</Text>}
        {status !== '' && <Text style={styles.status}>{status}</Text>}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create a user</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            value={newName}
            onChangeText={setNewName}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 8 characters)"
            placeholderTextColor={colors.faint}
            secureTextEntry
            value={newPass}
            onChangeText={setNewPass}
          />
          <TouchableOpacity
            style={[styles.blockButton, styles.primaryButton, (busy || newName.trim() === '' || newPass.length < 8) && styles.disabled]}
            disabled={busy || newName.trim() === '' || newPass.length < 8}
            onPress={() => {
              const name = newName.trim();
              setNewName('');
              setNewPass('');
              run(() => api.createUser(name, newPass), `Created ${name}`).catch(() => {});
            }}>
            <Text style={styles.primaryButtonText}>Create user</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, styles.listTitle]}>
          {users.length} user{users.length === 1 ? '' : 's'}
        </Text>
        <View style={styles.card}>
          {users.map((u, i) => (
            <View key={u.username} style={[styles.userRow, i > 0 && styles.divider]}>
              <View style={styles.userIdent}>
                <Text style={styles.userName}>{u.username}</Text>
                <View style={styles.badges}>
                  <Text
                    style={[
                      styles.badge,
                      u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser,
                    ]}>
                    {u.role}
                  </Text>
                  {u.suspended && (
                    <Text style={[styles.badge, styles.badgeSuspended]}>suspended</Text>
                  )}
                </View>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity style={styles.pill} onPress={() => pickRole(u)}>
                  <Text style={styles.pillText}>Access</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pill}
                  onPress={() => {
                    setPwFor(u.username);
                    setPwValue('');
                  }}>
                  <Text style={styles.pillText}>Password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, u.suspended ? styles.pillGo : styles.pillDanger]}
                  disabled={busy}
                  onPress={() =>
                    run(
                      () => api.setSuspended(u.username, !u.suspended),
                      u.suspended ? `Unsuspended ${u.username}` : `Suspended ${u.username}`,
                    ).catch(() => {})
                  }>
                  <Text
                    style={[
                      styles.pillText,
                      u.suspended ? styles.pillGoText : styles.pillDangerText,
                    ]}>
                    {u.suspended ? 'Restore' : 'Suspend'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {pwFor !== null && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>New password — {pwFor}</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.faint}
              secureTextEntry
              autoFocus
              value={pwValue}
              onChangeText={setPwValue}
            />
            <View style={styles.pwButtons}>
              <TouchableOpacity
                style={[styles.blockButton, styles.primaryButton, (busy || pwValue.length < 8) && styles.disabled]}
                disabled={busy || pwValue.length < 8}
                onPress={() => {
                  const target = pwFor;
                  setPwFor(null);
                  setPwValue('');
                  run(() => api.changePassword(target, pwValue), `Password changed for ${target}`).catch(() => {});
                }}>
                <Text style={styles.primaryButtonText}>Save password</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.blockButton} onPress={() => setPwFor(null)}>
                <Text style={styles.quietButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {busy && <ActivityIndicator style={styles.spinner} color={colors.primary} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  back: { color: colors.primary, fontSize: 16, fontWeight: '600', width: 64 },
  headerSpace: { width: 64 },
  screenTitle: { flex: 1, textAlign: 'center', ...type.title },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { ...type.section, textTransform: 'uppercase' },
  listTitle: { marginTop: 8, marginBottom: -2 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 15,
    color: colors.fg,
    backgroundColor: colors.card,
  },
  blockButton: {
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  quietButtonText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  userRow: { gap: 10 },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingTop: 12,
  },
  userIdent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userName: { ...type.body, fontWeight: '600' },
  badges: { flexDirection: 'row', gap: 6 },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 99,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  badgeAdmin: { color: colors.primary, backgroundColor: colors.primarySoft },
  badgeUser: { color: colors.muted, backgroundColor: colors.bg },
  badgeSuspended: { color: colors.onWarning, backgroundColor: colors.warning },
  userActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    borderRadius: 99,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  pillText: { color: colors.fg, fontSize: 13, fontWeight: '600' },
  pillDanger: { borderColor: colors.danger },
  pillDangerText: { color: colors.danger },
  pillGo: { borderColor: colors.success },
  pillGoText: { color: colors.success },
  pwButtons: { gap: 8 },
  spinner: { marginTop: 8 },
  error: { color: colors.danger, fontSize: 14 },
  status: { color: colors.success, fontSize: 14 },
});
