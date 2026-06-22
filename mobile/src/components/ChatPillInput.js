import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SendIcon } from './Icons';

/**
 * ChatGPT-style pill input: rounded bar, text only + send button.
 * Keeps keyboard open after send when keepFocusOnSend is true.
 */
const ChatPillInput = forwardRef(function ChatPillInput(
  {
    value,
    onChangeText,
    onSend,
    placeholder = 'Type a message...',
    editable = true,
    sendDisabled = false,
    onFocus,
    onBlur,
    onSubmitEditing,
    keepFocusOnSend = true,
  },
  ref,
) {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => inputRef.current);

  const refocusInput = useCallback(() => {
    if (!keepFocusOnSend) {
      return;
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [keepFocusOnSend]);

  const handleSendPress = () => {
    if (sendDisabled) {
      return;
    }
    onSend?.();
    refocusInput();
  };

  const handleSubmitEditing = () => {
    if (sendDisabled) {
      return;
    }
    if (onSubmitEditing) {
      onSubmitEditing();
    } else {
      onSend?.();
    }
    refocusInput();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          editable={editable}
          multiline
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType="send"
          blurOnSubmit={false}
          enablesReturnKeyAutomatically
        />
        <TouchableOpacity
          style={[styles.sendBtn, sendDisabled && styles.sendBtnDisabled]}
          onPress={handleSendPress}
          disabled={sendDisabled}
          activeOpacity={0.85}
        >
          <SendIcon size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default ChatPillInput;

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#111827',
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingRight: 8,
    maxHeight: 120,
    backgroundColor: 'transparent',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});
