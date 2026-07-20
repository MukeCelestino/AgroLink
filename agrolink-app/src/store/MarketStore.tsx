import React, { createContext, useContext, useState } from 'react';

export const CURRENCY = 'K';

export type Role = 'buyer' | 'seller' | 'transporter';
export type ListingStatus = 'listed' | 'ordered' | 'in_transit' | 'delivered';
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

export interface Listing {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  price: number;
  origin: string;
  destination?: string;
  status: ListingStatus;
  imageUrl: string;
  sellerId: string;
  sellerName: string;
  buyerId?: string;
  buyerName?: string;
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

const initialListings: Listing[] = [
  {
    id: 'l1',
    item: 'White Maize',
    quantity: 500,
    unit: 'bags',
    price: 12500,
    origin: 'Mkushi Farm Block',
    status: 'listed',
    imageUrl:
      'https://images.unsplash.com/photo-1601472544010-c2c6a0d3d2c1?auto=format&fit=crop&w=600&q=70',
    sellerId: 'seed-1',
    sellerName: 'Mkushi Grain Co.',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    updates: [],
  },
  {
    id: 'l2',
    item: 'Fresh Tomatoes',
    quantity: 120,
    unit: 'crates',
    price: 4800,
    origin: 'Mazabuka Growers',
    status: 'listed',
    imageUrl:
      'https://images.unsplash.com/photo-1546470427-e26264be0b0d?auto=format&fit=crop&w=600&q=70',
    sellerId: 'seed-2',
    sellerName: 'Mazabuka Growers',
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    updates: [],
  },
  {
    id: 'l3',
    item: 'Soybeans',
    quantity: 300,
    unit: 'bags',
    price: 9600,
    origin: 'Chisamba Farm',
    destination: 'Lusaka Warehouse',
    status: 'ordered',
    imageUrl:
      'https://images.unsplash.com/photo-1620200423727-8127f75d503f?auto=format&fit=crop&w=600&q=70',
    sellerId: 'seed-3',
    sellerName: 'Chisamba Farm',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updates: [],
  },
  {
    id: 'l4',
    item: 'Groundnuts',
    quantity: 150,
    unit: 'bags',
    price: 5400,
    origin: 'Petauke Farm',
    destination: 'Kitwe Depot',
    status: 'in_transit',
    imageUrl:
      'https://images.unsplash.com/photo-1567892737950-30c4db37cd89?auto=format&fit=crop&w=600&q=70',
    sellerId: 'seed-4',
    sellerName: 'Petauke Growers',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updates: [
      {
        id: 'u1',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        location: 'Kapiri Mposhi',
        status: 'Picked up and departed',
      },
    ],
  },
  {
    id: 'l5',
    item: 'Fresh Apples',
    quantity: 120,
    unit: 'crates',
    price: 2800,
    origin: 'Yakima Valley Orchards',
    status: 'listed',
    imageUrl:
      'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?auto=format&fit=crop&w=600&q=70',
    sellerId: 'seed-5',
    sellerName: 'Orchard Hill Growers',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    updates: [],
  },
];

const initialBuyRequests: BuyRequest[] = [
  {
    id: 'br1',
    item: 'Sorghum',
    quantity: 300,
    unit: 'bags',
    buyerId: 'seed-6',
    buyerName: 'Riverside Feeds',
    notes: 'Needed within two weeks, food-grade.',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
];

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

  listings: Listing[];
  addListing: (data: {
    item: string;
    quantity: number;
    unit: string;
    price: number;
    origin: string;
    imageUrl?: string;
  }) => void;
  buyListing: (id: string, destination: string, orderedQuantity: number) => void;
  acceptDelivery: (id: string) => void;
  markDelivered: (id: string) => void;
  addDeliveryUpdate: (id: string, update: { location: string; status: string }) => void;

  buyRequests: BuyRequest[];
  addBuyRequest: (req: { item: string; quantity: number; unit: string; notes?: string }) => void;

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

  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [buyRequests, setBuyRequests] = useState<BuyRequest[]>(initialBuyRequests);
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

  const addListing: MarketState['addListing'] = (data) => {
    const newListing: Listing = {
      ...data,
      id: `l${Date.now()}`,
      status: 'listed',
      sellerId: myId,
      sellerName: myName,
      imageUrl:
        data.imageUrl ||
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=70',
      createdAt: new Date().toISOString(),
      updates: [],
    };
    setListings((prev) => [newListing, ...prev]);
  };

  const buyListing: MarketState['buyListing'] = (id, destination, orderedQuantity) => {
    setListings((prev) =>
      prev.map((listing) =>
        listing.id === id
          ? {
              ...listing,
              status: 'ordered',
              buyerId: myId,
              buyerName: myName,
              destination,
              quantity: orderedQuantity,
            }
          : listing
      )
    );
  };

  const acceptDelivery: MarketState['acceptDelivery'] = (id) => {
    setListings((prev) =>
      prev.map((listing) =>
        listing.id === id ? { ...listing, status: 'in_transit', transporterId: myId } : listing
      )
    );
  };

  const markDelivered: MarketState['markDelivered'] = (id) => {
    setListings((prev) =>
      prev.map((listing) =>
        listing.id === id
          ? {
              ...listing,
              status: 'delivered',
              updates: [
                {
                  id: `u${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  location: listing.destination || 'Destination',
                  status: 'Delivered',
                },
                ...listing.updates,
              ],
            }
          : listing
      )
    );
  };

  const addDeliveryUpdate: MarketState['addDeliveryUpdate'] = (id, update) => {
    setListings((prev) =>
      prev.map((listing) =>
        listing.id === id
          ? {
              ...listing,
              updates: [
                { ...update, id: `u${Date.now()}`, timestamp: new Date().toISOString() },
                ...listing.updates,
              ],
            }
          : listing
      )
    );
  };

  const addBuyRequest: MarketState['addBuyRequest'] = (req) => {
    const newReq: BuyRequest = {
      ...req,
      id: `br${Date.now()}`,
      buyerId: myId,
      buyerName: myName,
      createdAt: new Date().toISOString(),
    };
    setBuyRequests((prev) => [newReq, ...prev]);
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
        listings,
        addListing,
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
