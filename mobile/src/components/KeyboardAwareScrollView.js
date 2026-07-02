import React, { forwardRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getKeyboardController } from '../utils/keyboardUi';

/**
 * ScrollView that keeps the focused TextInput visible above the keyboard.
 * Production builds use react-native-keyboard-controller; Expo Go falls back to
 * KeyboardAvoidingView + ScrollView.
 */
const KeyboardAwareScrollView = forwardRef(function KeyboardAwareScrollView(
  {
    children,
    style,
    contentContainerStyle,
    bottomOffset,
    extraKeyboardSpace = 12,
    keyboardVerticalOffset = 0,
    ...rest
  },
  ref,
) {
  const insets = useSafeAreaInsets();
  const resolvedBottomOffset = bottomOffset ?? Math.max(insets.bottom, 20);
  const keyboardController = getKeyboardController();
  const NativeKeyboardAwareScrollView = keyboardController?.KeyboardAwareScrollView;

  if (NativeKeyboardAwareScrollView) {
    return (
      <NativeKeyboardAwareScrollView
        ref={ref}
        style={[styles.flex, style]}
        contentContainerStyle={contentContainerStyle}
        bottomOffset={resolvedBottomOffset}
        extraKeyboardSpace={extraKeyboardSpace}
        keyboardShouldPersistTaps="handled"
        {...rest}
      >
        {children}
      </NativeKeyboardAwareScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={ref}
        style={[styles.flex, style]}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

export default KeyboardAwareScrollView;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
