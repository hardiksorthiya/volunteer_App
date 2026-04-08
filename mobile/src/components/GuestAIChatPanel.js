import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SendIcon } from './Icons';
import { GUEST_LIMIT, useGuestAiChat } from '../hooks/useGuestAiChat';

/**
 * @param {{ variant?: 'embedded' | 'sheet', onPressLogin?: () => void, onClose?: () => void }} props
 */
const GuestAIChatPanel = ({ variant = 'embedded', onPressLogin, onClose }) => {
  const {
    input,
    setInput,
    loading,
    messages,
    remaining,
    handleSend,
    requestLocation,
  } = useGuestAiChat({ enabled: true });

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const isEmbedded = variant === 'embedded';

  return (
    <View style={[styles.root, isEmbedded ? styles.rootEmbedded : styles.rootSheet]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI assistant</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerBadge}>Volunteer Connect</Text>
          {onClose ? (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Text style={styles.limitText}>
        {remaining > 0
          ? `${remaining} free question${remaining === 1 ? '' : 's'} left without login`
          : 'Free limit reached — log in to continue.'}
      </Text>

      <ScrollView
        style={[styles.messagesWrap, isEmbedded && styles.messagesWrapEmbedded]}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <Text style={styles.emptyText}>
            Ask anything about volunteering. You can send up to {GUEST_LIMIT} messages without an account.
          </Text>
        )}

        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[styles.messageRow, msg.sender === 'user' ? styles.userRow : styles.aiRow]}
          >
            <Text style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
              {msg.text}
            </Text>
          </View>
        ))}

        {loading && (
          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loaderText}>AI is typing...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={remaining > 0 ? 'Ask your question...' : 'Log in to continue'}
          editable={!loading && remaining > 0}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading || remaining <= 0) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading || remaining <= 0}
        >
          <SendIcon size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {remaining <= 0 && onPressLogin && (
        <TouchableOpacity style={styles.loginBtn} onPress={onPressLogin}>
          <Text style={styles.loginBtnText}>Log in to continue</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rootEmbedded: {
    minHeight: 360,
    maxHeight: 480,
  },
  rootSheet: {
    minHeight: 420,
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#374151',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  limitText: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    color: '#334155',
    fontSize: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  messagesWrap: {
    flexGrow: 0,
    flexShrink: 1,
  },
  messagesWrapEmbedded: {
    height: 220,
    maxHeight: 260,
  },
  messagesContent: {
    padding: 12,
    flexGrow: 1,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 20,
  },
  messageRow: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  userBubble: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  aiBubble: {
    backgroundColor: '#f3f4f6',
    color: '#111827',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  loaderText: {
    fontSize: 12,
    color: '#6b7280',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  loginBtn: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default GuestAIChatPanel;
