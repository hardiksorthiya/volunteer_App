import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LocationIcon, SendIcon } from './Icons';

/**
 * ChatGPT-style composer: optional location pin (hidden after permission), send outside pill.
 */
const ChatPillInput = forwardRef(function ChatPillInput(
  {
    value,
    onChangeText,
    onSend,
    placeholder = 'Ask AI assistant',
    editable = true,
    sendDisabled = false,
    onFocus,
    onBlur,
    onSubmitEditing,
    keepFocusOnSend = true,
    onLocationPress,
    showLocationButton = false,
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
      <View style={styles.row}>
        <View style={[styles.pill, !showLocationButton && styles.pillNoLeading]}>
          {showLocationButton ? (
            <TouchableOpacity
              style={styles.locationBtn}
              onPress={onLocationPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityLabel="Enable location for nearby volunteer suggestions"
            >
              <LocationIcon size={22} color="#2563eb" />
            </TouchableOpacity>
          ) : null}
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#a1a1aa"
            editable={editable}
            multiline
            onFocus={onFocus}
            onBlur={onBlur}
            onSubmitEditing={handleSubmitEditing}
            returnKeyType="send"
            blurOnSubmit={false}
            enablesReturnKeyAutomatically
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, sendDisabled && styles.sendBtnDisabled]}
          onPress={handleSendPress}
          disabled={sendDisabled}
          activeOpacity={0.85}
        >
          <SendIcon size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default ChatPillInput;

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    paddingLeft: 4,
    paddingRight: 16,
    paddingVertical: 6,
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  pillNoLeading: {
    paddingLeft: 16,
  },
  locationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    backgroundColor: '#eff6ff',
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#18181b',
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 120,
    backgroundColor: 'transparent',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
