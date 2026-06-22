import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

/** Trim px so the composer sits flush on the keyboard (no small gap). */
const ANDROID_GAP_TRIM = 14;
const IOS_GAP_TRIM = 6;

function readKeyboardHeight(event) {
  const end = event?.endCoordinates;
  if (!end) {
    return 0;
  }
  const windowHeight = Dimensions.get('window').height;
  const fromScreenY =
    typeof end.screenY === 'number' ? Math.max(0, windowHeight - end.screenY) : 0;
  const height = fromScreenY > 0 ? fromScreenY : (end.height ?? 0);
  return height > 0 ? height : 0;
}

/**
 * Returns current keyboard height in px (0 when hidden).
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(() => {
    if (Platform.OS !== 'android') {
      return 0;
    }
    const metrics = Keyboard.metrics();
    if (!metrics) {
      return 0;
    }
    const windowHeight = Dimensions.get('window').height;
    if (typeof metrics.screenY === 'number') {
      return Math.max(0, windowHeight - metrics.screenY);
    }
    if (typeof metrics.height === 'number') {
      return metrics.height;
    }
    return 0;
  });

  useEffect(() => {
    const onShow = (event) => {
      const height = readKeyboardHeight(event);
      if (height > 0) {
        setInset(height);
      }
    };
    const onHide = () => {
      setInset(0);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subscriptions = [
      Keyboard.addListener(showEvent, onShow),
      Keyboard.addListener(hideEvent, onHide),
      Keyboard.addListener('keyboardDidHide', onHide),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, []);

  return inset;
}

/**
 * Margin to lift the composer flush above the keyboard (0 when closed).
 */
export function getComposerKeyboardMargin(keyboardHeight) {
  if (!keyboardHeight || keyboardHeight <= 0) {
    return 0;
  }
  const trim = Platform.OS === 'ios' ? IOS_GAP_TRIM : ANDROID_GAP_TRIM;
  return Math.max(0, keyboardHeight - trim);
}

/**
 * Fallback keyboard height when Android does not emit keyboard events (Expo Go).
 */
export function estimateAndroidKeyboardHeight() {
  const windowHeight = Dimensions.get('window').height;
  const metrics = Keyboard.metrics();
  if (metrics?.screenY) {
    return Math.max(0, windowHeight - metrics.screenY);
  }
  if (metrics?.height) {
    return metrics.height;
  }
  return Math.round(windowHeight * 0.36);
}
