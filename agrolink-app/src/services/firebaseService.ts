import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  deleteDoc,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from '../firebase/config';

// ==================== LISTINGS ====================

export const createListing = async (
  userId: string,
  listingData: {
    listingType: 'buy' | 'sell' | 'transport';
    commodity: string;
    quantity: number;
    unit: string;
    description?: string;
    price?: number;
    transportDetails?: {
      location: string;
      radiusOfService: 'cross-border' | 'country' | 'province' | 'city';
    };
  }
) => {
  try {
    const docRef = await addDoc(collection(db, 'Listings'), {
      userId,
      ...listingData,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const getUserListings = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'Listings'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw error;
  }
};

export const getAllListings = async (
  listingType?: 'buy' | 'sell' | 'transport'
) => {
  try {
    let q;
    if (listingType) {
      q = query(
        collection(db, 'Listings'),
        where('listingType', '==', listingType),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'Listings'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw error;
  }
};

export const getListingById = async (listingId: string) => {
  try {
    const docSnap = await getDoc(doc(db, 'Listings', listingId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const updateListing = async (
  listingId: string,
  updates: Partial<any>
) => {
  try {
    await updateDoc(doc(db, 'Listings', listingId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

export const deleteListing = async (listingId: string) => {
  try {
    await deleteDoc(doc(db, 'Listings', listingId));
  } catch (error) {
    throw error;
  }
};

// ==================== CONVERSATIONS ====================

export const getOrCreateConversation = async (
  userId1: string,
  userId2: string,
  listingId: string
) => {
  try {
    // Check if conversation already exists
    const q = query(
      collection(db, 'Conversations'),
      where('participants', 'array-contains', userId1),
      where('listingId', '==', listingId)
    );
    const querySnapshot = await getDocs(q);

    let conversationId;
    if (querySnapshot.empty) {
      // Create new conversation
      const docRef = await addDoc(collection(db, 'Conversations'), {
        participants: [userId1, userId2],
        listingId,
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      conversationId = docRef.id;
    } else {
      conversationId = querySnapshot.docs[0].id;
    }

    return conversationId;
  } catch (error) {
    throw error;
  }
};

export const getConversations = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'Conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw error;
  }
};

export const subscribeToConversation = (
  conversationId: string,
  callback: (messages: any[]) => void
) => {
  try {
    const q = query(
      collection(db, `Conversations/${conversationId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(messages);
    });

    return unsubscribe;
  } catch (error) {
    throw error;
  }
};

// ==================== MESSAGES ====================

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string
) => {
  try {
    // Add message to subcollection
    await addDoc(
      collection(db, `Conversations/${conversationId}/messages`),
      {
        senderId,
        text,
        timestamp: serverTimestamp(),
        read: false,
      }
    );

    // Update conversation's last message
    await updateDoc(doc(db, 'Conversations', conversationId), {
      lastMessage: text,
      lastMessageTime: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

export const markMessageAsRead = async (
  conversationId: string,
  messageId: string
) => {
  try {
    await updateDoc(
      doc(db, `Conversations/${conversationId}/messages/${messageId}`),
      {
        read: true,
      }
    );
  } catch (error) {
    throw error;
  }
};

// ==================== TRANSACTIONS ====================

export const createTransaction = async (
  userId: string,
  transactionData: {
    amount: number;
    type: 'registration_fee' | 'listing_fee';
    paymentMethod: string;
    reference: string;
  }
) => {
  try {
    const docRef = await addDoc(collection(db, 'Transactions'), {
      userId,
      ...transactionData,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateTransactionStatus = async (
  transactionId: string,
  status: 'pending' | 'success' | 'failed'
) => {
  try {
    await updateDoc(doc(db, 'Transactions', transactionId), {
      status,
      completedAt: status === 'success' ? serverTimestamp() : null,
    });
  } catch (error) {
    throw error;
  }
};

export const getUserTransactions = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'Transactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw error;
  }
};