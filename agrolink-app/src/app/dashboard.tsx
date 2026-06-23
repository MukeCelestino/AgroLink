import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { auth } from '../firebase/config';
import { getUserProfile } from '../services/authService';

export default function DashboardScreen() {
  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError('');

      const currentUser = auth.currentUser;
      console.log('Current user:', currentUser?.uid);

      if (!currentUser) {
        setError('No user logged in');
        return;
      }

      const profile = await getUserProfile(currentUser.uid);
      console.log('Profile data:', profile);

      if (profile && profile.personalInfo) {
        const firstName = profile.personalInfo.firstName;
        setUserName(firstName);
        setUserInitial(firstName.charAt(0).toUpperCase());
      } else {
        setError('User profile not found');
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      setError(err.message || 'Error loading profile');
    } finally {
      setLoading(false);
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
      {/* Header with Profile */}
      <View style={styles.header}>
        <Text style={styles.title}>AgroLink</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.profilePicture}>
            <Text style={styles.profileInitial}>{userInitial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Error message if any */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchUserData}>
            <Text style={styles.retryButton}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Welcome to AgroLink</Text>
        <Text style={styles.subtitleText}>
          Select a role to get started
        </Text>

        {/* Role Buttons */}
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => router.push('/buyer')}
        >
          <View style={styles.roleIconBuyer}>
            <Text style={styles.roleEmoji}>🛒</Text>
          </View>
          <Text style={styles.roleName}>Buyer</Text>
          <Text style={styles.roleDescription}>
            Find products to purchase
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => router.push('/seller')}
        >
          <View style={styles.roleIconSeller}>
            <Text style={styles.roleEmoji}>🌾</Text>
          </View>
          <Text style={styles.roleName}>Seller</Text>
          <Text style={styles.roleDescription}>
            Post products to sell
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => router.push('/transporter')}
        >
          <View style={styles.roleIconTransporter}>
            <Text style={styles.roleEmoji}>🚚</Text>
          </View>
          <Text style={styles.roleName}>Transporter</Text>
          <Text style={styles.roleDescription}>
            Offer transportation services
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transactions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Transactions</Text>
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>
            Transactions will appear here
          </Text>
        </View>
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
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 10,
  },
  retryButton: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  roleCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleIconBuyer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIconSeller: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIconTransporter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleEmoji: {
    fontSize: 28,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  placeholderBox: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  },
});