import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { auth } from '../firebase/config';
import {
  getUserProfile,
  updateUserProfile,
  logoutUser,
} from '../services/authService';
import { EcoColors, EcoFonts } from '../constants/ecoTheme';
import { ROLE_LABELS } from '../store/MarketStore';

const VERIFIABLE_ROLES: ('seller' | 'transporter')[] = ['seller', 'transporter'];

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [userTypes, setUserTypes] = useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<
    Record<string, 'pending' | 'approved' | 'rejected'>
  >({});

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert('Error', 'No user logged in');
        return;
      }

      const profile = await getUserProfile(currentUser.uid);

      if (profile) {
        setEmail(profile.email || '');
        setFirstName(profile.personalInfo?.firstName || '');
        setLastName(profile.personalInfo?.lastName || '');
        setPhoneNumber(profile.phoneNumber || '');
        setAddress(profile.personalInfo?.address || '');
        setCountry(profile.personalInfo?.country || '');
        setProvince(profile.personalInfo?.province || '');
        setCity(profile.personalInfo?.city || '');
        setUserTypes(profile.userTypes || []);
        setVerificationStatus(profile.verificationStatus || {});
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName || !lastName || !phoneNumber) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'No user logged in');
        return;
      }

      await updateUserProfile(currentUser.uid, {
        phoneNumber,
        personalInfo: {
          firstName,
          lastName,
          profilePhoto: '',
          address,
          country,
          province,
          city,
        },
      });

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to logout: ' + error.message);
    }
  };

  if (loading) {
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
          <Pressable onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={EcoColors.muted} />
          </Pressable>
          <Text style={styles.title}>My profile</Text>
          <View style={{ width: 20 }} />
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profilePicture}>
            <Text style={styles.profilePictureInitial}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {firstName} {lastName}
          </Text>
          <Text style={styles.profileEmail}>{email}</Text>

          {userTypes.length > 0 && (
            <View style={styles.userTypesContainer}>
              {userTypes.map((type) => (
                <View key={type} style={styles.userTypeBadge}>
                  <Text style={styles.userTypeBadgeText}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.verificationHeaderRow}>
            <Text style={styles.sectionTitle}>Verification</Text>
            <Pressable onPress={() => router.push('/verification')}>
              <Text style={styles.verificationLink}>Manage</Text>
            </Pressable>
          </View>
          {VERIFIABLE_ROLES.map((role) => {
            const status = verificationStatus[role];
            const label =
              status === 'approved'
                ? 'Verified'
                : status === 'pending'
                  ? 'Pending review'
                  : status === 'rejected'
                    ? 'Rejected'
                    : 'Not verified';
            const color =
              status === 'approved'
                ? EcoColors.lime
                : status === 'pending'
                  ? EcoColors.amber
                  : status === 'rejected'
                    ? '#fca5a5'
                    : EcoColors.muted;
            return (
              <View key={role} style={styles.verificationRow}>
                <Text style={styles.verificationRole}>{ROLE_LABELS[role]}</Text>
                <View style={[styles.verificationPill, { borderColor: color }]}>
                  <Text style={[styles.verificationPillText, { color }]}>{label}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edit personal information</Text>

          <Field label="First name *">
            <TextInput
              style={styles.input}
              placeholderTextColor={EcoColors.placeholder}
              value={firstName}
              onChangeText={setFirstName}
              editable={!saving}
            />
          </Field>

          <Field label="Last name *">
            <TextInput
              style={styles.input}
              placeholderTextColor={EcoColors.placeholder}
              value={lastName}
              onChangeText={setLastName}
              editable={!saving}
            />
          </Field>

          <Field label="Phone number *">
            <TextInput
              style={styles.input}
              placeholderTextColor={EcoColors.placeholder}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              editable={!saving}
            />
          </Field>

          <Field label="Address">
            <TextInput
              style={styles.input}
              placeholderTextColor={EcoColors.placeholder}
              value={address}
              onChangeText={setAddress}
              editable={!saving}
            />
          </Field>

          <Field label="Country">
            <TextInput
              style={styles.input}
              placeholderTextColor={EcoColors.placeholder}
              value={country}
              onChangeText={setCountry}
              editable={!saving}
            />
          </Field>

          <Field label="Province">
            <TextInput
              style={styles.input}
              placeholderTextColor={EcoColors.placeholder}
              value={province}
              onChangeText={setProvince}
              editable={!saving}
            />
          </Field>

          <Field label="City">
            <TextInput
              style={styles.input}
              placeholderTextColor={EcoColors.placeholder}
              value={city}
              onChangeText={setCity}
              editable={!saving}
            />
          </Field>

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={EcoColors.onLime} />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={15} color="#fca5a5" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
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
    marginBottom: 24,
  },
  title: { fontFamily: EcoFonts.headingBold, fontSize: 18, color: EcoColors.text },
  profileSection: {
    alignItems: 'center',
    backgroundColor: EcoColors.cardBgActive,
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    padding: 22,
    borderRadius: 24,
    marginBottom: 20,
  },
  profilePicture: {
    width: 72,
    height: 72,
    borderRadius: 26,
    backgroundColor: EcoColors.lime,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  profilePictureInitial: {
    fontFamily: EcoFonts.headingExtraBold,
    fontSize: 30,
    color: EcoColors.onLime,
  },
  profileName: { fontFamily: EcoFonts.headingBold, fontSize: 18, color: EcoColors.text },
  profileEmail: { fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.muted, marginTop: 4 },
  userTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  userTypeBadge: {
    backgroundColor: EcoColors.lime,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  userTypeBadgeText: { fontFamily: EcoFonts.bodyBold, fontSize: 11, color: EcoColors.onLime },
  section: {
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    padding: 18,
    borderRadius: 20,
  },
  sectionTitle: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 14,
    color: EcoColors.text,
    marginBottom: 16,
  },
  verificationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verificationLink: { fontFamily: EcoFonts.bodyBold, fontSize: 12, color: EcoColors.lime },
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  verificationRole: { fontFamily: EcoFonts.bodySemiBold, fontSize: 13, color: EcoColors.text },
  verificationPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  verificationPillText: { fontFamily: EcoFonts.bodyBold, fontSize: 11 },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 12,
    color: EcoColors.cream,
    marginBottom: 6,
  },
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
  saveButton: {
    backgroundColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.onLime },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  logoutButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: '#fca5a5' },
});
