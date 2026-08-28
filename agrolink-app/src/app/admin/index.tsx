import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { auth } from '../../firebase/config';
import { getUserProfile } from '../../services/authService';
import {
  VerificationRequest,
  subscribeToAllVerificationRequests,
} from '../../services/verificationService';
import { ROLE_LABELS } from '../../store/MarketStore';
import { EcoColors, EcoFonts } from '../../constants/ecoTheme';

type Tab = 'pending' | 'history';

// Gate: only a Users doc with isAdmin === true may see this screen. There's
// no in-app way to grant that flag yet — the first admin is set by hand in
// the Firebase console (see firestore.rules for how it's enforced server-side).
export default function AdminVerificationScreen() {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [tab, setTab] = useState<Tab>('pending');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }
    getUserProfile(user.uid)
      .then((profile: any) => {
        if (profile?.isAdmin === true) {
          setIsAdmin(true);
        } else {
          router.replace('/dashboard');
        }
      })
      .finally(() => setCheckingAccess(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeToAllVerificationRequests(setRequests);
    return unsubscribe;
  }, [isAdmin]);

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);
  const history = useMemo(() => requests.filter((r) => r.status !== 'pending'), [requests]);
  const visible = tab === 'pending' ? pending : history;

  if (checkingAccess || !isAdmin) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={EcoColors.lime} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/dashboard')}>
            <Feather name="arrow-left" size={20} color={EcoColors.muted} />
          </Pressable>
          <Text style={styles.title}>Verification requests</Text>
          <View style={{ width: 20 }} />
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === 'pending' && styles.tabActive]}
            onPress={() => setTab('pending')}
          >
            <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
              Pending ({pending.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'history' && styles.tabActive]}
            onPress={() => setTab('history')}
          >
            <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
              History
            </Text>
          </Pressable>
        </View>

        {visible.length === 0 && <Text style={styles.emptyText}>Nothing here yet.</Text>}

        <View style={styles.list}>
          {visible.map((req) => (
            <Pressable
              key={req.id}
              style={styles.row}
              onPress={() => router.push({ pathname: '/admin/[id]', params: { id: req.id } })}
            >
              <View style={styles.rowIconBadge}>
                <Feather
                  name={
                    req.status === 'approved'
                      ? 'check-circle'
                      : req.status === 'rejected'
                        ? 'x-circle'
                        : 'clock'
                  }
                  size={16}
                  color={EcoColors.lime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {req.userName}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {ROLE_LABELS[req.role]} · {new Date(req.createdAt).toLocaleDateString()} ·{' '}
                  {req.documents.length} doc{req.documents.length === 1 ? '' : 's'}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={EcoColors.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: EcoColors.void },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: EcoColors.void,
  },
  container: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontFamily: EcoFonts.headingBold, fontSize: 18, color: EcoColors.text },
  tabs: {
    flexDirection: 'row',
    backgroundColor: EcoColors.cardBgActive,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9 },
  tabActive: { backgroundColor: EcoColors.lime },
  tabText: { fontFamily: EcoFonts.bodyBold, fontSize: 12, color: EcoColors.muted },
  tabTextActive: { color: EcoColors.onLime },
  emptyText: {
    fontFamily: EcoFonts.body,
    color: EcoColors.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 30,
  },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 16,
    padding: 14,
  },
  rowIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: EcoColors.cardBgActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.text },
  rowMeta: { fontFamily: EcoFonts.body, fontSize: 12, color: EcoColors.muted, marginTop: 2 },
});
