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

const STORAGE_KEY = 'chatConversations';
const LOCATION_DISMISSED_KEY = 'chatLocationDismissed';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const inputRef = useRef(null);

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

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, [messages, loading]);

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

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          style={styles.flex}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListEmptyComponent={<Text style={styles.empty}>Ask about volunteering.</Text>}
          ListFooterComponent={loading ? <ActivityIndicator style={styles.loader} color="#2563eb" /> : null}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.sender === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
              <Text style={item.sender === 'user' ? styles.textUser : styles.textAi}>{item.text}</Text>
            </View>
          )}
        />

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

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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
      </KeyboardAvoidingView>

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
  flex: { flex: 1 },
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
  list: { padding: 12, flexGrow: 1 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 48 },
  loader: { marginVertical: 12 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14, marginBottom: 8 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#2563eb' },
  bubbleAi: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  textUser: { color: '#fff', fontSize: 15 },
  textAi: { color: '#0f172a', fontSize: 15 },
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
    padding: 12,
    paddingTop: 8,
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
