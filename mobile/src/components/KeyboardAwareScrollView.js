import React, { forwardRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

/** Plain ScrollView — no keyboard auto-scroll or padding. */
const KeyboardAwareScrollView = forwardRef(function KeyboardAwareScrollView(
  {
    children,
    style,
    contentContainerStyle,
    disableKeyboardAvoidance: _disableKeyboardAvoidance,
    bottomOffset: _bottomOffset,
    extraKeyboardSpace: _extraKeyboardSpace,
    keyboardVerticalOffset: _keyboardVerticalOffset,
    ...rest
  },
  ref,
) {
  return (
    <ScrollView
      ref={ref}
      style={[styles.flex, style]}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      {...rest}
    >
      {children}
    </ScrollView>
  );
});

export default KeyboardAwareScrollView;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
