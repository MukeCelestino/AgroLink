import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebase/config';
import type { VerificationRequest, VerifiableRole } from './verificationService';

// A reserved, non-auth pseudo-user representing AgroLink itself. Conversations
// involving this id are one-way (system -> user): only an admin session may
// post into them (see firestore.rules), and MessagesDrawer hides the compose
// box whenever this id is among the participants.
export const SYSTEM_SENDER_ID = 'agrolink-system';
export const SYSTEM_SENDER_NAME = 'AgroLink';

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  subject?: string;
  createdAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
  // When each participant last read this thread — drives the unread badge
  // in AppShell. Absent for a participant who has never opened it.
  lastReadAt?: Record<string, string>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

// Shared by the AppShell badge count and the MessagesDrawer inbox list, so
// "unread" means the same thing in both places. A thread counts as unread
// once it has a message and the last activity on it is newer than this
// user's own lastReadAt entry (sending a message bumps your own, so your
// own outgoing messages never count as unread for you).
export const isConversationUnread = (conversation: Conversation, uid: string): boolean => {
  if (!conversation.lastMessage) return false;
  const lastActivity = conversation.lastMessageAt || conversation.createdAt;
  const myLastRead = conversation.lastReadAt?.[uid];
  return !myLastRead || new Date(lastActivity).getTime() > new Date(myLastRead).getTime();
};

// ==================== CONVERSATIONS ====================

// One thread per participant pair, regardless of subject — matches how the
// UI's "message this seller/buyer/provider" buttons behave.
export const findOrCreateConversation = async (
  myId: string,
  myName: string,
  otherId: string,
  otherName: string,
  subject?: string
): Promise<string> => {
  const q = query(collection(db, 'Conversations'), where('participantIds', 'array-contains', myId));
  const snapshot = await getDocs(q);
  const existing = snapshot.docs.find((docSnap) =>
    (docSnap.data().participantIds as string[]).includes(otherId)
  );
  if (existing) return existing.id;

  const docRef = await addDoc(collection(db, 'Conversations'), {
    participantIds: [myId, otherId],
    participantNames: { [myId]: myName, [otherId]: otherName },
    subject: subject || '',
    createdAt: new Date().toISOString(),
    lastMessage: '',
    lastMessageAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const subscribeToMyConversations = (
  uid: string,
  callback: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(
    collection(db, 'Conversations'),
    where('participantIds', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Conversation, 'id'>),
        }))
      );
    },
    (error) => {
      console.error('Conversations subscription error:', error);
      onError?.(error);
    }
  );
};

// ==================== MESSAGES ====================

export const subscribeToConversationMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(
    collection(db, 'Conversations', conversationId, 'Messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          conversationId,
          ...(docSnap.data() as Omit<Message, 'id' | 'conversationId'>),
        }))
      );
    },
    (error) => {
      console.error('Messages subscription error:', error);
      onError?.(error);
    }
  );
};

export const postMessage = async (
  conversationId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> => {
  const timestamp = new Date().toISOString();
  await addDoc(collection(db, 'Conversations', conversationId, 'Messages'), {
    senderId,
    senderName,
    text,
    timestamp,
  });
  await updateDoc(doc(db, 'Conversations', conversationId), {
    lastMessage: text,
    lastMessageAt: timestamp,
    // Sending a message counts as having read up to that point yourself,
    // so you don't see your own message as "unread" in the badge.
    [`lastReadAt.${senderId}`]: timestamp,
  });
};

// Call when a user opens a thread (see MarketStore's activeConversationId
// effect) so the unread badge clears for them.
export const markConversationRead = async (conversationId: string, uid: string): Promise<void> => {
  await updateDoc(doc(db, 'Conversations', conversationId), {
    [`lastReadAt.${uid}`]: new Date().toISOString(),
  });
};

// ==================== SYSTEM NOTIFICATIONS ====================

const roleLabel = (role: VerifiableRole) => (role === 'seller' ? 'seller' : 'transporter');

// Posts a one-way system message into the applicant's inbox announcing a
// verification decision. Runs from the admin's session — the isAdmin() +
// 'agrolink-system' carve-outs in firestore.rules are what allow this
// specific write even though the admin isn't a participant in the thread.
export const notifyVerificationDecision = async (
  request: VerificationRequest,
  decision: { approve: boolean; reviewerNotes?: string }
): Promise<void> => {
  const conversationId = await findOrCreateConversation(
    SYSTEM_SENDER_ID,
    SYSTEM_SENDER_NAME,
    request.userId,
    request.userName,
    'Verification updates'
  );

  const text = decision.approve
    ? `Good news — your ${roleLabel(request.role)} verification was approved. You can now use that mode across AgroLink.`
    : `Your ${roleLabel(request.role)} verification request was not approved.${
        decision.reviewerNotes ? ` Reason: ${decision.reviewerNotes}` : ''
      } You're welcome to re-apply from the Get verified screen.`;

  await postMessage(conversationId, SYSTEM_SENDER_ID, SYSTEM_SENDER_NAME, text);
};
