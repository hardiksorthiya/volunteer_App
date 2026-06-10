import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

/**
 * Optional location for AI chat. Toggling on triggers the iOS/Android system permission
 * dialog directly — no custom "Allow" pre-prompt (Guideline 5.1.1).
 */
export default function ChatLocationToggle({ enabled, onToggle, disabled = false }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        Include my location for nearby volunteer suggestions (optional)
      </Text>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
        thumbColor={enabled ? '#2563eb' : '#f9fafb'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  label: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#4b5563',
  },
});
