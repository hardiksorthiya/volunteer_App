import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LocationIcon } from './Icons';

/**
 * Banner shown on AI chat when location is off. Tapping Allow opens the native
 * system permission dialog (no custom pre-prompt).
 */
export default function LocationPermissionBar({
  visible,
  canAskAgain = true,
  locationLabel,
  onEnable,
  compact = false,
}) {
  if (!visible) {
    return null;
  }

  const actionLabel = canAskAgain ? 'Allow' : 'Open Settings';

  return (
    <View style={[styles.bar, compact && styles.barCompact]}>
      <View style={styles.iconWrap}>
        <LocationIcon size={compact ? 18 : 20} color="#1d4ed8" />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, compact && styles.titleCompact]}>
          Location access
        </Text>
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]} numberOfLines={2}>
          {locationLabel
            ? `Using ${locationLabel} for nearby volunteer suggestions`
            : 'Allow location so the AI can suggest volunteer opportunities near you.'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.actionBtn, compact && styles.actionBtnCompact]}
        onPress={onEnable}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
      >
        <Text style={[styles.actionText, compact && styles.actionTextCompact]}>
          {actionLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  barCompact: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 2,
  },
  titleCompact: {
    fontSize: 12,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
    color: '#3b82f6',
  },
  subtitleCompact: {
    fontSize: 10,
    lineHeight: 14,
  },
  actionBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionTextCompact: {
    fontSize: 12,
  },
});
