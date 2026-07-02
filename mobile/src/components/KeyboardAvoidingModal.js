import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet } from 'react-native';
import { getKeyboardController } from '../utils/keyboardUi';

/**
 * Modal wrapper that lifts content above the keyboard when a TextInput is focused.
 */
export default function KeyboardAvoidingModal({ children, ...modalProps }) {
  const keyboardController = getKeyboardController();
  const AvoidingView = keyboardController?.KeyboardAvoidingView || KeyboardAvoidingView;

  return (
    <Modal {...modalProps}>
      <AvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        {children}
      </AvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
