import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';

import { db, storage } from '../firebase/config';

// ==================== TYPES ====================

export type VerifiableRole = 'seller' | 'transporter';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationDocument {
  name: string;
  url: string;
  path: string;
  type: 'image' | 'file';
  uploadedAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  role: VerifiableRole;
  status: VerificationStatus;
  documents: VerificationDocument[];
  notes?: string;
  reviewerNotes?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
}

// A document the user has picked but not yet uploaded/submitted.
export interface PickedDocument {
  uri: string;
  name: string;
  mimeType?: string;
  type: 'image' | 'file';
}

// ==================== PICKING ====================

export const pickImageDocument = async (): Promise<PickedDocument | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to attach an image.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType,
    type: 'image',
  };
};

export const pickFileDocument = async (): Promise<PickedDocument | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType,
    type: asset.mimeType?.startsWith('image/') ? 'image' : 'file',
  };
};

// ==================== SUBMISSION ====================

const uploadDocument = async (
  uid: string,
  requestId: string,
  index: number,
  picked: PickedDocument
): Promise<VerificationDocument> => {
  const response = await fetch(picked.uri);
  const blob = await response.blob();
  const path = `verificationDocuments/${uid}/${requestId}/${index}-${picked.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return {
    name: picked.name,
    url,
    path,
    type: picked.type,
    uploadedAt: new Date().toISOString(),
  };
};

// Uploads every picked file under a freshly-generated request ID, then
// writes the VerificationRequests doc with that same ID (setDoc, not
// addDoc, so the storage path and Firestore doc agree — see storage.rules).
export const submitVerificationRequest = async (
  uid: string,
  userName: string,
  role: VerifiableRole,
  files: PickedDocument[],
  notes?: string
): Promise<void> => {
  if (files.length === 0) {
    throw new Error('Attach at least one document before submitting.');
  }

  const requestRef = doc(collection(db, 'VerificationRequests'));
  const documents = await Promise.all(
    files.map((file, index) => uploadDocument(uid, requestRef.id, index, file))
  );

  await setDoc(requestRef, {
    userId: uid,
    userName,
    role,
    status: 'pending',
    documents,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  });
};

// ==================== READING ====================

export const subscribeToMyVerificationRequests = (
  uid: string,
  callback: (requests: VerificationRequest[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(
    collection(db, 'VerificationRequests'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
        }))
      );
    },
    (error) => {
      console.error('My verification requests subscription error:', error);
      onError?.(error);
    }
  );
};

// Admin-only: every request, newest first. The UI splits pending vs.
// reviewed history client-side. Firestore denies this entirely for
// non-admins per the isAdmin() check in firestore.rules.
export const subscribeToAllVerificationRequests = (
  callback: (requests: VerificationRequest[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(collection(db, 'VerificationRequests'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<VerificationRequest, 'id'>),
        }))
      );
    },
    (error) => {
      console.error('Verification requests subscription error:', error);
      onError?.(error);
    }
  );
};

export const getVerificationRequest = async (
  requestId: string
): Promise<VerificationRequest | null> => {
  const docSnap = await getDoc(doc(db, 'VerificationRequests', requestId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...(docSnap.data() as Omit<VerificationRequest, 'id'>) };
};

// ==================== REVIEW (admin) ====================

export const reviewVerificationRequest = async (
  request: VerificationRequest,
  decision: {
    approve: boolean;
    reviewerId: string;
    reviewerName: string;
    reviewerNotes?: string;
  }
): Promise<void> => {
  const status: VerificationStatus = decision.approve ? 'approved' : 'rejected';

  await updateDoc(doc(db, 'VerificationRequests', request.id), {
    status,
    reviewerNotes: decision.reviewerNotes || '',
    reviewedAt: new Date().toISOString(),
    reviewedBy: decision.reviewerId,
    reviewedByName: decision.reviewerName,
  });

  await updateDoc(doc(db, 'Users', request.userId), {
    [`verificationStatus.${request.role}`]: status,
    ...(decision.approve ? { verifiedRoles: arrayUnion(request.role) } : {}),
  });
};
