import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import {
  useMarketStore,
  Coverage,
  COVERAGE_LABELS,
} from '../store/MarketStore';
import { EcoColors, EcoFonts } from '../constants/ecoTheme';
import AppShell from '../components/AppShell';

const coverageOptions: Coverage[] = ['district', 'province', 'country', 'cross_border'];

export default function LogisticsScreen() {
  const {
    activeRole,
    currentUser,
    orders,
    transporterProfile,
    saveTransporterProfile,
    acceptDelivery,
    markDelivered,
    addDeliveryUpdate,
  } = useMarketStore();
  const myId = currentUser?.id || 'me';

  const [profileLocation, setProfileLocation] = useState(transporterProfile?.location ?? '');
  const [profileCoverage, setProfileCoverage] = useState<Coverage>(
    transporterProfile?.coverage ?? 'district'
  );
  const [profileSaved, setProfileSaved] = useState(false);

  const [activeUpdateId, setActiveUpdateId] = useState<string | null>(null);
  const [updateLocation, setUpdateLocation] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');

  const myDeliveries = orders.filter(
    (order) => order.status === 'in_transit' && order.transporterId === myId
  );
  const availableJobs = orders.filter((order) => order.status === 'ordered');

  const handleSaveProfile = () => {
    saveTransporterProfile({ location: profileLocation, coverage: profileCoverage });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handlePostUpdate = async (id: string) => {
    if (!updateLocation || !updateStatus) return;
    try {
      await addDeliveryUpdate(id, { location: updateLocation, status: updateStatus });
      setUpdateLocation('');
      setUpdateStatus('');
      setActiveUpdateId(null);
    } catch (error: any) {
      Alert.alert('Could not post update', error.message || 'Please try again.');
    }
  };

  const handleAcceptDelivery = async (id: string) => {
    try {
      await acceptDelivery(id);
    } catch (error: any) {
      Alert.alert('Could not accept job', error.message || 'Please try again.');
    }
  };

  const handleMarkDelivered = async (id: string) => {
    try {
      await markDelivered(id);
    } catch (error: any) {
      Alert.alert('Could not mark delivered', error.message || 'Please try again.');
    }
  };

  if (activeRole !== 'transporter') {
    return (
      <AppShell active="logistics">
        <View style={styles.gateWrap}>
          <View style={styles.gateIconBadge}>
            <Feather name="alert-circle" size={28} color={EcoColors.lime} />
          </View>
          <Text style={styles.gateTitle}>Transporter view only.</Text>
          <Text style={styles.gateSubtext}>
            Switch to your Transporter mode to manage a service area and accept delivery work.
          </Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell active="logistics">
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>Transporter control room</Text>
          <Text style={styles.heading}>Keep commerce moving.</Text>
          <Text style={styles.subtext}>
            Claim jobs, share your route, and close deliveries with confidence.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <Feather name="sliders" size={16} color={EcoColors.lime} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionCardTitle}>Your service area</Text>
              <Text style={styles.sectionCardSubtitle}>
                Make it easier to match with the right work.
              </Text>
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Base location (e.g. Lusaka depot)"
            placeholderTextColor={EcoColors.placeholder}
            value={profileLocation}
            onChangeText={setProfileLocation}
          />

          <View style={styles.chipRow}>
            {coverageOptions.map((option) => {
              const active = profileCoverage === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setProfileCoverage(option)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {COVERAGE_LABELS[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.saveRow}>
            <Pressable style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save area</Text>
            </Pressable>
            {profileSaved && (
              <View style={styles.savedBadge}>
                <Feather name="check-circle" size={14} color={EcoColors.lime} />
                <Text style={styles.savedBadgeText}>Saved</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionTitleRow}>
          <Feather name="navigation" size={16} color={EcoColors.lime} />
          <Text style={styles.sectionTitle}>On your route</Text>
        </View>
        {myDeliveries.length === 0 && (
          <Text style={styles.emptyText}>No active loads. Accept a job below to get moving.</Text>
        )}
        <View style={styles.list}>
          {myDeliveries.map((order) => (
            <View key={order.id} style={styles.jobCard}>
              <View style={styles.jobHeaderRow}>
                <View>
                  <Text style={styles.jobItem}>{order.item}</Text>
                  <Text style={styles.jobMeta}>
                    {order.quantity} {order.unit}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>In transit</Text>
                </View>
              </View>
              <View style={styles.routeBlock}>
                <Text style={styles.routeLabel}>From</Text>
                <Text style={styles.routeValue}>{order.origin}</Text>
                <Text style={[styles.routeLabel, { marginTop: 8 }]}>To</Text>
                <Text style={styles.routeValue}>{order.destination}</Text>
              </View>

              {activeUpdateId === order.id ? (
                <View style={styles.buyForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="Current location"
                    placeholderTextColor={EcoColors.placeholder}
                    value={updateLocation}
                    onChangeText={setUpdateLocation}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="What changed?"
                    placeholderTextColor={EcoColors.placeholder}
                    value={updateStatus}
                    onChangeText={setUpdateStatus}
                  />
                  <View style={styles.row}>
                    <Pressable
                      style={[styles.saveButton, styles.rowInput]}
                      onPress={() => handlePostUpdate(order.id)}
                    >
                      <Text style={styles.saveButtonText}>Post update</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.cancelButton, styles.rowInput]}
                      onPress={() => setActiveUpdateId(null)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.row}>
                  <Pressable
                    style={[styles.cancelButton, styles.rowInput]}
                    onPress={() => setActiveUpdateId(order.id)}
                  >
                    <Text style={styles.cancelButtonText}>Update route</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.saveButton, styles.rowInput]}
                    onPress={() => handleMarkDelivered(order.id)}
                  >
                    <Text style={styles.saveButtonText}>Delivered</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.sectionTitleRow}>
          <Feather name="truck" size={16} color={EcoColors.lime} />
          <Text style={styles.sectionTitle}>Available jobs</Text>
        </View>
        {availableJobs.length === 0 && (
          <Text style={styles.emptyText}>No delivery work is ready right now.</Text>
        )}
        <View style={styles.list}>
          {availableJobs.map((order) => (
            <View key={order.id} style={styles.jobRowCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobItem}>
                  {order.item}{' '}
                  <Text style={styles.jobMeta}>
                    · {order.quantity} {order.unit}
                  </Text>
                </Text>
                <View style={styles.routeInlineRow}>
                  <Feather name="map-pin" size={13} color={EcoColors.lime} />
                  <Text style={styles.routeInlineText}>
                    {order.origin} → {order.destination}
                  </Text>
                </View>
              </View>
              <Pressable
                style={styles.acceptButton}
                onPress={() => handleAcceptDelivery(order.id)}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 40 },
  gateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  gateIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: EcoColors.cardBgActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  gateTitle: { fontFamily: EcoFonts.headingBold, fontSize: 20, color: EcoColors.text },
  gateSubtext: {
    fontFamily: EcoFonts.body,
    fontSize: 13,
    color: EcoColors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    maxWidth: 320,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backLinkText: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.muted },
  headerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    backgroundColor: EcoColors.cardBgActive,
    padding: 20,
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: EcoColors.lime,
  },
  heading: { fontFamily: EcoFonts.headingExtraBold, fontSize: 24, color: EcoColors.text, marginTop: 8 },
  subtext: { fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.muted, marginTop: 6 },
  sectionCard: {
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: EcoColors.cardBgActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardTitle: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.text },
  sectionCardSubtitle: { fontFamily: EcoFonts.body, fontSize: 12, color: EcoColors.muted, marginTop: 2 },
  input: {
    fontFamily: EcoFonts.body,
    color: EcoColors.text,
    backgroundColor: EcoColors.fieldBg,
    borderWidth: 1,
    borderColor: EcoColors.line,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    backgroundColor: EcoColors.fieldBg,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipActive: { borderColor: EcoColors.lime, backgroundColor: EcoColors.cardBgActive },
  chipText: { fontFamily: EcoFonts.bodySemiBold, fontSize: 12, color: EcoColors.muted },
  chipTextActive: { color: EcoColors.lime },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saveButton: {
    backgroundColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  saveButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.onLime },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedBadgeText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.lime },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontFamily: EcoFonts.headingBold, fontSize: 17, color: EcoColors.text },
  emptyText: {
    fontFamily: EcoFonts.body,
    color: EcoColors.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 18,
  },
  list: { gap: 12, marginBottom: 20 },
  jobCard: {
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 18,
    padding: 16,
  },
  jobHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  jobItem: { fontFamily: EcoFonts.bodyBold, fontSize: 15, color: EcoColors.text },
  jobMeta: { fontFamily: EcoFonts.body, fontSize: 12, color: EcoColors.muted },
  statusBadge: { backgroundColor: 'rgba(125,211,252,0.14)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  statusBadgeText: { fontFamily: EcoFonts.bodyBold, fontSize: 11, color: EcoColors.sky },
  routeBlock: {
    marginTop: 14,
    borderLeftWidth: 1,
    borderLeftColor: EcoColors.borderStrong,
    paddingLeft: 12,
  },
  routeLabel: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: EcoColors.muted,
  },
  routeValue: { fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.text, marginTop: 2 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  rowInput: { flex: 1, minWidth: 0 },
  cancelButton: {
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.text },
  buyForm: { marginTop: 14, gap: 10 },
  jobRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 18,
    padding: 16,
  },
  routeInlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  routeInlineText: { fontFamily: EcoFonts.body, fontSize: 12, color: EcoColors.muted },
  acceptButton: {
    backgroundColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  acceptButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.onLime },
});
