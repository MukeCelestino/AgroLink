import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import {
  useMarketStore,
  Coverage,
  COVERAGE_LABELS,
} from '../store/MarketStore';
import { EcoColors, EcoFonts } from '../constants/ecoTheme';
import AppShell from '../components/AppShell';

const coverageOptions: Coverage[] = ['district', 'province', 'country', 'cross_border'];

export default function ExtensionScreen() {
  const { extensionProfile, saveExtensionProfile, extensionProviders, openConversationWith } =
    useMarketStore();

  const [service, setService] = useState(extensionProfile?.service ?? '');
  const [location, setLocation] = useState(extensionProfile?.location ?? '');
  const [coverage, setCoverage] = useState<Coverage>(extensionProfile?.coverage ?? 'district');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!service || !location) return;
    saveExtensionProfile({ service, location, coverage });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell active="extension">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>Field support network</Text>
          <Text style={styles.heading}>Extension services.</Text>
          <Text style={styles.subtext}>
            Practical expertise for every step of the season.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconBadge}>
              <MaterialCommunityIcons name="sprout" size={18} color={EcoColors.lime} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionCardTitle}>Offer your knowledge</Text>
              <Text style={styles.sectionCardSubtitle}>
                Add a profile to join the trusted service directory.
              </Text>
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Service offered (e.g. Soil testing & crop advisory)"
            placeholderTextColor={EcoColors.placeholder}
            value={service}
            onChangeText={setService}
          />
          <TextInput
            style={styles.input}
            placeholder="Location (e.g. Lusaka)"
            placeholderTextColor={EcoColors.placeholder}
            value={location}
            onChangeText={setLocation}
          />

          <View style={styles.chipRow}>
            {coverageOptions.map((option) => {
              const active = coverage === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCoverage(option)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {COVERAGE_LABELS[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.saveRow}>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save profile</Text>
            </Pressable>
            {saved && (
              <View style={styles.savedBadge}>
                <Feather name="check-circle" size={14} color={EcoColors.lime} />
                <Text style={styles.savedBadgeText}>Saved</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>People who can help</Text>
        <Text style={styles.sectionSubtitle}>Browse agricultural support near you.</Text>

        <View style={styles.providerList}>
          {extensionProviders.map((provider) => (
            <View key={provider.id} style={styles.providerCard}>
              <View style={styles.providerHeaderRow}>
                <View style={styles.providerAvatar}>
                  <Text style={styles.providerAvatarText}>
                    {provider.name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <View style={styles.providerLocationRow}>
                    <Feather name="map-pin" size={12} color={EcoColors.muted} />
                    <Text style={styles.providerLocation}>{provider.location}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.providerService}>{provider.service}</Text>
              <Text style={styles.providerCoverage}>
                {COVERAGE_LABELS[provider.coverage]}
              </Text>
              <Pressable
                style={styles.contactButton}
                onPress={() =>
                  openConversationWith(provider.id, provider.name, provider.service)
                }
              >
                <Feather name="message-square" size={14} color={EcoColors.lime} />
                <Text style={styles.contactButtonText}>Contact</Text>
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
    marginBottom: 22,
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
  sectionTitle: { fontFamily: EcoFonts.headingBold, fontSize: 17, color: EcoColors.text },
  sectionSubtitle: { fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.muted, marginTop: 4, marginBottom: 14 },
  providerList: { gap: 12 },
  providerCard: {
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 18,
    padding: 16,
  },
  providerHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: EcoColors.cardBgActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerAvatarText: { fontFamily: EcoFonts.headingExtraBold, fontSize: 15, color: EcoColors.lime },
  providerName: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.text },
  providerLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  providerLocation: { fontFamily: EcoFonts.body, fontSize: 11, color: EcoColors.muted },
  providerService: { fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.muted, marginTop: 12, lineHeight: 19 },
  providerCoverage: { fontFamily: EcoFonts.bodyBold, fontSize: 11, color: EcoColors.lime, marginTop: 10 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    borderRadius: 14,
    paddingVertical: 11,
  },
  contactButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.text },
});
