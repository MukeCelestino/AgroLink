import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';

import { CURRENCY, Listing, useMarketStore } from '../store/MarketStore';
import { useToast } from '../components/ToastProvider';
import { EcoColors, EcoFonts } from '../constants/ecoTheme';
import AppShell from '../components/AppShell';

type SortOption = 'recent' | 'price_asc' | 'price_desc';

function timeAgo(iso: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function MarketplaceScreen() {
  const {
    activeRole,
    roles,
    currentUser,
    listings,
    addListing,
    buyListing,
    buyRequests,
    addBuyRequest,
    openConversationWith,
  } = useMarketStore();
  const { showAlert } = useToast();
  const myId = currentUser?.id || 'me';

  // Seller: new listing form
  const [showForm, setShowForm] = useState(false);
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [origin, setOrigin] = useState('');

  // Buyer: purchase flow
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [buyQuantity, setBuyQuantity] = useState('');
  const [buyDestination, setBuyDestination] = useState('');

  // Buyer: "what I want to buy"
  const [showWantForm, setShowWantForm] = useState(false);
  const [wantItem, setWantItem] = useState('');
  const [wantQuantity, setWantQuantity] = useState('');
  const [wantUnit, setWantUnit] = useState('');

  // Buyer: search & sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Product detail modal
  const [detailListing, setDetailListing] = useState<Listing | null>(null);

  const myListings = listings.filter(
    (listing) => listing.sellerId === myId && listing.status === 'listed'
  );

  const availableListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let items = listings.filter((listing) => listing.status === 'listed');
    if (q) {
      items = items.filter(
        (listing) =>
          listing.item.toLowerCase().includes(q) ||
          listing.origin.toLowerCase().includes(q) ||
          listing.sellerName.toLowerCase().includes(q)
      );
    }
    return [...items].sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [listings, searchQuery, sortBy]);

  const displayedListings = activeRole === 'seller' ? myListings : availableListings;

  const handlePostListing = async () => {
    if (!item || !quantity || !unit || !price || !origin) {
      showAlert('Missing info', 'Please fill in every field to post a listing.', 'error');
      return;
    }
    try {
      await addListing({ item, quantity: Number(quantity), unit, price: Number(price), origin });
      setItem('');
      setQuantity('');
      setUnit('');
      setPrice('');
      setOrigin('');
      setShowForm(false);
    } catch (error: any) {
      showAlert('Could not post listing', error.message || 'Please try again.', 'error');
    }
  };

  const handleBuy = async (listing: Listing) => {
    if (!buyDestination) {
      showAlert('Missing info', 'Please provide a destination address.', 'error');
      return;
    }
    if (!buyQuantity || Number(buyQuantity) <= 0) {
      showAlert('Missing info', 'Please enter the quantity you want.', 'error');
      return;
    }
    if (Number(buyQuantity) > listing.quantity) {
      showAlert('Too much', `Only ${listing.quantity} ${listing.unit} left.`, 'error');
      return;
    }
    try {
      await buyListing(listing.id, buyDestination, Number(buyQuantity));
      setSelectedId(null);
      setBuyQuantity('');
      setBuyDestination('');
    } catch (error: any) {
      showAlert('Could not complete purchase', error.message || 'Please try again.', 'error');
    }
  };

  const handleAddWant = async () => {
    if (!wantItem || !wantQuantity || !wantUnit) return;
    try {
      await addBuyRequest({ item: wantItem, quantity: Number(wantQuantity), unit: wantUnit });
      setWantItem('');
      setWantQuantity('');
      setWantUnit('');
      setShowWantForm(false);
    } catch (error: any) {
      showAlert('Could not post request', error.message || 'Please try again.', 'error');
    }
  };

  return (
    <AppShell active="marketplace">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>Open market</Text>
          <Text style={styles.heading}>Trade with confidence.</Text>
          <Text style={styles.subtext}>Fresh listings, clear quantities, direct trade.</Text>
          <View style={styles.viewingPill}>
            <Text style={styles.viewingPillText}>
              Viewing as {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}
            </Text>
          </View>
        </View>

        {activeRole === 'transporter' && (
          <View style={styles.infoBanner}>
            <Feather name="package" size={18} color={EcoColors.lime} />
            <Text style={styles.infoBannerText}>
              You can browse every listing here. Switch to{' '}
              <Text style={{ fontFamily: EcoFonts.bodyBold, color: EcoColors.text }}>
                Delivery
              </Text>{' '}
              to claim delivery work.
            </Text>
          </View>
        )}

        {activeRole === 'seller' && (
          <>
            <Pressable style={styles.toggleFormButton} onPress={() => setShowForm((p) => !p)}>
              <Feather name="plus" size={16} color={EcoColors.onLime} />
              <Text style={styles.toggleFormButtonText}>
                {showForm ? 'Cancel listing' : 'Post a listing'}
              </Text>
            </Pressable>

            {showForm && (
              <View style={styles.formCard}>
                <TextInput
                  style={styles.input}
                  placeholder="Item name (e.g. White Maize)"
                  placeholderTextColor={EcoColors.placeholder}
                  value={item}
                  onChangeText={setItem}
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.rowInput]}
                    placeholder="Quantity"
                    placeholderTextColor={EcoColors.placeholder}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                  <TextInput
                    style={[styles.input, styles.rowInput]}
                    placeholder="Unit (bags)"
                    placeholderTextColor={EcoColors.placeholder}
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={`Total price (${CURRENCY})`}
                  placeholderTextColor={EcoColors.placeholder}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Pickup location"
                  placeholderTextColor={EcoColors.placeholder}
                  value={origin}
                  onChangeText={setOrigin}
                />
                <Pressable style={styles.submitButton} onPress={handlePostListing}>
                  <Text style={styles.submitButtonText}>Post listing</Text>
                </Pressable>
              </View>
            )}

            {buyRequests.length > 0 && (
              <View style={styles.buyRequestsCard}>
                <Text style={styles.buyRequestsTitle}>Buyers looking for produce</Text>
                {buyRequests.map((req) => (
                  <View key={req.id} style={styles.buyRequestRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.buyRequestItem}>
                        {req.item}{' '}
                        <Text style={styles.buyRequestMeta}>
                          — {req.quantity} {req.unit}
                        </Text>
                      </Text>
                      <Text style={styles.buyRequestMeta}>
                        {req.buyerName} · {timeAgo(req.createdAt)}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.messageButton}
                      onPress={() => openConversationWith(req.buyerId, req.buyerName, req.item)}
                    >
                      <Feather name="message-square" size={14} color={EcoColors.text} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {activeRole === 'buyer' && !roles.includes('seller') && (
          <Pressable style={styles.infoBanner} onPress={() => router.push('/verification')}>
            <Feather name="user-check" size={18} color={EcoColors.lime} />
            <Text style={styles.infoBannerText}>
              Want to sell here? Get verified as a seller to start listing produce.
            </Text>
            <Feather name="arrow-right" size={14} color={EcoColors.lime} />
          </Pressable>
        )}

        {activeRole === 'buyer' && (
          <>
            <Pressable style={styles.toggleFormButton} onPress={() => setShowWantForm((p) => !p)}>
              <Feather name="clipboard" size={16} color={EcoColors.onLime} />
              <Text style={styles.toggleFormButtonText}>
                {showWantForm ? 'Cancel request' : "Post what you're looking to buy"}
              </Text>
            </Pressable>
            {showWantForm && (
              <View style={styles.formCard}>
                <TextInput
                  style={styles.input}
                  placeholder="Commodity (e.g. White Maize)"
                  placeholderTextColor={EcoColors.placeholder}
                  value={wantItem}
                  onChangeText={setWantItem}
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.rowInput]}
                    placeholder="Quantity"
                    placeholderTextColor={EcoColors.placeholder}
                    keyboardType="numeric"
                    value={wantQuantity}
                    onChangeText={setWantQuantity}
                  />
                  <TextInput
                    style={[styles.input, styles.rowInput]}
                    placeholder="Unit (bags)"
                    placeholderTextColor={EcoColors.placeholder}
                    value={wantUnit}
                    onChangeText={setWantUnit}
                  />
                </View>
                <Pressable style={styles.submitButton} onPress={handleAddWant}>
                  <Text style={styles.submitButtonText}>Post request</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.searchWrap}>
              <Feather name="search" size={16} color={EcoColors.lime} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search commodities, origin, seller..."
                placeholderTextColor={EcoColors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <View style={styles.sortRow}>
              {(
                [
                  ['recent', 'Most recent'],
                  ['price_asc', 'Price ↑'],
                  ['price_desc', 'Price ↓'],
                ] as [SortOption, string][]
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  style={[styles.sortChip, sortBy === value && styles.sortChipActive]}
                  onPress={() => setSortBy(value)}
                >
                  <Text
                    style={[styles.sortChipText, sortBy === value && styles.sortChipTextActive]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>
          {activeRole === 'seller' ? 'Your active listings' : `${displayedListings.length} available`}
        </Text>

        <View style={styles.listingList}>
          {displayedListings.length === 0 && (
            <Text style={styles.emptyText}>
              {activeRole === 'seller'
                ? 'No listings yet. Post your first one above.'
                : searchQuery
                  ? `No commodities match "${searchQuery}".`
                  : 'No listings available at the moment.'}
            </Text>
          )}
          {displayedListings.map((listing) => {
            const expanded = selectedId === listing.id;
            return (
              <View key={listing.id} style={styles.listingCard}>
                <Pressable onPress={() => setDetailListing(listing)}>
                  <Image source={{ uri: listing.imageUrl }} style={styles.listingImage} />
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceBadgeText}>
                      {CURRENCY}
                      {listing.price.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.listingBody}>
                    <Text style={styles.listingItem}>{listing.item}</Text>
                    <Text style={styles.listingMeta}>
                      {listing.quantity} {listing.unit}
                    </Text>
                    <View style={styles.listingOriginRow}>
                      <Feather name="map-pin" size={13} color={EcoColors.lime} />
                      <Text style={styles.listingOrigin}>{listing.origin}</Text>
                    </View>
                    <View style={styles.listingFooterRow}>
                      <Text style={styles.listingSeller}>{listing.sellerName}</Text>
                      <Text style={styles.listingTime}>{timeAgo(listing.createdAt)}</Text>
                    </View>
                  </View>
                </Pressable>

                {activeRole === 'buyer' && (
                  <View style={styles.listingActions}>
                    {expanded ? (
                      <View style={styles.buyForm}>
                        <TextInput
                          style={styles.input}
                          placeholder={`Quantity (${listing.unit}, up to ${listing.quantity})`}
                          placeholderTextColor={EcoColors.placeholder}
                          keyboardType="numeric"
                          value={buyQuantity}
                          onChangeText={setBuyQuantity}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Delivery destination"
                          placeholderTextColor={EcoColors.placeholder}
                          value={buyDestination}
                          onChangeText={setBuyDestination}
                        />
                        <View style={styles.row}>
                          <Pressable
                            style={[styles.submitButton, styles.rowInput]}
                            onPress={() => handleBuy(listing)}
                          >
                            <Text style={styles.submitButtonText}>Confirm</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.cancelButton, styles.rowInput]}
                            onPress={() => {
                              setSelectedId(null);
                              setBuyQuantity('');
                              setBuyDestination('');
                            }}
                          >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.row}>
                        <Pressable
                          style={[styles.buyButton, styles.rowInput]}
                          onPress={() => setSelectedId(listing.id)}
                        >
                          <Feather name="shopping-bag" size={14} color={EcoColors.onLime} />
                          <Text style={styles.buyButtonText}>Buy now</Text>
                        </Pressable>
                        <Pressable
                          style={styles.messageIconButton}
                          onPress={() =>
                            openConversationWith(listing.sellerId, listing.sellerName, listing.item)
                          }
                        >
                          <Feather name="message-square" size={15} color={EcoColors.text} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <ProductDetailModal
        listing={detailListing}
        onClose={() => setDetailListing(null)}
        canBuy={activeRole === 'buyer'}
        onBuy={() => {
          if (detailListing) setSelectedId(detailListing.id);
          setDetailListing(null);
        }}
        onMessageSeller={() => {
          if (detailListing) {
            openConversationWith(detailListing.sellerId, detailListing.sellerName, detailListing.item);
          }
          setDetailListing(null);
        }}
      />
    </AppShell>
  );
}

function ProductDetailModal({
  listing,
  onClose,
  canBuy,
  onBuy,
  onMessageSeller,
}: {
  listing: Listing | null;
  onClose: () => void;
  canBuy: boolean;
  onBuy: () => void;
  onMessageSeller: () => void;
}) {
  return (
    <Modal visible={!!listing} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      {listing && (
        <View style={modalStyles.centerWrap} pointerEvents="box-none">
          <View style={modalStyles.card}>
            <ScrollView>
              <View style={modalStyles.imageWrap}>
                <Image source={{ uri: listing.imageUrl }} style={modalStyles.image} />
                <Pressable style={modalStyles.closeButton} onPress={onClose}>
                  <Feather name="x" size={16} color="#0f172a" />
                </Pressable>
                <View style={modalStyles.pricePill}>
                  <Text style={modalStyles.pricePillText}>
                    {CURRENCY}
                    {listing.price.toLocaleString()}
                  </Text>
                </View>
              </View>
              <View style={modalStyles.body}>
                <Text style={modalStyles.title}>{listing.item}</Text>

                <Text style={modalStyles.sectionLabel}>Product</Text>
                <DetailRow icon="package" label="Quantity available" value={`${listing.quantity} ${listing.unit}`} />
                <DetailRow icon="tag" label="Price" value={`${CURRENCY}${listing.price.toLocaleString()}`} />
                <DetailRow icon="map-pin" label="Pickup location" value={listing.origin} />
                <DetailRow icon="calendar" label="Listed" value={timeAgo(listing.createdAt)} />

                <Text style={modalStyles.sectionLabel}>Seller</Text>
                <View style={modalStyles.sellerRow}>
                  <View style={modalStyles.sellerAvatar}>
                    <Text style={modalStyles.sellerAvatarText}>{listing.sellerName.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.sellerName}>{listing.sellerName}</Text>
                    <Text style={modalStyles.sellerMeta}>Verified seller · {listing.origin}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
            {canBuy && (
              <View style={modalStyles.actions}>
                <Pressable style={modalStyles.buyButton} onPress={onBuy}>
                  <Feather name="shopping-bag" size={15} color={EcoColors.onLime} />
                  <Text style={modalStyles.buyButtonText}>Buy now</Text>
                </Pressable>
                <Pressable style={modalStyles.messageButton} onPress={onMessageSeller}>
                  <Feather name="message-square" size={15} color={EcoColors.text} />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={modalStyles.detailRow}>
      <Feather name={icon} size={14} color={EcoColors.lime} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={modalStyles.detailLabel}>{label}</Text>
        <Text style={modalStyles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 18, paddingBottom: 40, gap: 16 },
  headerCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    backgroundColor: EcoColors.cardBgActive,
    padding: 20,
  },
  eyebrow: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: EcoColors.lime,
  },
  heading: { fontFamily: EcoFonts.headingExtraBold, fontSize: 24, color: EcoColors.text, marginTop: 8 },
  subtext: { fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.muted, marginTop: 6 },
  viewingPill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    backgroundColor: EcoColors.cardBg,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewingPillText: { fontFamily: EcoFonts.bodyBold, fontSize: 11, color: EcoColors.lime },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    backgroundColor: EcoColors.cardBg,
    borderRadius: 16,
    padding: 14,
  },
  infoBannerText: { flex: 1, fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.muted, lineHeight: 19 },
  toggleFormButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 13,
  },
  toggleFormButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.onLime },
  formCard: {
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: 'row', gap: 10 },
  rowInput: { flex: 1, minWidth: 0 },
  input: {
    fontFamily: EcoFonts.body,
    color: EcoColors.text,
    backgroundColor: EcoColors.fieldBg,
    borderWidth: 1,
    borderColor: EcoColors.line,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.onLime },
  cancelButton: {
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.text },
  buyRequestsCard: {
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  buyRequestsTitle: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.text },
  buyRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: EcoColors.borderSubtle,
    paddingTop: 12,
  },
  buyRequestItem: { fontFamily: EcoFonts.bodySemiBold, fontSize: 13, color: EcoColors.text },
  buyRequestMeta: { fontFamily: EcoFonts.body, fontSize: 12, color: EcoColors.muted, marginTop: 2 },
  messageButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: { justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 16, zIndex: 1 },
  searchInput: {
    fontFamily: EcoFonts.body,
    color: EcoColors.text,
    backgroundColor: EcoColors.fieldBg,
    borderWidth: 1,
    borderColor: EcoColors.line,
    borderRadius: 14,
    paddingVertical: 13,
    paddingLeft: 44,
    paddingRight: 16,
    fontSize: 14,
  },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: {
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    backgroundColor: EcoColors.fieldBg,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sortChipActive: { borderColor: EcoColors.lime, backgroundColor: EcoColors.cardBgActive },
  sortChipText: { fontFamily: EcoFonts.bodySemiBold, fontSize: 11, color: EcoColors.muted },
  sortChipTextActive: { color: EcoColors.lime },
  sectionLabel: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 12,
    color: EcoColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listingList: { gap: 12 },
  emptyText: {
    fontFamily: EcoFonts.body,
    color: EcoColors.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  listingCard: {
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 20,
    overflow: 'hidden',
  },
  listingImage: { width: '100%', height: 150 },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: EcoColors.lime,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  priceBadgeText: { fontFamily: EcoFonts.bodyBold, fontSize: 12, color: EcoColors.onLime },
  listingBody: { padding: 16 },
  listingItem: { fontFamily: EcoFonts.bodyBold, fontSize: 16, color: EcoColors.text },
  listingMeta: { fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.muted, marginTop: 4 },
  listingOriginRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  listingOrigin: { fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.muted },
  listingFooterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  listingSeller: { fontFamily: EcoFonts.bodySemiBold, fontSize: 12, color: EcoColors.cream },
  listingTime: { fontFamily: EcoFonts.body, fontSize: 12, color: EcoColors.placeholder },
  listingActions: { paddingHorizontal: 16, paddingBottom: 16 },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 12,
  },
  buyButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.onLime },
  messageIconButton: {
    width: 44,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyForm: { gap: 10 },
});

const modalStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  imageWrap: { height: 180, backgroundColor: '#e2e8f0' },
  image: { width: '100%', height: '100%' },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricePill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: EcoColors.lime,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  pricePillText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.onLime },
  body: { padding: 18 },
  title: { fontFamily: EcoFonts.headingBold, fontSize: 20, color: '#0f172a' },
  sectionLabel: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#94a3b8',
    marginTop: 18,
    marginBottom: 8,
  },
  detailRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  detailLabel: { fontFamily: EcoFonts.body, fontSize: 11, color: '#94a3b8' },
  detailValue: { fontFamily: EcoFonts.bodySemiBold, fontSize: 13, color: '#0f172a', marginTop: 2 },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarText: { fontFamily: EcoFonts.headingBold, fontSize: 15, color: '#047857' },
  sellerName: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: '#0f172a' },
  sellerMeta: { fontFamily: EcoFonts.body, fontSize: 11, color: '#94a3b8', marginTop: 2 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  buyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 13,
  },
  buyButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.onLime },
  messageButton: {
    width: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
