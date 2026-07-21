import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GuestAIChatPanel from './GuestAIChatPanel';
import { useKeyboardBottomPad } from './Keyboard';

const ANDROID_NAV_FALLBACK = 48;

/**
 * Floating AI button (Login / Register).
 * Same guest chat as landing; bottom pad tracks the keyboard (no cut-off / no large gap).
 */
export default function AIGuestFloatingWidget({ visible, onNavigateLogin }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? ANDROID_NAV_FALLBACK : 0,
  );
  // Modal does not follow activity resize — always lift by full keyboard height.
  const sheetBottomPad = useKeyboardBottomPad(bottomInset);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const timer = setTimeout(() => inputRef.current?.focus?.(), 350);
    return () => clearTimeout(timer);
  }, [open]);

  if (!visible) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { bottom: 16 + bottomInset }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityLabel="Open AI chat"
      >
        <Image
          source={require('../../assets/chatbot.png')}
          style={styles.fabIcon}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={[styles.overlay, { paddingBottom: open ? sheetBottomPad : 0 }]}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />
          <View style={styles.dialog}>
            <GuestAIChatPanel
              variant="embedded"
              inputRef={inputRef}
              onClose={() => setOpen(false)}
              onPressLogin={() => {
                setOpen(false);
                onNavigateLogin?.();
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
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
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    zIndex: 1,
  },
});
