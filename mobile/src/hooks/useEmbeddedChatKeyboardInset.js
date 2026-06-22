import { Platform } from 'react-native';
import { getComposerKeyboardMargin, useKeyboardInset } from './useKeyboardInset';

/**
 * Manual keyboard lift for fixed-height chat panels (guest embed / bottom sheet).
 * Full-screen chat uses ChatConversationLayout + OS resize instead.
 */
export function useEmbeddedChatKeyboardInset() {
  const keyboardInset = useKeyboardInset();

  if (Platform.OS === 'ios') {
    return getComposerKeyboardMargin(keyboardInset);
  }

  // Android full-screen chat relies on window resize; embedded panels still need this.
  return getComposerKeyboardMargin(keyboardInset);
}
