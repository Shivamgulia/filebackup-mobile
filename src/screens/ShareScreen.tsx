import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { createShare } from '../api';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { colors, radius, spacing, type } from '../theme';

const EXPIRIES = [
  { key: 'never', label: 'Never', days: 0 },
  { key: '1d', label: '1 day', days: 1 },
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
] as const;

/** Share one file (`path`) or a multi-select (`paths`, a JSON array string). */
export function ShareScreen() {
  const insets = useSafeAreaInsets();
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
      // The list refetches on focus; the new share is the confirmation.
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {targets.length === 0 ? (
          <EmptyState text="Nothing to share" />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
            keyboardShouldPersistTaps="handled">
            <Card style={styles.card}>
              <SectionLabel>What</SectionLabel>
              {sharePaths.map(p => (
                <Text key={p} style={styles.path} numberOfLines={1}>
                  {p}
                </Text>
              ))}
            </Card>

            <Card style={styles.card}>
              <TextField
                label="Username"
                placeholder="Who is it for?"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                value={recipient}
                onChangeText={t => {
                  setRecipient(t);
                  setError('');
                }}
              />
            </Card>

            <Card style={styles.card}>
              <SectionLabel>Permission</SectionLabel>
              <View style={styles.segments} accessibilityRole="radiogroup">
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: permission === 'read' }}
                  style={[styles.segment, permission === 'read' && styles.segmentActive]}
                  onPress={() => setPermission('read')}>
                  <Text style={[styles.segmentText, permission === 'read' && styles.segmentTextActive]}>
                    Read
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: permission === 'read_write' }}
                  style={[styles.segment, permission === 'read_write' && styles.segmentActive]}
                  onPress={() => setPermission('read_write')}>
                  <Text style={[styles.segmentText, permission === 'read_write' && styles.segmentTextActive]}>
                    Read-write
                  </Text>
                </Pressable>
              </View>
            </Card>

            <Card style={styles.card}>
              <SectionLabel>Expires</SectionLabel>
              <View style={styles.segments} accessibilityRole="radiogroup">
                {EXPIRIES.map(option => (
                  <Pressable
                    key={option.key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: expiry === option.key }}
                    style={[styles.segment, expiry === option.key && styles.segmentActive]}
                    onPress={() => setExpiry(option.key)}>
                    <Text style={[styles.segmentText, expiry === option.key && styles.segmentTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            {single && (
              <Card style={[styles.card, styles.switchRow]}>
                <View style={styles.switchText}>
                  <Text style={type.headline}>Share the whole folder</Text>
                  <Text style={styles.hint}>{parentOf(targets[0])}</Text>
                </View>
                <Switch value={wholeFolder} onValueChange={setWholeFolder} />
              </Card>
            )}

            {error !== '' && <Text style={styles.error}>{error}</Text>}

            <PrimaryButton title="Create share" loading={busy} onPress={submit} style={styles.cta} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
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
  content: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  path: type.bodySm,
  segments: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  segment: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radius.control,
    borderCurve: 'continuous',
    backgroundColor: colors.fill,
  },
  segmentActive: { backgroundColor: colors.primarySoft },
  segmentText: { ...type.bodySm, color: colors.muted, fontWeight: '600' },
  segmentTextActive: { color: colors.primary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchText: { flex: 1, gap: spacing.xs },
  hint: type.meta,
  cta: { marginTop: spacing.sm },
  error: { ...type.sub, color: colors.danger, textAlign: 'center' },
});
