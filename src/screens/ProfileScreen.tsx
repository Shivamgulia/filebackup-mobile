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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as api from '../api';
import * as db from '../db';
import { colors, radius, spacing, type } from '../theme';

/** J4 — account: iOS-Settings-style identity card + account rows. */
export function ProfileScreen() {
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
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{me.username[0].toUpperCase()}</Text>
          </View>
          <Text style={type.title}>{me.username}</Text>
          <Text style={[styles.badge, me.admin ? styles.badgeAdmin : styles.badgeUser]}>
            {me.admin ? 'Admin' : 'User'}
          </Text>
          <Text style={type.sub}>Server {server}</Text>
        </View>

        <View style={styles.card}>
          {me.admin && (
            <TouchableOpacity style={styles.row} onPress={() => router.push('/users')} hitSlop={{ top: 8, bottom: 8 }}>
              <Text style={styles.rowLabel}>User management</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.row, me.admin && styles.divider]} onPress={resetIndex} hitSlop={{ top: 8, bottom: 8 }}>
            <Text style={[styles.rowLabel, styles.dangerText]}>Reset local index</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, styles.divider]}
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => api.logout().then(() => router.replace('/login'))}>
            <Text style={[styles.rowLabel, styles.dangerText]}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { justifyContent: 'center' },
  content: { paddingBottom: spacing.xxl },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  back: { color: colors.primary, fontSize: 17, fontWeight: '600' },
  identity: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarText: { color: colors.primary, fontSize: 40, fontWeight: '600' },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 99,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  badgeAdmin: { color: colors.primary, backgroundColor: colors.primarySoft },
  badgeUser: { color: colors.muted, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowLabel: { ...type.headline },
  chevron: { color: colors.faint, fontSize: 22, fontWeight: '600' },
  dangerText: { color: colors.danger },
});
