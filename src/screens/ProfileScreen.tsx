import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as api from '../api';
import * as db from '../db';
import { Badge } from '../components/Badge';
import { Icon } from '../components/Icon';
import { ListRow } from '../components/ListRow';
import { ListSection } from '../components/ListSection';
import { LoadingState } from '../components/LoadingState';
import { colors, radius, spacing, type } from '../theme';

/** J4 — account: identity block + inset-grouped account rows. */
export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<{ username: string; admin: boolean } | null>(null);
  const [server] = useState(() => api.getServerUrl());

  useEffect(() => {
    api.me().then(setMe).catch(() => router.replace('/login'));
  }, []);

  function resetIndex() {
    Alert.alert(
      'Reset local index?',
      'Clears the upload history on this phone. Nothing on the server is touched — the next sync will re-upload everything.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            db.resetIndex().then(() => router.back()).catch(() => router.back());
          },
        },
      ],
    );
  }

  if (me === null) {
    return (
      <SafeAreaView style={styles.screen} edges={['left', 'right']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{me.username[0].toUpperCase()}</Text>
          </View>
          <Text style={type.title}>{me.username}</Text>
          <Badge label={me.admin ? 'Admin' : 'User'} variant={me.admin ? 'admin' : 'user'} />
          <Text style={type.sub}>Server {server}</Text>
        </View>

        <ListSection style={styles.card}>
          {me.admin && (
            <ListRow onPress={() => router.push('/users')} style={styles.row}>
              <Text style={styles.rowLabel}>User management</Text>
              <Icon name="chevron-forward" size={18} color={colors.faint} />
            </ListRow>
          )}
          <ListRow
            divider={me.admin}
            onPress={() => router.push('/shared')}
            style={styles.row}>
            <Text style={styles.rowLabel}>Sharing</Text>
            <Icon name="chevron-forward" size={18} color={colors.faint} />
          </ListRow>
          <ListRow divider onPress={resetIndex} style={styles.row}>
            <Text style={[styles.rowLabel, styles.dangerText]}>Reset local index</Text>
          </ListRow>
          <ListRow
            divider
            onPress={() => api.logout().then(() => router.replace('/login'))}
            style={styles.row}>
            <Text style={[styles.rowLabel, styles.dangerText]}>Sign out</Text>
          </ListRow>
        </ListSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xxl },
  identity: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarText: { ...type.display, color: colors.primary },
  card: { marginHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowLabel: { ...type.headline },
  dangerText: { color: colors.danger },
});
