import React from 'react';
import NativeKeyboardSetup from '../components/NativeKeyboardSetup';
import { getKeyboardController } from './keyboardUi';
import { isExpoGo } from './runtime';

/**
 * Wraps the app with KeyboardProvider in production builds.
 * Expo Go does not include the native keyboard-controller module.
 */
export function KeyboardRoot({ children }) {
  if (isExpoGo()) {
    return children;
  }

  const { KeyboardProvider } = getKeyboardController();

  return (
    <KeyboardProvider preload={false}>
      <NativeKeyboardSetup />
      {children}
    </KeyboardProvider>
  );
}
