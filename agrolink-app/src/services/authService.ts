import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  PhoneAuthProvider,
  signInWithCredential,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

import { auth, db } from '../firebase/config';

// ==================== EMAIL/PASSWORD ====================

export const registerUser = async (
  email: string,
  password: string,
  personalInfo: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    country: string;
    province: string;
    city: string;
    address: string;
    userTypes: string[];
  }
) => {
  try {
    console.log('=== Starting Registration ===');
    console.log('Email:', email);
    console.log('Personal Info:', personalInfo);

    // Create Auth account
    console.log('Creating Firebase Auth account...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const uid = userCredential.user.uid;
    console.log('✅ Auth account created. UID:', uid);

    // Save user profile to Firestore
    console.log('Saving user profile to Firestore...');
    console.log('Collection: Users, Document ID:', uid);

    const userData = {
      uid,
      email,
      phoneNumber: personalInfo.phoneNumber,
      userTypes: personalInfo.userTypes,
      personalInfo: {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        profilePhoto: '',
        address: personalInfo.address,
        country: personalInfo.country,
        province: personalInfo.province,
        city: personalInfo.city,
      },
      registrationFeeStatus: 'unpaid',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('Data to save:', userData);

    await setDoc(doc(db, 'Users', uid), userData);

    console.log('✅ Firestore document created successfully');
    console.log('=== Registration Complete ===');

    return userCredential;
  } catch (error: any) {
    console.error('❌ Registration Error');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Full Error:', error);
    throw error;
  }
};

export const loginUser = async (
  email: string,
  password: string
) => {
  try {
    console.log('=== Starting Login ===');
    console.log('Email:', email);

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    console.log('✅ Login successful. UID:', userCredential.user.uid);
    console.log('=== Login Complete ===');

    return userCredential;
  } catch (error: any) {
    console.error('❌ Login Error');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    console.log('=== Logging Out ===');
    await signOut(auth);
    console.log('✅ Logout successful');
  } catch (error: any) {
    console.error('❌ Logout Error:', error.message);
    throw error;
  }
};

// ==================== PHONE AUTH ====================

export const sendPhoneOTP = async (phoneNumber: string) => {
  try {
    console.log('=== Sending Phone OTP ===');
    console.log('Phone Number:', phoneNumber);

    const phoneAuthProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneAuthProvider.verifyPhoneNumber(
      phoneNumber,
      null
    );

    console.log('✅ OTP sent. Verification ID:', verificationId);
    return verificationId;
  } catch (error: any) {
    console.error('❌ Phone OTP Error:', error.message);
    throw error;
  }
};

export const verifyPhoneOTP = async (verificationId: string, otp: string) => {
  try {
    console.log('=== Verifying Phone OTP ===');

    const credential = PhoneAuthProvider.credential(verificationId, otp);
    const userCredential = await signInWithCredential(auth, credential);

    console.log('✅ Phone OTP verified. UID:', userCredential.user.uid);
    return userCredential;
  } catch (error: any) {
    console.error('❌ Phone OTP Verification Error:', error.message);
    throw error;
  }
};

// ==================== USER PROFILE ====================

export const getUserProfile = async (uid: string) => {
  try {
    console.log('=== Fetching User Profile ===');
    console.log('UID:', uid);

    const docSnap = await getDoc(doc(db, 'Users', uid));

    if (docSnap.exists()) {
      console.log('✅ Profile found');
      console.log('Profile data:', docSnap.data());
      return docSnap.data();
    } else {
      console.log('❌ No profile document found');
      return null;
    }
  } catch (error: any) {
    console.error('❌ Get Profile Error:', error.message);
    throw error;
  }
};

export const updateUserProfile = async (
  uid: string,
  updates: Partial<any>
) => {
  try {
    console.log('=== Updating User Profile ===');
    console.log('UID:', uid);
    console.log('Updates:', updates);

    await updateDoc(doc(db, 'Users', uid), {
      ...updates,
      updatedAt: new Date(),
    });

    console.log('✅ Profile updated successfully');
  } catch (error: any) {
    console.error('❌ Update Profile Error:', error.message);
    throw error;
  }
};

export const markRegistrationFeePaid = async (uid: string) => {
  try {
    console.log('=== Marking Registration Fee as Paid ===');
    console.log('UID:', uid);

    await updateUserProfile(uid, {
      registrationFeeStatus: 'paid',
    });

    console.log('✅ Registration fee marked as paid');
  } catch (error: any) {
    console.error('❌ Mark Fee Paid Error:', error.message);
    throw error;
  }
};