import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * ChatGPT-style shell: messages flex above a pinned composer.
 * Android uses window resize (app.json) — no manual keyboard offset.
 * iOS uses KeyboardAvoidingView padding.
 */
export default function ChatConversationLayout({
  header,
  footer,
  children,
  scrollRef,
  style,
  contentContainerStyle,
}) {
  const insets = useSafeAreaInsets();
  const footerPad = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 0);

  return (
    <KeyboardAvoidingView
      style={[styles.avoid, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}
    >
      <View style={styles.column}>
        {header ? <View style={styles.headerSlot}>{header}</View> : null}

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={[styles.messagesContent, contentContainerStyle]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {children}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: footerPad }]}>
          {footer}
        </View>
      </View>
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
    overflow: 'hidden',
  },
  headerSlot: {
    flexShrink: 0,
  },
  messages: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#f8f9fa',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  footer: {
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});
