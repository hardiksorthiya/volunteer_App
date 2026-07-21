import React, { forwardRef, useEffect, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/** Lazy-load native keyboard module when available. */
function getKeyboardController() {
  try {
    return require('react-native-keyboard-controller');
  } catch {
    return null;
  }
}

function ResizeModeSetup() {
  const { useResizeMode } = getKeyboardController() || {};
  useResizeMode?.();
  return null;
}

/**
 * App root wrapper — enables native keyboard resize when linked.
 */
export function KeyboardRoot({ children }) {
  const keyboardController = getKeyboardController();
  if (!keyboardController) {
    return children;
  }
  const { KeyboardProvider } = keyboardController;
  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent={false}>
      <ResizeModeSetup />
      {children}
    </KeyboardProvider>
  );
}

/**
 * Scroll view that keeps focused inputs above the keyboard.
 */
export const KeyboardAwareScrollView = forwardRef(function KeyboardAwareScrollView(
  {
    children,
    style,
    contentContainerStyle,
    bottomOffset,
    extraKeyboardSpace,
    disableKeyboardAvoidance = false,
    keyboardVerticalOffset: _unused,
    ...rest
  },
  ref,
) {
  const insets = useSafeAreaInsets();
  const resolvedBottomOffset = bottomOffset ?? Math.max(insets.bottom, 24);
  const resolvedExtraSpace = extraKeyboardSpace ?? (Platform.OS === 'android' ? 28 : 20);
  const NativeScroll = getKeyboardController()?.KeyboardAwareScrollView;

  if (!disableKeyboardAvoidance && NativeScroll) {
    return (
      <NativeScroll
        ref={ref}
        style={[styles.flex, style]}
        contentContainerStyle={contentContainerStyle}
        bottomOffset={resolvedBottomOffset}
        extraKeyboardSpace={resolvedExtraSpace}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        {...rest}
      >
        {children}
      </NativeScroll>
    );
  }

  return (
    <ScrollView
      ref={ref}
      style={[styles.flex, style]}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      {...rest}
    >
      {children}
    </ScrollView>
  );
});

/**
 * Full-screen form shell (Login / Register / Landing).
 */
export function KeyboardFormScreen({
  children,
  style,
  contentContainerStyle,
  refreshControl,
}) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={[styles.formSafe, style]} edges={['top', 'left', 'right']}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[styles.formContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        bottomOffset={Math.max(insets.bottom, 24)}
        extraKeyboardSpace={28}
      >
        {children}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

/**
 * Bottom padding so a Modal dialog sits on the keyboard.
 *
 * IMPORTANT: Android Modals often do NOT resize with the activity window.
 * Never subtract window-shrink for Modal pads — that cuts the input on Samsung etc.
 * Prefer Keyboard event `height` (not windowHeight - screenY after resize).
 */
export function useKeyboardBottomPad(closedPad = 0) {
  const [pad, setPad] = useState(closedPad);

  useEffect(() => {
    setPad(closedPad);
  }, [closedPad]);

  useEffect(() => {
    const readHeight = (event) => {
      const end = event?.endCoordinates;
      if (!end) {
        const metrics = Keyboard.metrics();
        if (!metrics) {
          return 0;
        }
        if (typeof metrics.height === 'number' && metrics.height > 0) {
          return metrics.height;
        }
        if (typeof metrics.screenY === 'number') {
          return Math.max(0, Dimensions.get('screen').height - metrics.screenY);
        }
        return 0;
      }
      // Prefer height — more stable across OEMs than screenY vs resized window.
      if (typeof end.height === 'number' && end.height > 0) {
        return end.height;
      }
      if (typeof end.screenY === 'number') {
        return Math.max(0, Dimensions.get('screen').height - end.screenY);
      }
      return 0;
    };

    const onShow = (event) => {
      const kb = readHeight(event);
      // Full keyboard height for Modal (do not subtract activity window shrink).
      setPad(kb > 0 ? Math.round(kb) : closedPad);
    };

    const onHide = () => {
      setPad(closedPad);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [closedPad]);

  return pad;
}

/**
 * Modal with a scrollable body (forms). Prefer useKeyboardBottomPad for bottom sheets.
 */
export function KeyboardAvoidingModal({ children, ...modalProps }) {
  return (
    <Modal {...modalProps}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.modalContent}
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
  flex: { flex: 1 },
  formSafe: { flex: 1, backgroundColor: '#1e3a8a' },
  formContent: { flexGrow: 1, paddingBottom: 32 },
  modalContent: { flexGrow: 1 },
});
