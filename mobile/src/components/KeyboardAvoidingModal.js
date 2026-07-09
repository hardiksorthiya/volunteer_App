import React from 'react';
import { Modal, ScrollView, StyleSheet } from 'react-native';

/** Modal with plain scroll — no keyboard padding or auto-scroll. */
export default function KeyboardAvoidingModal({ children, ...modalProps }) {
  return (
    <Modal {...modalProps}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
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
