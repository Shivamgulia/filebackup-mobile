import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as api from '../api';
import * as db from '../db';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, layout, radius, spacing, type } from '../theme';

/** J4 — account: iOS-Settings-style identity card + account rows. */
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
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom }]}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{me.username[0].toUpperCase()}</Text>
          </View>
          <Text style={type.title}>{me.username}</Text>
          <Badge label={me.admin ? 'Admin' : 'User'} variant={me.admin ? 'admin' : 'user'} />
          <Text style={type.sub}>Server {server}</Text>
        </View>

        <Card style={styles.card}>
          {me.admin && (
            <TouchableOpacity style={styles.row} onPress={() => router.push('/users')} hitSlop={{ top: 8, bottom: 8 }}>
              <Text style={styles.rowLabel}>User management</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.row, me.admin && styles.divider]}
            onPress={() => router.push('/shared')}
            hitSlop={{ top: 8, bottom: 8 }}>
            <Text style={styles.rowLabel}>Sharing</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, styles.divider]} onPress={resetIndex} hitSlop={{ top: 8, bottom: 8 }}>
            <Text style={[styles.rowLabel, styles.dangerText]}>Reset local index</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, styles.divider]}
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => api.logout().then(() => router.replace('/login'))}>
            <Text style={[styles.rowLabel, styles.dangerText]}>Sign out</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { justifyContent: 'center' },
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
  avatarText: { color: colors.primary, fontSize: 40, fontWeight: '600' },
  card: { marginHorizontal: spacing.lg, paddingVertical: 0, paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.row,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowLabel: { ...type.headline },
  chevron: { color: colors.faint, fontSize: 22, fontWeight: '600' },
  dangerText: { color: colors.danger },
});
