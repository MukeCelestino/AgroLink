import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { registerUser } from '../services/authService';
import { EcoColors, EcoFonts } from '../constants/ecoTheme';

const userTypeOptions = [
  { value: 'buyer', label: 'Buyer', description: 'Source quality goods', icon: 'cart-outline' as const },
  { value: 'seller', label: 'Seller', description: 'List what you grow', icon: 'leaf' as const },
  { value: 'transporter', label: 'Transporter', description: 'Move goods with care', icon: 'truck-outline' as const },
];

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');

  const [userTypes, setUserTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleUserType = (type: string) => {
    if (userTypes.includes(type)) {
      setUserTypes(userTypes.filter((t) => t !== type));
    } else {
      setUserTypes([...userTypes, type]);
    }
  };

  const validateForm = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return false;
    }
    if (!firstName || !lastName) {
      Alert.alert('Error', 'First and last name are required');
      return false;
    }
    if (!phoneNumber) {
      Alert.alert('Error', 'Phone number is required');
      return false;
    }
    if (!address || !country || !province || !city) {
      Alert.alert('Error', 'All location fields are required');
      return false;
    }
    if (userTypes.length === 0) {
      Alert.alert('Error', 'Please select at least one user type');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await registerUser(email, password, {
        firstName,
        lastName,
        phoneNumber,
        country,
        province,
        city,
        address,
        userTypes,
      });

      Alert.alert('Success', 'Account created successfully');
      router.replace('/dashboard');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.backLink}
          onPress={() => router.push('/login')}
          disabled={loading}
        >
          <Feather name="arrow-left" size={16} color={EcoColors.muted} />
          <Text style={styles.backLinkText}>Back to sign in</Text>
        </Pressable>

        <View style={styles.logoBadge}>
          <MaterialCommunityIcons name="leaf" size={22} color={EcoColors.onLime} />
        </View>
        <Text style={styles.eyebrow}>Join AgroLink</Text>
        <Text style={styles.heading}>Build your market profile.</Text>
        <Text style={styles.subtext}>
          Tell us who you are and how you would like to trade.
        </Text>

        <View style={styles.form}>
          <Text style={styles.sectionLabel}>Login details</Text>
          <Field label="Email address" icon="mail">
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={EcoColors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </Field>
          <Field label="Password" icon="lock">
            <TextInput
              style={styles.input}
              placeholder="Create a secure password"
              placeholderTextColor={EcoColors.placeholder}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </Field>

          <Text style={styles.sectionLabel}>Personal information</Text>
          <Field label="First name" icon="user">
            <TextInput
              style={styles.input}
              placeholder="John"
              placeholderTextColor={EcoColors.placeholder}
              value={firstName}
              onChangeText={setFirstName}
              editable={!loading}
            />
          </Field>
          <Field label="Last name" icon="user">
            <TextInput
              style={styles.input}
              placeholder="Banda"
              placeholderTextColor={EcoColors.placeholder}
              value={lastName}
              onChangeText={setLastName}
              editable={!loading}
            />
          </Field>
          <Field label="Phone number" icon="phone">
            <TextInput
              style={styles.input}
              placeholder="+260 97 000 0000"
              placeholderTextColor={EcoColors.placeholder}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              editable={!loading}
            />
          </Field>

          <Text style={styles.sectionLabel}>Location</Text>
          <Field label="Address" icon="home">
            <TextInput
              style={styles.input}
              placeholder="Plot 12, Kabwe Road"
              placeholderTextColor={EcoColors.placeholder}
              value={address}
              onChangeText={setAddress}
              editable={!loading}
            />
          </Field>
          <Field label="Country" icon="globe">
            <TextInput
              style={styles.input}
              placeholder="Zambia"
              placeholderTextColor={EcoColors.placeholder}
              value={country}
              onChangeText={setCountry}
              editable={!loading}
            />
          </Field>
          <Field label="Province" icon="map">
            <TextInput
              style={styles.input}
              placeholder="Lusaka Province"
              placeholderTextColor={EcoColors.placeholder}
              value={province}
              onChangeText={setProvince}
              editable={!loading}
            />
          </Field>
          <Field label="City" icon="map-pin">
            <TextInput
              style={styles.input}
              placeholder="Lusaka"
              placeholderTextColor={EcoColors.placeholder}
              value={city}
              onChangeText={setCity}
              editable={!loading}
            />
          </Field>

          <Text style={styles.sectionLabel}>How will you use AgroLink?</Text>
          <View style={styles.roleGrid}>
            {userTypeOptions.map(({ value, label, description, icon }) => {
              const active = userTypes.includes(value);
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.roleOption,
                    active ? styles.roleOptionActive : styles.roleOptionInactive,
                  ]}
                  onPress={() => toggleUserType(value)}
                  disabled={loading}
                >
                  <View
                    style={[
                      styles.roleIconBadge,
                      { backgroundColor: active ? EcoColors.lime : EcoColors.cardBg },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={icon}
                      size={18}
                      color={active ? EcoColors.onLime : EcoColors.lime}
                    />
                  </View>
                  <Text style={styles.roleLabel}>{label}</Text>
                  <Text style={styles.roleDescription}>{description}</Text>
                  {active && (
                    <Feather
                      name="check"
                      size={16}
                      color={EcoColors.lime}
                      style={styles.roleCheck}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitButtonPressed,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={EcoColors.onLime} />
            ) : (
              <Text style={styles.submitButtonText}>Register</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldWrap}>
        <Feather
          name={icon}
          size={16}
          color={EcoColors.lime}
          style={styles.fieldIcon}
        />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: EcoColors.void,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 14,
    color: EcoColors.muted,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: EcoColors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  eyebrow: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: EcoColors.lime,
    marginTop: 20,
  },
  heading: {
    fontFamily: EcoFonts.headingExtraBold,
    fontSize: 28,
    color: EcoColors.text,
    marginTop: 10,
  },
  subtext: {
    fontFamily: EcoFonts.body,
    fontSize: 15,
    color: EcoColors.muted,
    marginTop: 10,
    lineHeight: 21,
  },
  form: {
    marginTop: 28,
    gap: 14,
  },
  sectionLabel: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 13,
    color: EcoColors.lime,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
  },
  field: {},
  fieldLabel: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 13,
    color: EcoColors.cream,
    marginBottom: 8,
  },
  fieldWrap: {
    justifyContent: 'center',
  },
  fieldIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    fontFamily: EcoFonts.body,
    color: EcoColors.text,
    backgroundColor: EcoColors.fieldBg,
    borderWidth: 1,
    borderColor: EcoColors.line,
    borderRadius: 14,
    paddingVertical: 14,
    paddingLeft: 44,
    paddingRight: 16,
    fontSize: 15,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  roleOption: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  roleOptionActive: {
    borderColor: EcoColors.lime,
    backgroundColor: EcoColors.cardBgActive,
  },
  roleOptionInactive: {
    borderColor: EcoColors.borderSubtle,
    backgroundColor: EcoColors.cardBg,
  },
  roleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleLabel: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 13,
    color: EcoColors.text,
    marginTop: 12,
  },
  roleDescription: {
    fontFamily: EcoFonts.body,
    fontSize: 11,
    color: EcoColors.muted,
    marginTop: 4,
    lineHeight: 15,
  },
  roleCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  submitButton: {
    backgroundColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonPressed: {
    backgroundColor: EcoColors.limeDeep,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 15,
    color: EcoColors.onLime,
  },
});
