import React, { forwardRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getKeyboardController } from '../utils/keyboardUi';
import { useKeyboardContentPadding } from '../hooks/useKeyboardContentPadding';

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
    extraKeyboardSpace = 24,
    keyboardVerticalOffset = 0,
    ...rest
  },
  ref,
) {
  const insets = useSafeAreaInsets();
  const keyboardContentPad = useKeyboardContentPadding(20);
  const resolvedBottomOffset = bottomOffset ?? Math.max(insets.bottom, 16);
  const mergedContentStyle = [
    contentContainerStyle,
    keyboardContentPad > 0 && { paddingBottom: keyboardContentPad },
  ];

  const keyboardController = getKeyboardController();
  const NativeKeyboardAwareScrollView = keyboardController?.KeyboardAwareScrollView;

  if (NativeKeyboardAwareScrollView) {
    return (
      <NativeKeyboardAwareScrollView
        ref={ref}
        style={[styles.flex, style]}
        contentContainerStyle={mergedContentStyle}
        bottomOffset={resolvedBottomOffset}
        extraKeyboardSpace={extraKeyboardSpace}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        {...rest}
      >
        {children}
      </NativeKeyboardAwareScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={ref}
        style={[styles.flex, style]}
        contentContainerStyle={mergedContentStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        nestedScrollEnabled
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
