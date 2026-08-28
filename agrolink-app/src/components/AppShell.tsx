import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useMarketStore, Role, ROLE_LABELS } from '../store/MarketStore';
import { EcoColors, EcoFonts } from '../constants/ecoTheme';
import { logoutUser } from '../services/authService';
import MessagesDrawer from './MessagesDrawer';

type TabKey = 'home' | 'marketplace' | 'logistics' | 'extension';

const WIDE_BREAKPOINT = 768;

const TABS: { key: TabKey; label: string; route: '/dashboard' | '/marketplace' | '/logistics' | '/extension'; icon: string }[] = [
  { key: 'home', label: 'Home', route: '/dashboard', icon: 'view-dashboard-outline' },
  { key: 'marketplace', label: 'Market', route: '/marketplace', icon: 'cart-outline' },
  { key: 'logistics', label: 'Delivery', route: '/logistics', icon: 'truck-outline' },
  { key: 'extension', label: 'Services', route: '/extension', icon: 'sprout-outline' },
];

export default function AppShell({
  active,
  children,
}: {
  active: TabKey;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const {
    roles,
    activeRole,
    setActiveRole,
    currentUser,
    setCurrentUser,
    myConversations,
    openMessages,
  } = useMarketStore();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const conversationCount = myConversations().length;

  const handleTabPress = (route: (typeof TABS)[number]['route']) => {
    router.replace(route);
  };

  const handleSelectRole = (role: Role) => {
    setActiveRole(role);
    setRoleMenuOpen(false);
  };

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    try {
      await logoutUser();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    setCurrentUser(null);
    router.replace('/login');
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.logoRow} onPress={() => router.replace('/dashboard')}>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="leaf" size={18} color={EcoColors.onLime} />
          </View>
          <Text style={styles.logoText}>
            Agro<Text style={{ color: EcoColors.lime }}>Link</Text>
          </Text>
        </Pressable>

        {isWide && (
          <View style={styles.navLinks}>
            {TABS.map((tab) => {
              const isActive = tab.key === active;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.navLink, isActive && styles.navLinkActive]}
                  onPress={() => handleTabPress(tab.route)}
                >
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={16}
                    color={isActive ? EcoColors.onLime : EcoColors.muted}
                  />
                  <Text style={[styles.navLinkText, isActive && styles.navLinkTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.headerActions}>
          {isWide && <Text style={styles.modeLabel}>Mode</Text>}
          {roles.length > 1 ? (
            <Pressable
              style={[styles.rolePill, isWide && styles.rolePillWide]}
              onPress={() => setRoleMenuOpen(true)}
            >
              <Text style={styles.rolePillText}>{ROLE_LABELS[activeRole]}</Text>
              <Feather name="chevron-down" size={13} color={EcoColors.lime} />
            </Pressable>
          ) : (
            <View style={[styles.rolePill, isWide && styles.rolePillWide]}>
              <Text style={styles.rolePillText}>{ROLE_LABELS[activeRole]}</Text>
            </View>
          )}

          <Pressable style={styles.iconButton} onPress={() => openMessages()}>
            <Feather name="message-square" size={17} color={EcoColors.lime} />
            {conversationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{conversationCount}</Text>
              </View>
            )}
          </Pressable>

          <Pressable style={styles.iconButton} onPress={() => setAccountMenuOpen(true)}>
            <Feather name="user" size={17} color={EcoColors.lime} />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>{children}</View>

      {!isWide && (
        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {TABS.map((tab) => {
            const isActive = tab.key === active;
            return (
              <Pressable
                key={tab.key}
                style={styles.tabButton}
                onPress={() => handleTabPress(tab.route)}
              >
                <View style={[styles.tabIconWrap, isActive && styles.tabIconWrapActive]}>
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={18}
                    color={isActive ? EcoColors.onLime : EcoColors.muted}
                  />
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal
        visible={roleMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleMenuOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setRoleMenuOpen(false)}>
          <View style={[styles.dropdown, { top: insets.top + 56 }]}>
            <Text style={styles.dropdownLabel}>Switch mode</Text>
            {roles.map((role) => (
              <Pressable
                key={role}
                style={styles.dropdownItem}
                onPress={() => handleSelectRole(role)}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    role === activeRole && { color: EcoColors.lime },
                  ]}
                >
                  {ROLE_LABELS[role]}
                </Text>
                {role === activeRole && (
                  <Feather name="check" size={15} color={EcoColors.lime} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={accountMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountMenuOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setAccountMenuOpen(false)}>
          <View style={[styles.dropdown, styles.accountDropdown, { top: insets.top + 56 }]}>
            <View style={styles.accountHeader}>
              <Text style={styles.accountName} numberOfLines={1}>
                {currentUser?.name || 'Account'}
              </Text>
              {currentUser?.email ? (
                <Text style={styles.accountEmail} numberOfLines={1}>
                  {currentUser.email}
                </Text>
              ) : null}
            </View>
            <Pressable
              style={[styles.dropdownItem, styles.dropdownItemLeft]}
              onPress={() => {
                setAccountMenuOpen(false);
                router.push('/profile');
              }}
            >
              <Feather name="settings" size={15} color={EcoColors.muted} />
              <Text style={styles.dropdownItemText}>Edit profile</Text>
            </Pressable>
            {currentUser?.isAdmin && (
              <Pressable
                style={[styles.dropdownItem, styles.dropdownItemLeft]}
                onPress={() => {
                  setAccountMenuOpen(false);
                  router.push('/admin');
                }}
              >
                <Feather name="shield" size={15} color={EcoColors.lime} />
                <Text style={styles.dropdownItemText}>Admin</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.dropdownItem, styles.dropdownItemLeft]}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={15} color="#fca5a5" />
              <Text style={[styles.dropdownItemText, { color: '#fca5a5' }]}>Sign out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <MessagesDrawer />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: EcoColors.void },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: EcoColors.borderSubtle,
    backgroundColor: 'rgba(11,61,46,0.95)',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: EcoColors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontFamily: EcoFonts.headingExtraBold, fontSize: 16, color: EcoColors.text },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  navLinkActive: { backgroundColor: EcoColors.lime },
  navLinkText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.muted },
  navLinkTextActive: { color: EcoColors.onLime },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeLabel: { fontFamily: EcoFonts.bodySemiBold, fontSize: 11, color: EcoColors.muted, marginRight: 2 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    backgroundColor: EcoColors.cardBg,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  rolePillWide: {
    borderRadius: 10,
    backgroundColor: EcoColors.cardBgActive,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rolePillText: { fontFamily: EcoFonts.bodyBold, fontSize: 11, color: EcoColors.lime },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    backgroundColor: EcoColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: EcoColors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: EcoFonts.bodyBold, fontSize: 9, color: EcoColors.onLime },
  content: { flex: 1 },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: EcoColors.borderSubtle,
    backgroundColor: EcoColors.cardBg,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabButton: { flex: 1, alignItems: 'center', gap: 4 },
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: { backgroundColor: EcoColors.lime },
  tabLabel: { fontFamily: EcoFonts.bodyBold, fontSize: 10, color: EcoColors.muted },
  tabLabelActive: { color: EcoColors.text },
  overlay: { flex: 1 },
  dropdown: {
    position: 'absolute',
    right: 18,
    width: 200,
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 16,
    padding: 6,
  },
  dropdownLabel: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: EcoColors.muted,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  dropdownItemLeft: {
    justifyContent: 'flex-start',
  },
  dropdownItemText: { fontFamily: EcoFonts.bodySemiBold, fontSize: 13, color: EcoColors.text },
  accountDropdown: { width: 220 },
  accountHeader: {
    borderBottomWidth: 1,
    borderBottomColor: EcoColors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 4,
  },
  accountName: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.text },
  accountEmail: { fontFamily: EcoFonts.body, fontSize: 11, color: EcoColors.muted, marginTop: 2 },
});
