import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MenuIcon } from './Icons';

/**
 * Minimal ChatGPT-style top bar: page title left, menu right.
 */
export default function ChatTopBar({ title = 'AI Assistant', onMenuPress }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: Math.max(insets.top, 12) }]}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <TouchableOpacity
        onPress={onMenuPress}
        style={styles.menuBtn}
        activeOpacity={0.7}
        accessibilityLabel="Open conversations"
      >
        <MenuIcon size={22} color="#18181b" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e4e4e7',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#18181b',
    letterSpacing: -0.3,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f4f4f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
