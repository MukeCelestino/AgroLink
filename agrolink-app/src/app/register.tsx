import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';

import { registerUser } from '../services/authService';

export default function RegisterScreen() {
  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Personal info fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');

  // User type selection
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create AgroLink Account</Text>

      {/* Auth Section */}
      <Text style={styles.sectionTitle}>Login Details</Text>
      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      {/* Personal Info Section */}
      <Text style={styles.sectionTitle}>Personal Information</Text>
      <TextInput
        placeholder="First Name"
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        editable={!loading}
      />

      <TextInput
        placeholder="Last Name"
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        editable={!loading}
      />

      <TextInput
        placeholder="Phone Number"
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        editable={!loading}
      />

      {/* Location Section */}
      <Text style={styles.sectionTitle}>Location</Text>
      <TextInput
        placeholder="Address"
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        editable={!loading}
      />

      <TextInput
        placeholder="Country"
        style={styles.input}
        value={country}
        onChangeText={setCountry}
        editable={!loading}
      />

      <TextInput
        placeholder="Province"
        style={styles.input}
        value={province}
        onChangeText={setProvince}
        editable={!loading}
      />

      <TextInput
        placeholder="City"
        style={styles.input}
        value={city}
        onChangeText={setCity}
        editable={!loading}
      />

      {/* User Type Selection */}
      <Text style={styles.sectionTitle}>What will you do on AgroLink?</Text>
      <View style={styles.userTypeContainer}>
        {['Buyer', 'Seller', 'Transporter'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.userTypeButton,
              userTypes.includes(type.toLowerCase())
                ? styles.userTypeButtonActive
                : styles.userTypeButtonInactive,
            ]}
            onPress={() => toggleUserType(type.toLowerCase())}
            disabled={loading}
          >
            <Text
              style={[
                styles.userTypeButtonText,
                userTypes.includes(type.toLowerCase())
                  ? styles.userTypeButtonTextActive
                  : styles.userTypeButtonTextInactive,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Buttons */}
      <Button
        title={loading ? 'Registering...' : 'Register'}
        onPress={handleRegister}
        disabled={loading}
      />

      <View style={{ height: 10 }} />

      <Button
        title="Back to Login"
        onPress={() => router.push('/login')}
        disabled={loading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderColor: '#ccc',
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  userTypeButtonInactive: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
  },
  userTypeButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  userTypeButtonTextActive: {
    color: '#fff',
  },
  userTypeButtonTextInactive: {
    color: '#333',
  },
});