import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAwareScrollView from './KeyboardAwareScrollView';

/**
 * Auth / form screens: scrollable layout with keyboard-aware scrolling.
 */
export default function KeyboardFormScreen({
  children,
  style,
  contentContainerStyle,
  refreshControl,
}) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 20);

  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        bottomOffset={bottomOffset}
        extraKeyboardSpace={12}
      >
        {children}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
});
