import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import GuestAIChatPanel from './GuestAIChatPanel';

const AIGuestFloatingWidget = ({ visible, onNavigateLogin }) => {
  const [open, setOpen] = useState(false);

  if (!visible) return null;

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setOpen(true)} activeOpacity={0.85} accessibilityLabel="Open AI chat">
        <Image
          source={require('../../assets/chatbot.png')}
          style={styles.fabIcon}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.panelWrap}>
            <View style={styles.sheetInner}>
              <GuestAIChatPanel
                variant="sheet"
                onClose={() => setOpen(false)}
                onPressLogin={() => {
                  setOpen(false);
                  onNavigateLogin?.();
                }}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 7,
    elevation: 8,
    zIndex: 20,
  },
  fabIcon: {
    width: 32,
    height: 32,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 30,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  panelWrap: {
    width: '100%',
  },
  sheetInner: {
    maxHeight: '85%',
  },
});

export default AIGuestFloatingWidget;
