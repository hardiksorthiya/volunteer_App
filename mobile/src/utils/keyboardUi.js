import { isExpoGo } from './runtime';

/**
 * Lazy access to react-native-keyboard-controller (not available in Expo Go).
 */
export function getKeyboardController() {
  if (isExpoGo()) {
    return null;
  }
  return require('react-native-keyboard-controller');
}

export function hasNativeKeyboardController() {
  return !isExpoGo();
}
