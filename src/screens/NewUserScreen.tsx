import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { createUser } from '../api';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { colors, spacing, type } from '../theme';

/** J7 — add a family member: username + password, create, back to the list. */
export function NewUserScreen() {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      await createUser(username.trim(), password);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader title="New user" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}
        keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>Who is joining?</Text>
            <View style={styles.fields}>
              <TextField
                placeholder="Name (username)"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
              />
              <TextField
                placeholder="Password (min 8 characters)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>
          {error !== '' && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton
            title="Create user"
            loading={busy}
            disabled={username.trim() === '' || password.length < 8}
            onPress={submit}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xxl },
  card: { marginHorizontal: spacing.lg, gap: spacing.md },
  group: { gap: spacing.sm },
  fields: { gap: spacing.md },
  sectionTitle: { ...type.caption, textTransform: 'uppercase' },
  error: { ...type.sub, color: colors.danger },
});
