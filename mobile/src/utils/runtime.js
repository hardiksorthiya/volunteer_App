import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * True when running inside Expo Go (not a store / APK / IPA build).
 */
export function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

/**
 * True for EAS / standalone production builds (APK, AAB, TestFlight, App Store).
 */
export function isStandaloneApp() {
  if (Constants.appOwnership === 'expo') {
    return false;
  }
  return (
    Constants.appOwnership === 'standalone' ||
    Constants.executionEnvironment === 'standalone' ||
    Constants.executionEnvironment === 'bare'
  );
}

/**
 * Android production builds need manual keyboard lift (edge-to-edge breaks resize).
 * Expo Go on Android can rely on window resize.
 */
export function needsManualAndroidKeyboardLift() {
  return Platform.OS === 'android' && !isExpoGo();
}
