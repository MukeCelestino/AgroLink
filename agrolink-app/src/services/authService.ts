import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

import { auth, db } from '../firebase/config';

// ==================== ERROR MESSAGES ====================

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/weak-password': 'Please choose a stronger password (at least 6 characters).',
  'auth/missing-password': 'Please enter a password.',
};

// Firebase's raw error.message (e.g. "Firebase: Error (auth/invalid-credential).")
// is not something to show a user. This maps the known auth error codes to
// plain language, falling back to the raw message for anything unmapped.
export const getAuthErrorMessage = (error: any): string => {
  if (error?.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }
  return error?.message || 'Something went wrong. Please try again.';
};

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
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

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

  await setDoc(doc(db, 'Users', uid), userData);

  return userCredential;
};

export const loginUser = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// ==================== USER PROFILE ====================

export const getUserProfile = async (uid: string) => {
  const docSnap = await getDoc(doc(db, 'Users', uid));
  return docSnap.exists() ? docSnap.data() : null;
};

export const updateUserProfile = async (uid: string, updates: Partial<any>) => {
  await updateDoc(doc(db, 'Users', uid), {
    ...updates,
    updatedAt: new Date(),
  });
};
