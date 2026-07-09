import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

/** Messages above a fixed footer — no keyboard or auto-scroll logic. */
export default function SimpleChatLayout({
  children,
  footer,
  style,
  contentContainerStyle,
  messagesStyle,
  footerStyle,
}) {
  return (
    <View style={[styles.root, style]}>
      <ScrollView
        style={[styles.messages, messagesStyle]}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, footerStyle]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  messages: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 12,
  },
  footer: {
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});
