import { useCallback, useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import {
  estimateAndroidKeyboardHeight,
  getComposerKeyboardMargin,
  useKeyboardInset,
} from './useKeyboardInset';

/**
 * Keyboard offset for chat composers only — does not scroll the screen.
 */
export function useChatKeyboardLayout() {
  const keyboardInset = useKeyboardInset();
  const [keyboardFallback, setKeyboardFallback] = useState(0);

  const keyboardHeight = keyboardInset || keyboardFallback;
  const keyboardOpen = keyboardHeight > 0;
  const keyboardPadding = getComposerKeyboardMargin(keyboardHeight);

  useEffect(() => {
    if (keyboardInset === 0) {
      setKeyboardFallback(0);
    }
  }, [keyboardInset]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardFallback(0);
    });

    return () => hideSub.remove();
  }, []);

  const onInputFocus = useCallback(() => {
    if (Platform.OS === 'android' && keyboardInset === 0) {
      setKeyboardFallback(estimateAndroidKeyboardHeight());
    }
  }, [keyboardInset]);

  return {
    keyboardHeight,
    keyboardOpen,
    keyboardPadding,
    onInputFocus,
  };
}
