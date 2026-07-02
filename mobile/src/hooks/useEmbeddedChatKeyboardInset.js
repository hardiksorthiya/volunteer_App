import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';
import { needsManualAndroidKeyboardLift } from '../utils/runtime';
import { getComposerKeyboardMargin, useKeyboardInset } from './useKeyboardInset';

/**
 * Keyboard lift for fixed-height guest chat panels (embedded / bottom sheet).
 */
export function useEmbeddedChatKeyboardInset() {
  const keyboardInset = useKeyboardInset();
  const keyboardPad = getComposerKeyboardMargin(keyboardInset);
  const baselineWindowHeight = useRef(Dimensions.get('window').height);
  const [expoGoLift, setExpoGoLift] = useState(0);
  const forceManualLift = needsManualAndroidKeyboardLift();

  useEffect(() => {
    if (keyboardInset <= 0) {
      setExpoGoLift(0);
      return undefined;
    }

    if (forceManualLift || Platform.OS === 'ios') {
      return undefined;
    }

    const currentHeight = Dimensions.get('window').height;
    const shrink = baselineWindowHeight.current - currentHeight;
    setExpoGoLift(shrink < 100 ? keyboardPad : 0);

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setExpoGoLift(0);
      requestAnimationFrame(() => {
        baselineWindowHeight.current = Dimensions.get('window').height;
      });
    });

    return () => hideSub.remove();
  }, [forceManualLift, keyboardInset, keyboardPad]);

  if (keyboardInset <= 0) {
    return 0;
  }

  if (Platform.OS === 'ios' || forceManualLift) {
    return keyboardPad;
  }

  return expoGoLift;
}
