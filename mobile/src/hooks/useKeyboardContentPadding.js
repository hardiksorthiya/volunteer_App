import { Platform } from 'react-native';
import { getComposerKeyboardMargin, useKeyboardInset } from './useKeyboardInset';
import { useKeyboardResizeDetected } from './useKeyboardResizeDetected';
import { needsManualAndroidKeyboardLift } from '../utils/runtime';

/**
 * Extra bottom padding for scroll/modal content when the keyboard is open
 * and the window did not shrink (common on Android production / edge-to-edge).
 */
export function useKeyboardContentPadding(minPad = 16) {
  const keyboardInset = useKeyboardInset();
  const windowResized = useKeyboardResizeDetected();

  if (keyboardInset <= 0) {
    return 0;
  }

  const keyboardMargin = getComposerKeyboardMargin(keyboardInset);

  if (windowResized) {
    return minPad;
  }

  if (needsManualAndroidKeyboardLift()) {
    return keyboardMargin + minPad;
  }

  if (Platform.OS === 'ios') {
    return minPad;
  }

  return keyboardMargin + minPad;
}
