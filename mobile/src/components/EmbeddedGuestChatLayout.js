import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

const DEFAULT_FOOTER_HEIGHT = 72;

/**
 * Chat layout for the fixed-height pre-login panel on the landing screen only.
 * Messages scroll above an in-flow composer (no sticky / no keyboard auto-scroll).
 */
export default function EmbeddedGuestChatLayout({
  children,
  scrollRef,
  footer,
  style,
  contentContainerStyle,
}) {
  const [footerHeight, setFooterHeight] = useState(DEFAULT_FOOTER_HEIGHT);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef?.current?.scrollToEnd?.({ animated: true });
    });
  }, [scrollRef]);

  return (
    <View style={[styles.root, style]}>
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[
          styles.content,
          contentContainerStyle,
          { paddingBottom: footerHeight + 8 },
        ]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator
        onContentSizeChange={scrollToEnd}
      >
        {children}
      </ScrollView>

      <View
        style={styles.footer}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - footerHeight) > 2) {
            setFooterHeight(h);
          }
        }}
      >
        {footer}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    backgroundColor: '#ffffff',
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
