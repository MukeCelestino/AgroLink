import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { useMarketStore } from '../store/MarketStore';
import { SYSTEM_SENDER_ID } from '../services/messagingService';
import { EcoColors, EcoFonts } from '../constants/ecoTheme';

function timeAgo(iso: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function MessagesDrawer() {
  const {
    messagesOpen,
    closeMessages,
    myConversations,
    messages,
    sendMessage,
    activeConversationId,
    setActiveConversationId,
    currentUser,
  } = useMarketStore();
  const myId = currentUser?.id || 'me';
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const conversations = myConversations();
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  // The AgroLink system channel (verification decisions) is one-way — no
  // composer is shown, and firestore.rules independently blocks the write
  // even if someone tried to send one anyway.
  const isSystemThread = activeConversation?.participantIds.includes(SYSTEM_SENDER_ID) ?? false;
  const thread = messages
    .filter((m) => m.conversationId === activeConversationId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const otherName = (conversation: typeof activeConversation) => {
    if (!conversation) return '';
    const otherId = conversation.participantIds.find((id) => id !== myId);
    return otherId ? conversation.participantNames[otherId] : 'Conversation';
  };

  useEffect(() => {
    if (messagesOpen && !activeConversationId && conversations.length) {
      setActiveConversationId(conversations[0].id);
    }
  }, [messagesOpen, activeConversationId, conversations, setActiveConversationId]);

  useEffect(() => {
    if (thread.length) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [thread.length]);

  const handleSend = () => {
    if (!activeConversationId || !draft.trim()) return;
    sendMessage(activeConversationId, draft);
    setDraft('');
  };

  return (
    <Modal
      visible={messagesOpen}
      animationType="slide"
      transparent
      onRequestClose={closeMessages}
    >
      <Pressable style={styles.backdrop} onPress={closeMessages} />
      <SafeAreaView style={styles.panel} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {activeConversation && (
                <Pressable
                  onPress={() => setActiveConversationId(null)}
                  hitSlop={8}
                  style={styles.backButton}
                >
                  <Feather name="chevron-left" size={20} color={EcoColors.muted} />
                </Pressable>
              )}
              <Feather name="message-square" size={18} color={EcoColors.lime} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeConversation ? otherName(activeConversation) : 'Messages'}
              </Text>
            </View>
            <Pressable onPress={closeMessages} hitSlop={8}>
              <Feather name="x" size={20} color={EcoColors.muted} />
            </Pressable>
          </View>

          {!activeConversation ? (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No conversations yet.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  style={styles.conversationRow}
                  onPress={() => setActiveConversationId(item.id)}
                >
                  <View style={styles.conversationAvatar}>
                    <Text style={styles.conversationAvatarText}>
                      {otherName(item).charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.conversationName} numberOfLines={1}>
                      {otherName(item)}
                    </Text>
                    {item.subject ? (
                      <Text style={styles.conversationSubject} numberOfLines={1}>
                        {item.subject}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              )}
            />
          ) : (
            <>
              <FlatList
                ref={listRef}
                data={thread}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.threadContent}
                renderItem={({ item }) => {
                  const mine = item.senderId === myId;
                  return (
                    <View
                      style={[
                        styles.bubbleRow,
                        { justifyContent: mine ? 'flex-end' : 'flex-start' },
                      ]}
                    >
                      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                        <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>
                          {item.text}
                        </Text>
                        <Text style={mine ? styles.bubbleTimeMine : styles.bubbleTime}>
                          {timeAgo(item.timestamp)}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
              {isSystemThread ? (
                <View style={styles.systemNotice}>
                  <Feather name="lock" size={12} color={EcoColors.muted} />
                  <Text style={styles.systemNoticeText}>
                    Automated notifications from AgroLink — replies aren't monitored.
                  </Text>
                </View>
              ) : (
                <View style={styles.composer}>
                  <TextInput
                    style={styles.composerInput}
                    placeholder="Write a message…"
                    placeholderTextColor={EcoColors.placeholder}
                    value={draft}
                    onChangeText={setDraft}
                    multiline
                  />
                  <Pressable
                    style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!draft.trim()}
                  >
                    <Feather name="send" size={16} color={EcoColors.onLime} />
                  </Pressable>
                </View>
              )}
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    maxWidth: 420,
    backgroundColor: EcoColors.cardBg,
    borderLeftWidth: 1,
    borderLeftColor: EcoColors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: EcoColors.borderSubtle,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 12 },
  backButton: { marginRight: 2 },
  headerTitle: {
    fontFamily: EcoFonts.headingBold,
    fontSize: 16,
    color: EcoColors.text,
    flexShrink: 1,
  },
  listContent: { paddingVertical: 4 },
  emptyText: {
    fontFamily: EcoFonts.body,
    fontSize: 13,
    color: EcoColors.muted,
    padding: 20,
    textAlign: 'center',
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: EcoColors.borderSubtle,
  },
  conversationAvatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: EcoColors.cardBgActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationAvatarText: {
    fontFamily: EcoFonts.headingExtraBold,
    fontSize: 15,
    color: EcoColors.lime,
  },
  conversationName: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.text },
  conversationSubject: {
    fontFamily: EcoFonts.body,
    fontSize: 12,
    color: EcoColors.muted,
    marginTop: 2,
  },
  threadContent: { padding: 14, gap: 10, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', marginBottom: 4 },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: EcoColors.lime },
  bubbleTheirs: {
    backgroundColor: EcoColors.cardBgActive,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
  },
  bubbleText: { fontFamily: EcoFonts.body, fontSize: 14, color: EcoColors.text },
  bubbleTextMine: { fontFamily: EcoFonts.body, fontSize: 14, color: EcoColors.onLime },
  bubbleTime: { fontFamily: EcoFonts.body, fontSize: 10, color: EcoColors.muted, marginTop: 4 },
  bubbleTimeMine: { fontFamily: EcoFonts.body, fontSize: 10, color: '#28430b', marginTop: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: EcoColors.borderSubtle,
  },
  composerInput: {
    flex: 1,
    fontFamily: EcoFonts.body,
    color: EcoColors.text,
    backgroundColor: EcoColors.fieldBg,
    borderWidth: 1,
    borderColor: EcoColors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: EcoColors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
  systemNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: EcoColors.borderSubtle,
  },
  systemNoticeText: {
    flex: 1,
    fontFamily: EcoFonts.body,
    fontSize: 11,
    color: EcoColors.muted,
  },
});
