import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import {
  KeyboardStickyView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import api from '../config/api';
import { getApiErrorMessage } from '../utils/apiErrors';
import {
  getChatLocationContext,
  getLocationPermissionState,
  enableChatLocationSharing,
} from '../utils/chatLocation';
import {
  chatConversationsKey,
  chatLocationDismissedKey,
  getCurrentUserId,
} from '../utils/chatStorage';
import SimpleChatLayout from '../components/SimpleChatLayout';
import ChatPillInput from '../components/ChatPillInput';
import LocationPermissionBar from '../components/LocationPermissionBar';

const aiMarkdownStyles = {
  body: { color: '#0f172a', fontSize: 15, lineHeight: 22 },
  strong: { fontWeight: '700', color: '#0f172a' },
  paragraph: { marginTop: 4, marginBottom: 4 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  // Same keyboard height source as KeyboardStickyView (RN Keyboard events miss on some Samsungs).
  const kb = useKeyboardState((s) => (s.isVisible && s.height > 0 ? Math.round(s.height) : 0));
  // Composer already sits below the list; sticky only needs keyboard height + small gap.
  const listPad = kb > 0 ? kb + 16 : 20;

  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiOk, setAiOk] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationLabel, setLocationLabel] = useState(null);
  const [showLocationBar, setShowLocationBar] = useState(false);

  const loadChatsForUser = useCallback(async (uid) => {
    const key = chatConversationsKey(uid);
    if (!key) {
      setChats([]);
      setChatId(null);
      setMessages([]);
      return;
    }
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      setChats([]);
      setChatId(null);
      setMessages([]);
      return;
    }
    try {
      const list = JSON.parse(raw);
      setChats(list);
      if (list[0]) {
        setChatId(list[0].id);
        setMessages(list[0].messages || []);
      } else {
        setChatId(null);
        setMessages([]);
      }
    } catch {
      setChats([]);
      setChatId(null);
      setMessages([]);
    }
  }, []);

  const refreshLocation = useCallback(async (uid) => {
    const dismissedKey = chatLocationDismissedKey(uid);
    const dismissed = await AsyncStorage.getItem(dismissedKey);
    const state = await getLocationPermissionState();
    setLocationGranted(state.granted);

    if (state.granted) {
      const ctx = await getChatLocationContext();
      if (ctx?.label) setLocationLabel(ctx.label);
      setShowLocationBar(false);
      return;
    }

    setShowLocationBar(dismissed !== 'true');
  }, []);

  const initScreen = useCallback(async () => {
    const uid = await getCurrentUserId();
    setUserId(uid);
    await loadChatsForUser(uid);
    await refreshLocation(uid);
    api.get('/chat/status').then((r) => setAiOk(!!r.data?.configured)).catch(() => setAiOk(false));
  }, [loadChatsForUser, refreshLocation]);

  useEffect(() => {
    initScreen();
  }, [initScreen]);

  useFocusEffect(
    useCallback(() => {
      initScreen();
    }, [initScreen]),
  );

  const persist = async (list, uid = userId) => {
    const key = chatConversationsKey(uid);
    if (!key) return;
    setChats(list);
    await AsyncStorage.setItem(key, JSON.stringify(list));
  };

  const saveMessages = (id, nextMessages, title) => {
    const list = chats.some((c) => c.id === id)
      ? chats.map((c) =>
          c.id === id
            ? { ...c, messages: nextMessages, title: title || c.title, updatedAt: new Date().toISOString() }
            : c,
        )
      : [{ id, title: title || 'Chat', messages: nextMessages, updatedAt: new Date().toISOString() }, ...chats];
    persist(list);
  };

  const hideLocationBar = async () => {
    await AsyncStorage.setItem(chatLocationDismissedKey(userId), 'true');
    setShowLocationBar(false);
  };

  const onAllowLocation = async () => {
    const payload = await enableChatLocationSharing();
    await hideLocationBar();
    await refreshLocation(userId);
    if (payload?.label) setLocationLabel(payload.label);
  };

  const onInfoPress = () => {
    Alert.alert(
      'Location',
      locationGranted
        ? `Location is enabled${locationLabel ? ` (${locationLabel})` : ''}.`
        : 'Enable location so AI can suggest nearby volunteer activities.',
      locationGranted
        ? [{ text: 'OK' }]
        : [
            { text: 'Not now', style: 'cancel', onPress: hideLocationBar },
            { text: 'Allow', onPress: onAllowLocation },
          ],
    );
  };

  const send = async () => {
    const msg = text.trim();
    if (!msg || loading || !aiOk) return;

    let id = chatId || Date.now();
    if (!chatId) setChatId(id);

    const userMsg = { id: Date.now(), sender: 'user', text: msg };
    const next = [...messages, userMsg];
    setMessages(next);
    setText('');
    setLoading(true);
    saveMessages(id, next, msg.slice(0, 28));

    const history = next.slice(0, -1).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    let locationContext = null;
    if (locationGranted) {
      locationContext = (await getChatLocationContext()) || null;
    }

    try {
      const res = await api.post('/chat', { message: msg, conversationHistory: history, locationContext });
      const withAi = [...next, { id: Date.now() + 1, sender: 'ai', text: res.data.message || 'No response.' }];
      setMessages(withAi);
      saveMessages(id, withAi);
    } catch (e) {
      const withAi = [...next, { id: Date.now() + 1, sender: 'ai', text: getApiErrorMessage(e, 'Try again.') }];
      setMessages(withAi);
      saveMessages(id, withAi);
    } finally {
      setLoading(false);
    }
  };

  const deleteChat = (id) => {
    Alert.alert('Delete chat', 'Remove this conversation from your history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = chats.filter((c) => c.id !== id);
          persist(updated);
          if (chatId === id) {
            if (updated[0]) {
              setChatId(updated[0].id);
              setMessages(updated[0].messages || []);
            } else {
              setChatId(null);
              setMessages([]);
            }
          }
        },
      },
    ]);
  };

  const chatFooter = (
    <>
      <LocationPermissionBar
        visible={showLocationBar}
        canAskAgain
        locationLabel={locationLabel}
        onEnable={onAllowLocation}
        compact
      />
      <ChatPillInput
        value={text}
        onChangeText={setText}
        placeholder={aiOk ? 'Ask about volunteering…' : 'AI unavailable'}
        editable={aiOk && !loading}
        sendDisabled={!text.trim() || loading || !aiOk}
        onSend={send}
        showLocationButton={false}
        keepFocusOnSend
      />
    </>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.hero, { paddingTop: Math.max(insets.top, 8) }]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Volunteer Connect logo"
        />
        <Text style={styles.heroTitle}>Volunteer Connect</Text>
        <Text style={styles.heroTagline}>Connect. Volunteer. Make a Difference.</Text>

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setHistoryOpen(true)}>
            <Text style={styles.iconText}>☰</Text>
          </TouchableOpacity>
          <View style={styles.toolbarCenter}>
            <Text style={styles.toolbarTitle}>AI Assistant</Text>
            <Text style={styles.toolbarBadge}>Your personal volunteer guide</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={onInfoPress}>
            <Text style={styles.iconText}>ⓘ</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.chatPanel}>
        <SimpleChatLayout
          style={styles.body}
          contentContainerStyle={[styles.messagesContent, { paddingBottom: listPad }]}
          messagesStyle={styles.messagesFlat}
          autoScrollDeps={[
            messages.length,
            loading,
            chatId,
            listPad,
            messages[messages.length - 1]?.id,
            messages[messages.length - 1]?.text?.length,
          ]}
        >
          {messages.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>How can I help you volunteer today?</Text>
              <Text style={styles.empty}>
                Ask about opportunities, hours, activities, or how to use Volunteer Connect.
              </Text>
            </View>
          )}
          {messages.map((item) => (
            <View
              key={item.id}
              style={[
                styles.messageRow,
                item.sender === 'user' ? styles.messageRowUser : styles.messageRowAi,
              ]}
            >
              <View style={[styles.bubble, item.sender === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                {item.sender === 'ai' ? (
                  <Markdown style={aiMarkdownStyles}>{item.text}</Markdown>
                ) : (
                  <Text style={styles.textUser}>{item.text}</Text>
                )}
              </View>
            </View>
          ))}
          {loading && <ActivityIndicator style={styles.loader} color="#2563eb" />}
        </SimpleChatLayout>

        <KeyboardStickyView offset={{ closed: 0, opened: 0 }} style={styles.composer}>
          {chatFooter}
        </KeyboardStickyView>
      </View>

      <Modal visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <View style={[styles.modal, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Your chats</Text>
            <Pressable onPress={() => setHistoryOpen(false)}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => {
              setChatId(null);
              setMessages([]);
              setHistoryOpen(false);
            }}
          >
            <Text style={styles.newBtnText}>+ New chat</Text>
          </TouchableOpacity>
          <FlatList
            data={[...chats].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={
              <Text style={styles.historyEmpty}>No conversations yet. Start a new chat!</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.chatRow}>
                <TouchableOpacity
                  style={styles.chatRowMain}
                  onPress={() => {
                    setChatId(item.id);
                    setMessages(item.messages || []);
                    setHistoryOpen(false);
                  }}
                >
                  <Text style={styles.chatRowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.chatRowMeta} numberOfLines={1}>
                    {item.messages?.length || 0} messages
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chatRowDelete} onPress={() => deleteChat(item.id)}>
                  <Text style={styles.chatRowDeleteText}>×</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1e3a8a' },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  logo: {
    width: 180,
    height: 50,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  heroTagline: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    marginBottom: 12,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: 4,
  },
  toolbarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  toolbarBadge: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  iconText: { fontSize: 18, color: '#ffffff', fontWeight: '600' },
  chatPanel: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 0,
  },
  body: { flex: 1, minHeight: 0 },
  messagesFlat: { backgroundColor: '#f8fafc' },
  composer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  messagesContent: { padding: 14, paddingTop: 12 },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 24 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 14, lineHeight: 20 },
  loader: { marginVertical: 12 },
  messageRow: { marginBottom: 10, flexDirection: 'row' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAi: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '88%', padding: 12, borderRadius: 14 },
  bubbleUser: { backgroundColor: '#2563eb' },
  bubbleAi: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textUser: { color: '#fff', fontSize: 15, lineHeight: 22 },
  modal: { flex: 1, backgroundColor: '#f8fafc' },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  done: { color: '#2563eb', fontWeight: '600', fontSize: 16 },
  newBtn: {
    margin: 12,
    padding: 12,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    alignItems: 'center',
  },
  newBtnText: { color: '#fff', fontWeight: '600' },
  historyEmpty: {
    textAlign: 'center',
    color: '#64748b',
    padding: 24,
    fontSize: 14,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  chatRowMain: { flex: 1, padding: 14 },
  chatRowTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  chatRowMeta: { fontSize: 12, color: '#64748b' },
  chatRowDelete: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatRowDeleteText: { fontSize: 22, color: '#94a3b8', fontWeight: '600' },
});
