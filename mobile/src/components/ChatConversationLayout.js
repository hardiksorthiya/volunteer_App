import React from 'react';
import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { useChatAutoScroll } from '../hooks/useChatAutoScroll';
import { getKeyboardController } from '../utils/keyboardUi';

/**
 * ChatGPT-style shell: messages flex above a pinned composer.
 * iOS: KeyboardStickyView tracks the keyboard.
 * Android: adjustResize (useResizeMode) moves the layout — sticky must stay off to avoid a gap.
 */
export default function ChatConversationLayout({
  header,
  footer,
  children,
  scrollRef,
  style,
  contentContainerStyle,
  extraBottomInset = 0,
  variant = 'card',
}) {
  const insets = useSafeAreaInsets();
  const isFlat = variant === 'flat';
  const isAndroid = Platform.OS === 'android';
  const keyboardInset = useKeyboardInset();
  const keyboardOpen = keyboardInset > 0;
  useChatAutoScroll(scrollRef, [children]);
  const baseBottom =
    extraBottomInset > 0
      ? extraBottomInset
      : Math.max(insets.bottom, isAndroid ? 4 : 0);

  const keyboardController = getKeyboardController();
  const KeyboardStickyView = keyboardController?.KeyboardStickyView;
  const KeyboardAvoidingView = keyboardController?.KeyboardAvoidingView || RNKeyboardAvoidingView;

  // Sticky footer only on iOS. On Android, useResizeMode already resizes the window;
  // enabling sticky as well creates the large empty gap above the keyboard.
  const useIosSticky = !isAndroid && KeyboardStickyView != null;

  const footerBottomPad = (() => {
    if (!keyboardOpen) {
      return baseBottom;
    }
    if (useIosSticky) {
      return 0;
    }
    // Android: useResizeMode resizes the window — no extra keyboard padding.
    return baseBottom;
  })();

  const footerNode = (
    <View style={[styles.footer, isFlat && styles.footerFlat, { paddingBottom: footerBottomPad }]}>
      {footer}
    </View>
  );

  const footerSlot = useIosSticky ? (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }} style={styles.footerSticky}>
      {footerNode}
    </KeyboardStickyView>
  ) : (
    footerNode
  );

  const column = (
    <View style={[styles.column, isFlat && styles.columnFlat]}>
      {header ? <View style={styles.headerSlot}>{header}</View> : null}

      <ScrollView
        ref={scrollRef}
        style={[styles.messages, isFlat && styles.messagesFlat]}
        contentContainerStyle={[
          styles.messagesContent,
          contentContainerStyle,
          keyboardOpen && styles.messagesContentKeyboard,
        ]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {children}
      </ScrollView>

      {footerSlot}
    </View>
  );

  if (useIosSticky || isAndroid) {
    return <View style={[styles.avoid, style]}>{column}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.avoid, style]}
      behavior="padding"
      keyboardVerticalOffset={4}
    >
      {column}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  avoid: {
    flex: 1,
    minHeight: 0,
  },
  column: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  columnFlat: {
    borderRadius: 0,
  },
  headerSlot: {
    flexShrink: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  messages: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#f8f9fa',
  },
  messagesFlat: {
    backgroundColor: '#ffffff',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messagesContentKeyboard: {
    paddingBottom: 16,
  },
  footerSticky: {
    flexShrink: 0,
  },
  footer: {
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  footerFlat: {
    borderTopWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});
