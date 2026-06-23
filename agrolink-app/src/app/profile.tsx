import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { auth } from '../firebase/config';
import {
  getUserProfile,
  updateUserProfile,
  logoutUser,
} from '../services/authService';

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profilePictureContainer}>
          <View style={styles.profilePicture}>
            <Text style={styles.profilePictureInitial}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.profileName}>
          {firstName} {lastName}
        </Text>
        <Text style={styles.profileEmail}>{email}</Text>
      </View>

      {/* User Types Section */}
      {userTypes.length > 0 && (
        <View style={styles.userTypesSection}>
          <Text style={styles.userTypesTitle}>Your Roles</Text>
          <View style={styles.userTypesContainer}>
            {userTypes.map((type) => (
              <View key={type} style={styles.userTypeBadge}>
                <Text style={styles.userTypeBadgeText}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Edit Form Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Edit Personal Information</Text>

        <Text style={styles.label}>First Name *</Text>
        <TextInput
          placeholder="First Name"
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          editable={!saving}
        />

        <Text style={styles.label}>Last Name *</Text>
        <TextInput
          placeholder="Last Name"
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          editable={!saving}
        />

        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          placeholder="Phone Number"
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          editable={!saving}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          placeholder="Address"
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          editable={!saving}
        />

        <Text style={styles.label}>Country</Text>
        <TextInput
          placeholder="Country"
          style={styles.input}
          value={country}
          onChangeText={setCountry}
          editable={!saving}
        />

        <Text style={styles.label}>Province</Text>
        <TextInput
          placeholder="Province"
          style={styles.input}
          value={province}
          onChangeText={setProvince}
          editable={!saving}
        />

        <Text style={styles.label}>City</Text>
        <TextInput
          placeholder="City"
          style={styles.input}
          value={city}
          onChangeText={setCity}
          editable={!saving}
        />

        <Button
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSaveProfile}
          disabled={saving}
          color="#4CAF50"
        />

        <View style={{ height: 15 }} />

        <Button
          title="Logout"
          onPress={handleLogout}
          color="#e74c3c"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  profilePictureContainer: {
    marginBottom: 15,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  userTypesSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  userTypesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  userTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userTypeBadge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  userTypeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
});