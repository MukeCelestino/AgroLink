import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  arrayUnion,
  runTransaction,
} from 'firebase/firestore';

import { db } from '../firebase/config';
import { logoutUser } from '../services/authService';
import {
  Conversation,
  Message,
  findOrCreateConversation,
  subscribeToMyConversations,
  subscribeToConversationMessages,
  postMessage,
  markConversationRead,
} from '../services/messagingService';

export const CURRENCY = 'K';

const DEFAULT_LISTING_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=70';

export type Role = 'buyer' | 'seller' | 'transporter';
export type ListingStatus = 'listed' | 'closed';
export type OrderStatus = 'ordered' | 'in_transit' | 'delivered';
export type Coverage = 'cross_border' | 'country' | 'province' | 'district';
export type PaymentStatus = 'unpaid' | 'paid';
export type PaymentMethod = 'cash' | 'mobile_money' | 'other';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  other: 'Other',
};

export const ROLE_LABELS: Record<Role, string> = {
  buyer: 'Buyer',
  seller: 'Seller',
  transporter: 'Transporter',
};

export const COVERAGE_LABELS: Record<Coverage, string> = {
  cross_border: 'Cross-border',
  country: 'Within country',
  province: 'Province',
  district: 'District',
};

export interface DeliveryUpdate {
  id: string;
  timestamp: string;
  location: string;
  status: string;
  // Present when the update came from a GPS ping (see logistics.tsx's
  // "Share my location" toggle) rather than a manually typed note.
  lat?: number;
  lng?: number;
}

// A Listing is a seller's remaining stock. Buying some of it never mutates
// its lifecycle beyond quantity/price — it stays 'listed' (and buyable) for
// whatever wasn't taken, and only flips to 'closed' once quantity hits 0.
// Each purchase instead creates its own Order, which is what carries the
// ordered -> in_transit -> delivered lifecycle.
export interface Listing {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  price: number;
  origin: string;
  status: ListingStatus;
  imageUrl: string;
  sellerId: string;
  sellerName: string;
  createdAt: string;
}

export interface Order {
  id: string;
  listingId: string;
  item: string;
  quantity: number;
  unit: string;
  price: number;
  origin: string;
  destination: string;
  imageUrl: string;
  status: OrderStatus;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  transporterId?: string;
  createdAt: string;
  updates: DeliveryUpdate[];
  // Manually confirmed by the seller — AgroLink doesn't process payment
  // itself; buyer and seller settle up outside the app (cash, mobile
  // money, etc.) and the seller marks it once they've actually received
  // it. Absent on older orders, treat as 'unpaid'.
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
}

export interface BuyRequest {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  buyerId: string;
  buyerName: string;
  notes?: string;
  createdAt: string;
}

export interface ServiceProfile {
  location: string;
  coverage: Coverage;
  service?: string;
}

export interface ExtensionProvider {
  id: string;
  name: string;
  service: string;
  location: string;
  coverage: Coverage;
}

export interface CurrentUser {
  id: string;
  name: string;
  email?: string;
  isAdmin?: boolean;
}

const FALLBACK_USER_ID = 'me';
const FALLBACK_USER_NAME = 'You';

const initialExtensionProviders: ExtensionProvider[] = [
  {
    id: 'ext1',
    name: 'GreenField Agronomy',
    service: 'Soil testing & crop advisory',
    location: 'Lusaka',
    coverage: 'province',
  },
  {
    id: 'ext2',
    name: 'AgriVet Solutions',
    service: 'Veterinary & livestock health',
    location: 'Kitwe',
    coverage: 'district',
  },
  {
    id: 'ext3',
    name: 'Regional Crop Insurance Co.',
    service: 'Crop insurance & risk cover',
    location: 'Regional',
    coverage: 'cross_border',
  },
];

interface MarketState {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  signOutAndReset: () => Promise<void>;

  roles: Role[];
  setRoles: (roles: Role[]) => void;
  activeRole: Role;
  setActiveRole: (role: Role) => void;

  listingsLoading: boolean;
  listings: Listing[];
  addListing: (data: {
    item: string;
    quantity: number;
    unit: string;
    price: number;
    origin: string;
    imageUrl?: string;
  }) => Promise<void>;

  orders: Order[];
  buyListing: (listingId: string, destination: string, orderedQuantity: number) => Promise<void>;
  acceptDelivery: (orderId: string) => Promise<void>;
  markDelivered: (orderId: string) => Promise<void>;
  markOrderPaid: (orderId: string, method: PaymentMethod) => Promise<void>;
  addDeliveryUpdate: (
    orderId: string,
    update: { location: string; status: string; lat?: number; lng?: number }
  ) => Promise<void>;

  buyRequests: BuyRequest[];
  addBuyRequest: (req: { item: string; quantity: number; unit: string; notes?: string }) => Promise<void>;

  transporterProfile: ServiceProfile | null;
  saveTransporterProfile: (profile: ServiceProfile) => void;

  extensionProfile: ServiceProfile | null;
  saveExtensionProfile: (profile: ServiceProfile) => void;
  extensionProviders: ExtensionProvider[];

  conversations: Conversation[];
  messages: Message[];
  myConversations: () => Conversation[];
  openConversationWith: (otherPartyId: string, otherPartyName: string, subject?: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  messagesOpen: boolean;
  activeConversationId: string | null;
  openMessages: (conversationId?: string) => void;
  closeMessages: () => void;
  setActiveConversationId: (id: string | null) => void;
}

const MarketContext = createContext<MarketState | undefined>(undefined);

export function MarketStoreProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  // Starts buyer-only (the one role that needs no verification) until the
  // dashboard's profile fetch resolves and adds any verifiedRoles — fails
  // closed instead of briefly exposing Seller/Transporter mode by default.
  const [roles, setRoles] = useState<Role[]>(['buyer']);
  const [activeRole, setActiveRole] = useState<Role>('buyer');

  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [buyRequests, setBuyRequests] = useState<BuyRequest[]>([]);
  const [transporterProfile, setTransporterProfile] = useState<ServiceProfile | null>(null);
  const [extensionProfile, setExtensionProfile] = useState<ServiceProfile | null>(null);
  const [extensionProviders, setExtensionProviders] = useState<ExtensionProvider[]>(
    initialExtensionProviders
  );

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const myId = currentUser?.id || FALLBACK_USER_ID;
  const myName = currentUser?.name || FALLBACK_USER_NAME;

  // Listings and buy requests live in Firestore so postings, purchases, and
  // delivery status sync in real time across every signed-in device. The
  // listeners only attach once someone is signed in, since the security
  // rules require an authenticated request.
  useEffect(() => {
    if (!currentUser) {
      setListings([]);
      setListingsLoading(true);
      return;
    }
    const q = query(collection(db, 'Listings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setListings(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Listing, 'id'>),
          }))
        );
        setListingsLoading(false);
      },
      (error) => {
        console.error('Listings subscription error:', error);
        setListingsLoading(false);
      }
    );
    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      return;
    }
    const q = query(collection(db, 'Orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setOrders(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Order, 'id'>),
          }))
        );
      },
      (error) => console.error('Orders subscription error:', error)
    );
    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setBuyRequests([]);
      return;
    }
    const q = query(collection(db, 'BuyRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setBuyRequests(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<BuyRequest, 'id'>),
          }))
        );
      },
      (error) => console.error('BuyRequests subscription error:', error)
    );
    return unsubscribe;
  }, [currentUser]);

  // Conversations the signed-in user is part of. Real-time and Firestore-backed
  // (see messagingService.ts) — this used to be plain local state that never
  // left the sender's own session.
  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      return;
    }
    return subscribeToMyConversations(currentUser.id, setConversations);
  }, [currentUser]);

  // Only the active thread's messages are loaded, not every message ever —
  // matches what MessagesDrawer actually renders at a time. Also depends on
  // currentUser (not just activeConversationId) so this tears down the
  // instant someone signs out, rather than staying subscribed with a now-
  // invalid auth token and logging a permission-denied error.
  useEffect(() => {
    if (!currentUser || !activeConversationId) {
      setMessages([]);
      return;
    }
    // Opening a thread counts as reading it — clears the unread badge for
    // this conversation (see AppShell's unreadCount).
    markConversationRead(activeConversationId, currentUser.id).catch((error) =>
      console.error('markConversationRead error:', error)
    );
    return subscribeToConversationMessages(activeConversationId, setMessages);
  }, [currentUser, activeConversationId]);

  const addListing: MarketState['addListing'] = async (data) => {
    const pricePerUnit = data.price / data.quantity;
    await addDoc(collection(db, 'Listings'), {
      item: data.item,
      unit: data.unit,
      origin: data.origin,
      quantity: data.quantity,
      pricePerUnit,
      price: data.price,
      status: 'listed',
      sellerId: myId,
      sellerName: myName,
      imageUrl: data.imageUrl || DEFAULT_LISTING_IMAGE,
      createdAt: new Date().toISOString(),
    });
  };

  // Buying is a transaction: it decrements the listing's remaining stock
  // (closing it once stock hits 0) and creates a separate Order to carry the
  // ordered -> in_transit -> delivered lifecycle for just that purchase, so
  // the rest of the listing's stock stays available to other buyers.
  const buyListing: MarketState['buyListing'] = async (listingId, destination, orderedQuantity) => {
    const listingRef = doc(db, 'Listings', listingId);
    const orderRef = doc(collection(db, 'Orders'));
    await runTransaction(db, async (transaction) => {
      const listingSnap = await transaction.get(listingRef);
      if (!listingSnap.exists()) throw new Error('This listing no longer exists.');
      const listing = listingSnap.data() as Omit<Listing, 'id'>;
      if (listing.status !== 'listed') throw new Error('This listing is no longer available.');
      if (orderedQuantity <= 0 || orderedQuantity > listing.quantity) {
        throw new Error(`Only ${listing.quantity} ${listing.unit} left.`);
      }

      const remaining = listing.quantity - orderedQuantity;
      transaction.update(listingRef, {
        quantity: remaining,
        price: Math.round(listing.pricePerUnit * remaining * 100) / 100,
        status: remaining > 0 ? 'listed' : 'closed',
      });

      const order: Omit<Order, 'id'> = {
        listingId,
        item: listing.item,
        unit: listing.unit,
        quantity: orderedQuantity,
        price: Math.round(listing.pricePerUnit * orderedQuantity * 100) / 100,
        origin: listing.origin,
        destination,
        imageUrl: listing.imageUrl,
        status: 'ordered',
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        buyerId: myId,
        buyerName: myName,
        createdAt: new Date().toISOString(),
        updates: [],
        paymentStatus: 'unpaid',
      };
      transaction.set(orderRef, order);
    });
  };

  const acceptDelivery: MarketState['acceptDelivery'] = async (orderId) => {
    await updateDoc(doc(db, 'Orders', orderId), {
      status: 'in_transit',
      transporterId: myId,
    });
  };

  // Payment itself happens outside the app (cash, mobile money, etc.) — the
  // seller is the one who actually sees the money arrive, so they're the
  // one who confirms it here. firestore.rules already lets a seller update
  // any field on their own order, so no rule changes were needed for this.
  const markOrderPaid: MarketState['markOrderPaid'] = async (orderId, method) => {
    await updateDoc(doc(db, 'Orders', orderId), {
      paymentStatus: 'paid',
      paymentMethod: method,
      paidAt: new Date().toISOString(),
    });
  };

  const markDelivered: MarketState['markDelivered'] = async (orderId) => {
    const order = orders.find((item) => item.id === orderId);
    await updateDoc(doc(db, 'Orders', orderId), {
      status: 'delivered',
      updates: arrayUnion({
        id: `u${Date.now()}`,
        timestamp: new Date().toISOString(),
        location: order?.destination || 'Destination',
        status: 'Delivered',
      }),
    });
  };

  const addDeliveryUpdate: MarketState['addDeliveryUpdate'] = async (orderId, update) => {
    await updateDoc(doc(db, 'Orders', orderId), {
      updates: arrayUnion({
        ...update,
        id: `u${Date.now()}`,
        timestamp: new Date().toISOString(),
      }),
    });
  };

  const addBuyRequest: MarketState['addBuyRequest'] = async (req) => {
    await addDoc(collection(db, 'BuyRequests'), {
      ...req,
      buyerId: myId,
      buyerName: myName,
      createdAt: new Date().toISOString(),
    });
  };

  const saveTransporterProfile = (profile: ServiceProfile) => setTransporterProfile(profile);

  const saveExtensionProfile = (profile: ServiceProfile) => {
    setExtensionProfile(profile);
    setExtensionProviders((prev) => {
      const mine: ExtensionProvider = {
        id: myId,
        name: myName,
        service: profile.service || 'Extension services',
        location: profile.location,
        coverage: profile.coverage,
      };
      return [mine, ...prev.filter((p) => p.id !== myId)];
    });
  };

  // Called with no id from the header's message icon — that should always
  // land on the full thread list, not whatever was last viewed, so it
  // resets activeConversationId rather than leaving it alone.
  const openMessages = (conversationId?: string) => {
    setActiveConversationId(conversationId ?? null);
    setMessagesOpen(true);
  };
  const closeMessages = () => setMessagesOpen(false);

  // Clears local state — which unsubscribes every Firestore listener via
  // their [currentUser]/[activeConversationId] effect dependencies — before
  // actually signing out, rather than after. Doing it in the other order
  // races the auth token invalidating against React tearing listeners down,
  // which is what caused stray "permission-denied" console errors. Both
  // AppShell's and Profile's logout buttons should call this instead of
  // calling authService.logoutUser() directly, so behavior stays consistent.
  const signOutAndReset = async () => {
    setMessagesOpen(false);
    setActiveConversationId(null);
    setCurrentUser(null);
    await logoutUser();
  };

  // The Firestore query behind `conversations` is already scoped to the
  // signed-in user (see the subscription effect above).
  const myConversations = () => conversations;

  const openConversationWith: MarketState['openConversationWith'] = (
    otherPartyId,
    otherPartyName,
    subject
  ) => {
    setMessagesOpen(true);
    findOrCreateConversation(myId, myName, otherPartyId, otherPartyName, subject)
      .then((id) => setActiveConversationId(id))
      .catch((error) => console.error('openConversationWith error:', error));
  };

  const sendMessage: MarketState['sendMessage'] = (conversationId, text) => {
    if (!text.trim()) return;
    postMessage(conversationId, myId, myName, text.trim()).catch((error) =>
      console.error('sendMessage error:', error)
    );
  };

  return (
    <MarketContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        signOutAndReset,
        roles,
        setRoles,
        activeRole,
        setActiveRole,
        listingsLoading,
        listings,
        addListing,
        orders,
        buyListing,
        acceptDelivery,
        markDelivered,
        markOrderPaid,
        addDeliveryUpdate,
        buyRequests,
        addBuyRequest,
        transporterProfile,
        saveTransporterProfile,
        extensionProfile,
        saveExtensionProfile,
        extensionProviders,
        conversations,
        messages,
        myConversations,
        openConversationWith,
        sendMessage,
        messagesOpen,
        activeConversationId,
        openMessages,
        closeMessages,
        setActiveConversationId,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export function useMarketStore() {
  const context = useContext(MarketContext);
  if (context === undefined) {
    throw new Error('useMarketStore must be used within a MarketStoreProvider');
  }
  return context;
}
