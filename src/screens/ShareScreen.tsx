import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { createShare } from '../api';
import { colors, radius, spacing, type } from '../theme';

const EXPIRIES = [
  { key: 'never', label: 'Never', days: 0 },
  { key: '1d', label: '1 day', days: 1 },
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
] as const;

/** Share one file (`path`) or a multi-select (`paths`, a JSON array string). */
export function ShareScreen() {
  const { path, paths } = useLocalSearchParams<{ path?: string; paths?: string }>();
  const targets = useMemo(() => parseTargets(path, paths), [path, paths]);
  const [recipient, setRecipient] = useState('');
  const [permission, setPermission] = useState<'read' | 'read_write'>('read');
  const [expiry, setExpiry] = useState<(typeof EXPIRIES)[number]['key']>('never');
  const [wholeFolder, setWholeFolder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const single = targets.length === 1;
  const sharePaths = wholeFolder && single ? [parentOf(targets[0])] : targets;

  async function submit() {
    const user = recipient.trim();
    if (user === '') {
      setError('Enter the username to share with');
      return;
    }
    const days = EXPIRIES.find(e => e.key === expiry)!.days;
    const expiresAt = days === 0 ? null : new Date(Date.now() + days * 86_400_000).toISOString();
    setBusy(true);
    setError('');
    try {
      for (const p of sharePaths) {
        await createShare({ targetUsername: user, resourcePath: p, permission, expiresAt });
      }
      Alert.alert(
        'Shared',
        `${sharePaths.length} item${sharePaths.length === 1 ? '' : 's'} shared with ${user}. ` +
          'They can see it after accepting.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Share</Text>
        <View style={styles.back} />
      </View>

      {targets.length === 0 ? (
        <Text style={[styles.error, styles.empty]}>Nothing to share</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={type.caption}>WHAT</Text>
            {sharePaths.map(p => (
              <Text key={p} style={styles.path} numberOfLines={1}>
                {p}
              </Text>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={type.caption}>SHARE WITH</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              value={recipient}
              onChangeText={t => {
                setRecipient(t);
                setError('');
              }}
            />
          </View>

          <View style={styles.card}>
            <Text style={type.caption}>PERMISSION</Text>
            <View style={styles.segments}>
              <Pressable
                style={[styles.segment, permission === 'read' && styles.segmentActive]}
                onPress={() => setPermission('read')}>
                <Text style={[styles.segmentText, permission === 'read' && styles.segmentTextActive]}>Read</Text>
              </Pressable>
              <Pressable
                style={[styles.segment, permission === 'read_write' && styles.segmentActive]}
                onPress={() => setPermission('read_write')}>
                <Text style={[styles.segmentText, permission === 'read_write' && styles.segmentTextActive]}>
                  Read-write
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={type.caption}>EXPIRES</Text>
            <View style={styles.segments}>
              {EXPIRIES.map(option => (
                <Pressable
                  key={option.key}
                  style={[styles.segment, expiry === option.key && styles.segmentActive]}
                  onPress={() => setExpiry(option.key)}>
                  <Text style={[styles.segmentText, expiry === option.key && styles.segmentTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {single && (
            <View style={[styles.card, styles.switchRow]}>
              <View style={styles.switchText}>
                <Text style={type.headline}>Share the whole folder</Text>
                <Text style={styles.hint}>{parentOf(targets[0])}</Text>
              </View>
              <Switch value={wholeFolder} onValueChange={setWholeFolder} />
            </View>
          )}

          {error !== '' && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={[styles.cta, busy && styles.disabled]} disabled={busy} onPress={submit}>
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.ctaText}>Create share</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function parseTargets(path?: string, paths?: string): string[] {
  if (paths) {
    try {
      const parsed: unknown = JSON.parse(paths);
      if (Array.isArray(parsed)) return parsed.filter((p): p is string => typeof p === 'string' && p !== '');
    } catch {
      // fall through to the single-path param
    }
  }
  return typeof path === 'string' && path !== '' ? [path] : [];
}

/** `user/photos/a.jpg` → `user/photos`; a top-level path is returned unchanged. */
function parentOf(path: string): string {
  const parts = path.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : path;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { color: colors.primary, fontSize: 17, fontWeight: '600', width: 64 },
  title: { flex: 1, textAlign: 'center', ...type.headline },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  path: { ...type.body, fontSize: 15 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 17,
    color: colors.fg,
  },
  segments: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    backgroundColor: colors.bg,
  },
  segmentActive: { backgroundColor: colors.primarySoft },
  segmentText: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  segmentTextActive: { color: colors.primary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchText: { flex: 1, gap: 2 },
  hint: { fontSize: 13, color: colors.muted },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.control,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ctaText: { color: colors.onPrimary, fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  error: { color: colors.danger, textAlign: 'center' },
  empty: { marginTop: spacing.xxl },
});
