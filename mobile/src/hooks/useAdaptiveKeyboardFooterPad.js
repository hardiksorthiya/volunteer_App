import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';
import { needsManualAndroidKeyboardLift } from '../utils/runtime';
import { getComposerKeyboardMargin, useKeyboardInset } from './useKeyboardInset';

/**
 * Footer padding for chat composers (Expo Go fallback path).
 * - iOS: KeyboardAvoidingView handles layout; only safe-area padding here.
 * - Android Expo Go: window resize works — no manual keyboard pad.
 * - Android production: always lift manually (edge-to-edge breaks resize).
 */
export function useAdaptiveKeyboardFooterPad(baseInset = 0, options = {}) {
  const { skipManualPad = false } = options;
  const keyboardInset = useKeyboardInset();
  const keyboardPad = getComposerKeyboardMargin(keyboardInset);
  const baselineWindowHeight = useRef(Dimensions.get('window').height);
  const [expoGoAndroidLift, setExpoGoAndroidLift] = useState(false);
  const forceManualLift = needsManualAndroidKeyboardLift();

  useEffect(() => {
    if (forceManualLift || Platform.OS !== 'android') {
      return undefined;
    }

    const onShow = (event) => {
      const keyboardHeight = event?.endCoordinates?.height ?? keyboardInset;
      const currentHeight = Dimensions.get('window').height;
      const shrink = baselineWindowHeight.current - currentHeight;
      setExpoGoAndroidLift(shrink < 100 && keyboardHeight > 0);
    };

    const onHide = () => {
      setExpoGoAndroidLift(false);
      requestAnimationFrame(() => {
        baselineWindowHeight.current = Dimensions.get('window').height;
      });
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [forceManualLift, keyboardInset]);

  const manualPad =
    !skipManualPad &&
    Platform.OS === 'android' &&
    keyboardPad > 0 &&
    (forceManualLift || expoGoAndroidLift)
      ? keyboardPad
      : 0;

  return {
    keyboardOpen: keyboardInset > 0,
    keyboardPad,
    footerPaddingBottom: baseInset + manualPad,
    manualAndroidLift: forceManualLift || expoGoAndroidLift,
  };
}
