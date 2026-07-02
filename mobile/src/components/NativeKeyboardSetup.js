import React from 'react';
import { getKeyboardController } from '../utils/keyboardUi';

function NativeKeyboardSetupInner() {
  const { useResizeMode } = getKeyboardController();
  useResizeMode();
  return null;
}

/**
 * Enables adjustResize on Android production builds so inputs stay above the keyboard.
 */
export default function NativeKeyboardSetup() {
  if (!getKeyboardController()) {
    return null;
  }
  return <NativeKeyboardSetupInner />;
}
