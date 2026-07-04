import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../config/api';
import { getApiErrorMessage } from '../utils/apiErrors';
import {
  getChatLocationContext,
  getLocationPermissionState,
  enableChatLocationSharing,
} from '../utils/chatLocation';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { useKeyboardResizeDetected } from '../hooks/useKeyboardResizeDetected';
import { useChatAutoScroll } from '../hooks/useChatAutoScroll';
import { getKeyboardController } from '../utils/keyboardUi';
import { isExpoGo, needsManualAndroidKeyboardLift } from '../utils/runtime';

const STORAGE_KEY = 'chatConversations';
const LOCATION_DISMISSED_KEY = 'chatLocationDismissed';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const keyboardInset = useKeyboardInset();
  const windowResizedOnKeyboard = useKeyboardResizeDetected();
  const keyboardController = getKeyboardController();
  const KeyboardStickyView = keyboardController?.KeyboardStickyView;

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

  // APK: sticky composer tracks keyboard. Disabled when adjustResize already shrank the window.
  const useStickyFooter =
    KeyboardStickyView != null &&
    (Platform.OS === 'ios' ||
      (needsManualAndroidKeyboardLift() && !(keyboardInset > 0 && windowResizedOnKeyboard)));

  const refreshLocation = useCallback(async () => {
    const dismissed = await AsyncStorage.getItem(LOCATION_DISMISSED_KEY);
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

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const list = JSON.parse(raw);
        setChats(list);
        if (list[0]) {
          setChatId(list[0].id);
          setMessages(list[0].messages || []);
        }
      } catch (_) {}
    });
    api.get('/chat/status').then((r) => setAiOk(!!r.data?.configured)).catch(() => setAiOk(false));
    refreshLocation();
  }, [refreshLocation]);

  useFocusEffect(useCallback(() => { refreshLocation(); }, [refreshLocation]));

  const scrollToEnd = useChatAutoScroll(listRef, [messages, loading]);

  useEffect(() => {
    scrollToEnd(true);
  }, [keyboardInset, scrollToEnd]);

  const persist = (list) => {
    setChats(list);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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
    await AsyncStorage.setItem(LOCATION_DISMISSED_KEY, 'true');
    setShowLocationBar(false);
  };

  const onAllowLocation = async () => {
    const payload = await enableChatLocationSharing();
    await hideLocationBar();
    await refreshLocation();
    if (payload?.label) setLocationLabel(payload.label);
  };

  const onDenyLocation = () => hideLocationBar();

  const onInfoPress = () => {
    Alert.alert(
      'Location',
      locationGranted
        ? `Location is enabled${locationLabel ? ` (${locationLabel})` : ''}.`
        : 'Enable location so AI can suggest nearby volunteer activities.',
      locationGranted
        ? [{ text: 'OK' }]
        : [
            { text: 'Not now', style: 'cancel' },
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
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const footer = (
    <View style={styles.footer}>
      {showLocationBar && (
        <View style={styles.locBar}>
          <Text style={styles.locLabel}>Allow location for nearby suggestions?</Text>
          <View style={styles.locRow}>
            <Pressable style={styles.locBtnGray} onPress={onDenyLocation}>
              <Text style={styles.locBtnGrayText}>Deny</Text>
            </Pressable>
            <Pressable style={styles.locBtnBlue} onPress={onAllowLocation}>
              <Text style={styles.locBtnBlueText}>Allow</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.composer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={aiOk ? 'Message…' : 'AI unavailable'}
          placeholderTextColor="#94a3b8"
          editable={aiOk && !loading}
          multiline
        />
        <TouchableOpacity
          style={[styles.send, (!text.trim() || loading) && styles.sendOff]}
          onPress={send}
          disabled={!text.trim() || loading}
        >
          <Text style={styles.sendLabel}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const listAndFooter = (
    <>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={[
          messages.length === 0 ? styles.listEmpty : styles.listContent,
          keyboardInset > 0 && styles.listContentKeyboard,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => scrollToEnd(false)}
        onLayout={() => scrollToEnd(false)}
        ListEmptyComponent={<Text style={styles.empty}>Ask about volunteering.</Text>}
        ListFooterComponent={loading ? <ActivityIndicator style={styles.loader} color="#2563eb" /> : null}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
            <Text style={item.sender === 'user' ? styles.textUser : styles.textAi}>{item.text}</Text>
          </View>
        )}
      />

      {useStickyFooter ? (
        <KeyboardStickyView offset={{ closed: 0, opened: 0 }} style={styles.footerSticky}>
          {footer}
        </KeyboardStickyView>
      ) : (
        footer
      )}
    </>
  );

  const chatBody =
    isExpoGo() && Platform.OS === 'ios' ? (
      <KeyboardAvoidingView style={styles.body} behavior="padding">
        {listAndFooter}
      </KeyboardAvoidingView>
    ) : (
      <View style={styles.body}>{listAndFooter}</View>
    );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setHistoryOpen(true)}>
          <Text style={styles.iconText}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AI Assistant</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={onInfoPress}>
          <Text style={styles.iconText}>ⓘ</Text>
        </TouchableOpacity>
      </View>

      {chatBody}

      <Modal visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <View style={[styles.modal, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Chats</Text>
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
            data={chats}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.chatRow}
                onPress={() => {
                  setChatId(item.id);
                  setMessages(item.messages || []);
                  setHistoryOpen(false);
                }}
              >
                <Text numberOfLines={1}>{item.title}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  body: { flex: 1, minHeight: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20, color: '#2563eb' },
  list: { flex: 1, backgroundColor: '#f1f5f9' },
  listContent: { padding: 12, paddingBottom: 8 },
  listContentKeyboard: { paddingBottom: 16 },
  listEmpty: { flexGrow: 1, padding: 12, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#64748b' },
  loader: { marginVertical: 12 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14, marginBottom: 8 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#2563eb' },
  bubbleAi: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  textUser: { color: '#fff', fontSize: 15 },
  textAi: { color: '#0f172a', fontSize: 15 },
  footerSticky: { flexShrink: 0 },
  footer: { flexShrink: 0, backgroundColor: '#fff' },
  locBar: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
  },
  locLabel: { fontSize: 13, color: '#1e40af', marginBottom: 8 },
  locRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  locBtnGray: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#e2e8f0' },
  locBtnGrayText: { color: '#475569', fontWeight: '600' },
  locBtnBlue: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#2563eb' },
  locBtnBlueText: { color: '#fff', fontWeight: '600' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    color: '#0f172a',
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.4 },
  sendLabel: { color: '#fff', fontSize: 20, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: '#f8fafc' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  done: { color: '#2563eb', fontWeight: '600' },
  newBtn: { margin: 12, padding: 12, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center' },
  newBtnText: { color: '#fff', fontWeight: '600' },
  chatRow: { padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
});
