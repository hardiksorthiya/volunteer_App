import React, { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useChatAutoScroll } from '../hooks/useChatAutoScroll';

/**
 * Simple chat shell: messages scroll + composer footer.
 */
export default function SimpleChatLayout({
  children,
  footer,
  style,
  contentContainerStyle,
  messagesStyle,
  footerStyle,
  /** Change when messages/loading update so the list scrolls to the latest reply. */
  autoScrollDeps = [],
}) {
  const scrollRef = useRef(null);
  const scrollToLatest = useChatAutoScroll(scrollRef, autoScrollDeps);

  return (
    <View style={[styles.root, style]}>
      <ScrollView
        ref={scrollRef}
        style={[styles.messages, messagesStyle]}
        contentContainerStyle={[styles.content, { paddingBottom: 16 }, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator
        onContentSizeChange={() => scrollToLatest(true)}
        onLayout={() => {
          requestAnimationFrame(() => {
            scrollRef.current?.scrollToEnd?.({ animated: false });
          });
        }}
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
