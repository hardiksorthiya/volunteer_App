import React from 'react';
import { Modal, ScrollView, StyleSheet } from 'react-native';
import { useKeyboardContentPadding } from '../hooks/useKeyboardContentPadding';

/**
 * Modal wrapper: scrolls focused inputs into view without pushing the whole popup upward.
 */
export default function KeyboardAvoidingModal({ children, ...modalProps }) {
  const keyboardPad = useKeyboardContentPadding(12);

  return (
    <Modal {...modalProps}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          keyboardPad > 0 && { paddingBottom: keyboardPad },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
