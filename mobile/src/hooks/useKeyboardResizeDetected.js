import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard } from 'react-native';
import { useKeyboardInset } from './useKeyboardInset';

/**
 * True when the window height shrinks on keyboard open (adjustResize / Expo Go).
 * Sticky footer must be disabled in that case to avoid double-lift gaps.
 */
export function useKeyboardResizeDetected() {
  const keyboardInset = useKeyboardInset();
  const baselineWindowHeight = useRef(Dimensions.get('window').height);
  const [resized, setResized] = useState(false);

  useEffect(() => {
    if (keyboardInset <= 0) {
      setResized(false);
      return;
    }

    const currentHeight = Dimensions.get('window').height;
    const shrink = baselineWindowHeight.current - currentHeight;
    setResized(shrink >= 72);
  }, [keyboardInset]);

  useEffect(() => {
    const onHide = () => {
      requestAnimationFrame(() => {
        baselineWindowHeight.current = Dimensions.get('window').height;
      });
    };

    const sub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => sub.remove();
  }, []);

  return resized;
}
