import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { auth } from '../firebase/config';
import { getUserProfile } from '../services/authService';
import { useToast } from '../components/ToastProvider';
import { EcoColors, EcoFonts } from '../constants/ecoTheme';
import {
  CURRENCY,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  ROLE_LABELS,
  Role,
  useMarketStore,
} from '../store/MarketStore';
import AppShell from '../components/AppShell';

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'mobile_money', 'other'];

function timeAgo(iso: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const quickPaths: {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  route: '/marketplace' | '/logistics' | '/extension';
}[] = [
  {
    key: 'marketplace',
    label: 'Find produce',
    description: "Browse today's open listings",
    icon: 'cart-outline',
    route: '/marketplace',
  },
  {
    key: 'logistics',
    label: 'Move a load',
    description: 'See delivery opportunities',
    icon: 'truck-outline',
    route: '/logistics',
  },
  {
    key: 'extension',
    label: 'Grow smarter',
    description: 'Meet trusted advisers',
    icon: 'sprout-outline',
    route: '/extension',
  },
];

export default function DashboardScreen() {
  const { listings, orders, activeRole, currentUser, setCurrentUser, setRoles, markOrderPaid } =
    useMarketStore();
  const { showAlert } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);

  const handleMarkPaid = async (orderId: string, method: PaymentMethod) => {
    setPaymentSaving(true);
    try {
      await markOrderPaid(orderId, method);
      setMarkingPaidId(null);
    } catch (error: any) {
      showAlert('Could not update payment', error.message || 'Please try again.', 'error');
    } finally {
      setPaymentSaving(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError('');

      const user = auth.currentUser;
      if (!user) {
        setError('No user logged in');
        return;
      }

      const profile = await getUserProfile(user.uid);

      if (profile && profile.personalInfo) {
        const fullName = `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`.trim();
        setCurrentUser({
          id: user.uid,
          name: fullName,
          email: profile.email,
          isAdmin: profile.isAdmin === true,
        });
        // `buyer` is open to everyone; `seller`/`transporter` only unlock
        // once an admin has approved a verification request for that role
        // (see verificationService.ts and the /verification screen).
        const verifiedRoles: Role[] = Array.isArray(profile.verifiedRoles)
          ? profile.verifiedRoles.filter((r: string): r is Role => r === 'seller' || r === 'transporter')
          : [];
        setRoles(['buyer', ...verifiedRoles]);
      } else {
        setError('User profile not found');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const myId = currentUser?.id || 'me';
  const myTransactions = useMemo(
    () =>
      orders.filter((order) =>
        activeRole === 'buyer'
          ? order.buyerId === myId
          : activeRole === 'seller'
            ? order.sellerId === myId
            : order.transporterId === myId
      ),
    [orders, activeRole, myId]
  );
  const currentTransactions = myTransactions.filter((t) =>
    activeTab === 'current' ? t.status !== 'delivered' : t.status === 'delivered'
  );
  const stats = useMemo(
    () => ({
      active: myTransactions.filter((t) => t.status !== 'delivered').length,
      moving: myTransactions.filter((t) => t.status === 'in_transit').length,
      complete: myTransactions.filter((t) => t.status === 'delivered').length,
    }),
    [myTransactions]
  );
  const freshToday = useMemo(
    () => listings.filter((t) => t.status === 'listed').slice(0, 3),
    [listings]
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={EcoColors.lime} />
      </View>
    );
  }

  return (
    <AppShell active="home">
      <ScrollView contentContainerStyle={styles.container}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={fetchUserData}>
              <Text style={styles.retryButton}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Good to see you</Text>
          <Text style={styles.heroHeading}>
            Your {ROLE_LABELS[activeRole].toLowerCase()} market is alive.
          </Text>
          <Text style={styles.heroSubtext}>
            Keep an eye on every trade, from the first listing to a safe arrival.
          </Text>
          <View style={styles.marketOpenPill}>
            <View style={styles.marketOpenDot} />
            <Text style={styles.marketOpenText}>Market open</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Your pulse</Text>
            <Feather name="activity" size={16} color={EcoColors.lime} />
          </View>
          <View style={styles.pulseRow}>
            <Metric label="Active" value={stats.active} />
            <Metric label="Moving" value={stats.moving} />
            <Metric label="Complete" value={stats.complete} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick paths</Text>
          <Text style={styles.sectionSubtitle}>Everything you need, close at hand.</Text>
          <View style={styles.quickPathGrid}>
            {quickPaths.map(({ key, label, description, icon, route }) => (
              <Pressable key={key} style={styles.quickPathCard} onPress={() => router.push(route)}>
                <View style={styles.quickPathIconBadge}>
                  <MaterialCommunityIcons name={icon} size={18} color={EcoColors.lime} />
                </View>
                <View style={styles.quickPathTextRow}>
                  <Text style={styles.quickPathLabel}>{label}</Text>
                  <Feather name="arrow-right" size={14} color={EcoColors.muted} />
                </View>
                <Text style={styles.quickPathDescription}>{description}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.activityHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Your activity</Text>
              <Text style={styles.sectionSubtitle}>Transactions that matter to you.</Text>
            </View>
            <View style={styles.activityTabs}>
              <Pressable
                style={[styles.activityTab, activeTab === 'current' && styles.activityTabActive]}
                onPress={() => setActiveTab('current')}
              >
                <Text
                  style={[
                    styles.activityTabText,
                    activeTab === 'current' && styles.activityTabTextActive,
                  ]}
                >
                  Current
                </Text>
              </Pressable>
              <Pressable
                style={[styles.activityTab, activeTab === 'past' && styles.activityTabActive]}
                onPress={() => setActiveTab('past')}
              >
                <Text
                  style={[
                    styles.activityTabText,
                    activeTab === 'past' && styles.activityTabTextActive,
                  ]}
                >
                  Past
                </Text>
              </Pressable>
            </View>
          </View>

          {currentTransactions.length === 0 && (
            <Text style={styles.emptyText}>
              Nothing here yet. The market is ready when you are.
            </Text>
          )}
          <View style={styles.activityList}>
            {currentTransactions.map((tx) => {
              const expanded = expandedId === tx.id;
              const latestUpdate =
                tx.updates.length > 0
                  ? [...tx.updates].sort(
                      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )[0]
                  : null;
              return (
                <View key={tx.id} style={styles.activityCard}>
                  <Pressable
                    style={styles.activityRow}
                    onPress={() => setExpandedId(expanded ? null : tx.id)}
                  >
                    <View style={styles.activityIconBadge}>
                      <Feather name={statusIcon(tx.status)} size={15} color={EcoColors.lime} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityItem} numberOfLines={1}>
                        {tx.item}
                      </Text>
                      <Text style={styles.activityMeta} numberOfLines={1}>
                        {tx.quantity} {tx.unit} · {tx.origin}
                      </Text>
                    </View>
                    <Feather
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={EcoColors.muted}
                    />
                  </Pressable>
                  {expanded && (
                    <>
                      <View style={styles.activityDetail}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityDetailLabel}>Destination</Text>
                          <Text style={styles.activityDetailValue}>
                            {tx.destination || 'Not assigned yet'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityDetailLabel}>Value</Text>
                          <Text style={styles.activityDetailValue}>
                            {CURRENCY}
                            {tx.price.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.activityDetail, styles.updateDetail]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityDetailLabel}>Last update</Text>
                          <Text style={styles.activityDetailValue}>
                            {latestUpdate
                              ? `${latestUpdate.status} · ${timeAgo(latestUpdate.timestamp)}`
                              : 'No updates yet'}
                          </Text>
                        </View>
                        {latestUpdate?.lat != null && latestUpdate?.lng != null && (
                          <Pressable
                            onPress={() =>
                              Linking.openURL(
                                `https://www.google.com/maps?q=${latestUpdate.lat},${latestUpdate.lng}`
                              )
                            }
                          >
                            <Text style={styles.mapLink}>View on map</Text>
                          </Pressable>
                        )}
                      </View>
                      <View style={[styles.activityDetail, styles.paymentDetail]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityDetailLabel}>Payment</Text>
                          <Text style={styles.activityDetailValue}>
                            {tx.paymentStatus === 'paid'
                              ? `Paid via ${PAYMENT_METHOD_LABELS[tx.paymentMethod || 'other']}${
                                  tx.paidAt ? ` · ${timeAgo(tx.paidAt)}` : ''
                                }`
                              : 'Unpaid'}
                          </Text>
                        </View>
                        {activeRole === 'seller' && tx.paymentStatus !== 'paid' && (
                          markingPaidId === tx.id ? (
                            <View style={styles.paymentMethodRow}>
                              {PAYMENT_METHODS.map((method) => (
                                <Pressable
                                  key={method}
                                  style={styles.paymentMethodChip}
                                  disabled={paymentSaving}
                                  onPress={() => handleMarkPaid(tx.id, method)}
                                >
                                  <Text style={styles.paymentMethodChipText}>
                                    {PAYMENT_METHOD_LABELS[method]}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                          ) : (
                            <Pressable onPress={() => setMarkingPaidId(tx.id)}>
                              <Text style={styles.mapLink}>Mark as paid</Text>
                            </Pressable>
                          )
                        )}
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.activityHeaderRow}>
            <Text style={styles.sectionTitle}>Fresh today</Text>
            <Pressable onPress={() => router.push('/marketplace')}>
              <Text style={styles.seeMarketLink}>See market</Text>
            </Pressable>
          </View>
          <View style={styles.freshList}>
            {freshToday.map((listing) => (
              <Pressable
                key={listing.id}
                style={styles.freshRow}
                onPress={() => router.push('/marketplace')}
              >
                <Image source={{ uri: listing.imageUrl }} style={styles.freshImage} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityItem} numberOfLines={1}>
                    {listing.item}
                  </Text>
                  <Text style={styles.activityMeta} numberOfLines={1}>
                    {listing.quantity} {listing.unit} · {timeAgo(listing.createdAt)}
                  </Text>
                </View>
                <Text style={styles.freshPrice}>
                  {CURRENCY}
                  {listing.price}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </AppShell>
  );
}

function statusIcon(status: string): React.ComponentProps<typeof Feather>['name'] {
  if (status === 'in_transit') return 'truck';
  if (status === 'delivered') return 'check-circle';
  if (status === 'ordered') return 'activity';
  return 'package';
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: EcoColors.void,
  },
  container: { flexGrow: 1, padding: 18, paddingBottom: 32, gap: 22 },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 15,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: { fontFamily: EcoFonts.body, color: '#fca5a5', fontSize: 14, marginBottom: 10 },
  retryButton: { fontFamily: EcoFonts.bodyBold, color: EcoColors.lime, fontSize: 14 },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    backgroundColor: EcoColors.cardBgActive,
    padding: 22,
  },
  eyebrow: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: EcoColors.lime,
  },
  heroHeading: {
    fontFamily: EcoFonts.headingExtraBold,
    fontSize: 24,
    color: EcoColors.text,
    marginTop: 10,
  },
  heroSubtext: {
    fontFamily: EcoFonts.body,
    fontSize: 13,
    color: EcoColors.muted,
    marginTop: 8,
    lineHeight: 19,
  },
  marketOpenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 14,
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    backgroundColor: EcoColors.cardBg,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  marketOpenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: EcoColors.lime },
  marketOpenText: { fontFamily: EcoFonts.bodyBold, fontSize: 11, color: EcoColors.lime },
  section: {},
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: EcoFonts.headingBold, fontSize: 18, color: EcoColors.text },
  sectionSubtitle: { fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.muted, marginTop: 4 },
  pulseRow: { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    backgroundColor: EcoColors.cardBg,
    padding: 14,
  },
  metricLabel: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: EcoColors.muted,
  },
  metricValue: {
    fontFamily: EcoFonts.headingExtraBold,
    fontSize: 24,
    color: EcoColors.lime,
    marginTop: 8,
  },
  quickPathGrid: { gap: 10, marginTop: 12 },
  quickPathCard: {
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 20,
    padding: 16,
  },
  quickPathIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: EcoColors.cardBgActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPathTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  quickPathLabel: { fontFamily: EcoFonts.bodyBold, fontSize: 15, color: EcoColors.text },
  quickPathDescription: {
    fontFamily: EcoFonts.body,
    fontSize: 12,
    color: EcoColors.muted,
    marginTop: 4,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activityTabs: { flexDirection: 'row', backgroundColor: EcoColors.cardBgActive, borderRadius: 12, padding: 3 },
  activityTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9 },
  activityTabActive: { backgroundColor: EcoColors.lime },
  activityTabText: { fontFamily: EcoFonts.bodyBold, fontSize: 11, color: EcoColors.muted },
  activityTabTextActive: { color: EcoColors.onLime },
  emptyText: {
    fontFamily: EcoFonts.body,
    color: EcoColors.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  activityList: { gap: 10 },
  activityCard: {
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 18,
    padding: 14,
  },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: EcoColors.cardBgActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityItem: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.text },
  activityMeta: { fontFamily: EcoFonts.body, fontSize: 12, color: EcoColors.muted, marginTop: 2 },
  activityDetail: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    backgroundColor: EcoColors.cardBgActive,
    borderRadius: 14,
    padding: 12,
  },
  activityDetailLabel: { fontFamily: EcoFonts.body, fontSize: 11, color: EcoColors.muted },
  activityDetailValue: { fontFamily: EcoFonts.bodySemiBold, fontSize: 13, color: EcoColors.text, marginTop: 2 },
  updateDetail: { marginTop: 8, alignItems: 'center' },
  paymentDetail: { marginTop: 8, alignItems: 'center' },
  paymentMethodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  paymentMethodChip: {
    borderWidth: 1,
    borderColor: EcoColors.lime,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  paymentMethodChipText: { fontFamily: EcoFonts.bodyBold, fontSize: 11, color: EcoColors.lime },
  mapLink: { fontFamily: EcoFonts.bodyBold, fontSize: 12, color: EcoColors.lime },
  seeMarketLink: { fontFamily: EcoFonts.bodyBold, fontSize: 12, color: EcoColors.lime },
  freshList: { gap: 10 },
  freshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: EcoColors.cardBg,
    borderRadius: 16,
    padding: 10,
  },
  freshImage: { width: 46, height: 46, borderRadius: 12 },
  freshPrice: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.lime },
});
