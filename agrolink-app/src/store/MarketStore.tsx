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

export const CURRENCY = 'K';

const DEFAULT_LISTING_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=70';

export type Role = 'buyer' | 'seller' | 'transporter';
export type ListingStatus = 'listed' | 'closed';
export type OrderStatus = 'ordered' | 'in_transit' | 'delivered';
export type Coverage = 'cross_border' | 'country' | 'province' | 'district';

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

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  subject?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email?: string;
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
  addDeliveryUpdate: (orderId: string, update: { location: string; status: string }) => Promise<void>;

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
  openConversationWith: (otherPartyId: string, otherPartyName: string, subject?: string) => string;
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
  const [roles, setRoles] = useState<Role[]>(['buyer', 'seller', 'transporter']);
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

  const openMessages = (conversationId?: string) => {
    if (conversationId) setActiveConversationId(conversationId);
    setMessagesOpen(true);
  };
  const closeMessages = () => setMessagesOpen(false);

  const myConversations = () =>
    conversations.filter((c) => c.participantIds.includes(myId));

  const openConversationWith: MarketState['openConversationWith'] = (
    otherPartyId,
    otherPartyName,
    subject
  ) => {
    const existing = conversations.find(
      (c) => c.participantIds.includes(myId) && c.participantIds.includes(otherPartyId)
    );
    if (existing) {
      setActiveConversationId(existing.id);
      setMessagesOpen(true);
      return existing.id;
    }
    const id = `c${Date.now()}`;
    const convo: Conversation = {
      id,
      participantIds: [myId, otherPartyId],
      participantNames: { [myId]: myName, [otherPartyId]: otherPartyName },
      subject,
      createdAt: new Date().toISOString(),
    };
    setConversations((prev) => [convo, ...prev]);
    setActiveConversationId(id);
    setMessagesOpen(true);
    return id;
  };

  const sendMessage: MarketState['sendMessage'] = (conversationId, text) => {
    if (!text.trim()) return;
    const msg: Message = {
      id: `m${Date.now()}`,
      conversationId,
      senderId: myId,
      senderName: myName,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  return (
    <MarketContext.Provider
      value={{
        currentUser,
        setCurrentUser,
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
