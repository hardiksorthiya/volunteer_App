import * as ImagePicker from 'expo-image-picker';

/**
 * Request photos access via the system dialog when the user picks a profile image.
 * No custom pre-permission screen (App Store Guideline 5.1.1).
 */
export async function ensureMediaLibraryPermission() {
  try {
    const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (existing.status === 'granted') {
      return true;
    }
    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return requested.status === 'granted';
  } catch (error) {
    console.warn('Media library permission request failed:', error?.message);
    return false;
  }
}

/**
 * Request camera access via the system dialog when the user chooses the camera option.
 */
export async function ensureCameraPermission() {
  try {
    const existing = await ImagePicker.getCameraPermissionsAsync();
    if (existing.status === 'granted') {
      return true;
    }
    const requested = await ImagePicker.requestCameraPermissionsAsync();
    return requested.status === 'granted';
  } catch (error) {
    console.warn('Camera permission request failed:', error?.message);
    return false;
  }
}
