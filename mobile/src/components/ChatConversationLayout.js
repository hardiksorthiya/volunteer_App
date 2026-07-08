import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { useKeyboardResizeDetected } from '../hooks/useKeyboardResizeDetected';
import { getKeyboardController } from '../utils/keyboardUi';
import { isExpoGo, needsManualAndroidKeyboardLift } from '../utils/runtime';

const DEFAULT_FOOTER_HEIGHT = 72;

/**
 * ChatGPT-style shell: messages flex above a pinned composer.
 * iOS / Android APK: KeyboardStickyView tracks the keyboard when resize is unavailable.
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
  const windowResizedOnKeyboard = useKeyboardResizeDetected();
  const [footerHeight, setFooterHeight] = useState(DEFAULT_FOOTER_HEIGHT);
  const baseBottom =
    extraBottomInset > 0
      ? extraBottomInset
      : Math.max(insets.bottom, isAndroid ? 4 : 0);

  const keyboardController = getKeyboardController();
  const KeyboardStickyView = keyboardController?.KeyboardStickyView;
  const KeyboardAvoidingView = keyboardController?.KeyboardAvoidingView || RNKeyboardAvoidingView;

  const useIosSticky = !isAndroid && KeyboardStickyView != null;
  const useAndroidSticky =
    isAndroid &&
    KeyboardStickyView != null &&
    needsManualAndroidKeyboardLift() &&
    !(keyboardOpen && windowResizedOnKeyboard);
  const useStickyFooter = useIosSticky || useAndroidSticky;

  const scrollMessagesToEnd = useCallback(
    (animated = true) => {
      requestAnimationFrame(() => {
        scrollRef?.current?.scrollToEnd?.({ animated });
      });
    },
    [scrollRef],
  );

  const scrollMessagesToEndWithRetries = useCallback(() => {
    [0, 80, 200].forEach((delay) => {
      setTimeout(() => scrollMessagesToEnd(delay === 0), delay);
    });
  }, [scrollMessagesToEnd]);

  useEffect(() => {
    if (keyboardInset > 0) {
      scrollMessagesToEndWithRetries();
    }
  }, [keyboardInset, scrollMessagesToEndWithRetries]);

  // Footer in layout flow (Expo Go / adjustResize): only small pad — flexGrow was causing answers to jump to top.
  const messagesBottomPad = useStickyFooter ? footerHeight + 12 : 8;

  const footerBottomPad = (() => {
    if (!keyboardOpen) {
      return baseBottom;
    }
    if (useStickyFooter) {
      return 0;
    }
    return baseBottom;
  })();

  const footerNode = (
    <View
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && Math.abs(h - footerHeight) > 2) {
          setFooterHeight(h);
        }
      }}
      style={[styles.footer, isFlat && styles.footerFlat, { paddingBottom: footerBottomPad }]}
    >
      {footer}
    </View>
  );

  const footerSlot = useStickyFooter ? (
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
        contentContainerStyle={[styles.messagesContent, contentContainerStyle, { paddingBottom: messagesBottomPad }]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator
        onContentSizeChange={() => scrollMessagesToEnd(false)}
      >
        {children}
      </ScrollView>

      {footerSlot}
    </View>
  );

  if (useStickyFooter || isAndroid) {
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

export { DEFAULT_FOOTER_HEIGHT };

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
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#f8fafc',
  },
  messagesContent: {
    padding: 16,
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
