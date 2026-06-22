import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { GUEST_LIMIT, useGuestAiChat } from '../hooks/useGuestAiChat';
import { useEmbeddedChatKeyboardInset } from '../hooks/useEmbeddedChatKeyboardInset';
import ChatConversationLayout from './ChatConversationLayout';
import ChatLocationToggle from './ChatLocationToggle';
import ChatPillInput from './ChatPillInput';

/**
 * @param {{
 *   variant?: 'embedded' | 'sheet',
 *   onPressLogin?: () => void,
 *   onClose?: () => void,
 * }} props
 */
const GuestAIChatPanel = ({
  variant = 'embedded',
  onPressLogin,
  onClose,
}) => {
  const {
    input,
    setInput,
    loading,
    messages,
    remaining,
    handleSend: sendMessage,
    shareLocation,
    toggleShareLocation,
  } = useGuestAiChat({ enabled: true });

  const messagesScrollRef = useRef(null);
  const inputRef = useRef(null);
  const keyboardInset = useEmbeddedChatKeyboardInset();
  const isEmbedded = variant === 'embedded';

  useEffect(() => {
    messagesScrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const onSendMessage = async () => {
    await sendMessage();
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const panelHeader = (
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
  );

  const limitBanner = (
    <Text style={styles.limitText} numberOfLines={1}>
      {remaining > 0
        ? `${remaining} free question${remaining === 1 ? '' : 's'} left without login`
        : 'Free limit reached — log in to continue.'}
    </Text>
  );

  const chatFooter = (
    <>
      <ChatLocationToggle
        enabled={shareLocation}
        disabled={loading || remaining <= 0}
        onToggle={toggleShareLocation}
      />
      <ChatPillInput
        ref={inputRef}
        value={input}
        onChangeText={setInput}
        placeholder={remaining > 0 ? 'Message AI assistant...' : 'Log in to continue'}
        editable={!loading && remaining > 0}
        sendDisabled={!input.trim() || loading || remaining <= 0}
        onSend={onSendMessage}
        keepFocusOnSend
      />
      {remaining <= 0 && onPressLogin && (
        <TouchableOpacity style={styles.loginBtn} onPress={onPressLogin}>
          <Text style={styles.loginBtnText}>Log in to continue</Text>
        </TouchableOpacity>
      )}
    </>
  );

  if (isEmbedded) {
    return (
      <View
        style={[
          styles.root,
          styles.rootEmbedded,
          keyboardInset > 0 && { marginBottom: keyboardInset },
        ]}
      >
        {panelHeader}
        {limitBanner}
        <ChatConversationLayout
          scrollRef={messagesScrollRef}
          style={styles.embeddedLayout}
          contentContainerStyle={styles.embeddedMessagesContent}
          footer={chatFooter}
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
              <View style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
                {msg.sender === 'ai' ? (
                  <Markdown style={aiMarkdownStyles}>{msg.text}</Markdown>
                ) : (
                  <Text style={styles.userBubbleText}>{msg.text}</Text>
                )}
              </View>
            </View>
          ))}
          {loading && (
            <View style={styles.loaderRow}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.loaderText}>AI is typing...</Text>
            </View>
          )}
        </ChatConversationLayout>
      </View>
    );
  }

  return (
    <View style={[styles.root, styles.rootSheet]}>
      {panelHeader}
      {limitBanner}
      <ChatConversationLayout
        scrollRef={messagesScrollRef}
        style={styles.sheetLayout}
        footer={chatFooter}
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
            <View style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
              {msg.sender === 'ai' ? (
                <Markdown style={aiMarkdownStyles}>{msg.text}</Markdown>
              ) : (
                <Text style={styles.userBubbleText}>{msg.text}</Text>
              )}
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loaderText}>AI is typing...</Text>
          </View>
        )}
      </ChatConversationLayout>
    </View>
  );
};

const aiMarkdownStyles = {
  body: { color: '#111827', fontSize: 13, lineHeight: 20 },
  strong: { fontWeight: '700', color: '#111827' },
  paragraph: { marginTop: 4, marginBottom: 4 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  rootEmbedded: {
    height: 440,
    maxHeight: 440,
  },
  rootSheet: {
    height: 480,
    maxHeight: 480,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 0,
  },
  embeddedLayout: {
    flex: 1,
    minHeight: 0,
  },
  sheetLayout: {
    flex: 1,
    minHeight: 0,
  },
  embeddedMessagesContent: {
    padding: 12,
    paddingBottom: 8,
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
  },
  userBubbleText: {
    color: '#ffffff',
    fontSize: 13,
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
