import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

export const PERMISSIONS_ONBOARDING_KEY = 'permissions_onboarding_complete';

export async function hasCompletedPermissionsOnboarding() {
  try {
    const value = await AsyncStorage.getItem(PERMISSIONS_ONBOARDING_KEY);
    if (value === 'true') {
      return true;
    }

    // Skip for users who already had the app before this onboarding was added
    const [token, user] = await Promise.all([
      AsyncStorage.getItem('token'),
      AsyncStorage.getItem('user'),
    ]);
    if (token || user) {
      await markPermissionsOnboardingComplete();
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function markPermissionsOnboardingComplete() {
  await AsyncStorage.setItem(PERMISSIONS_ONBOARDING_KEY, 'true');
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Shows the device system permission popups (location, photos/media, camera)
 * one after another. Used once on first app launch after install.
 */
export async function requestAllAppPermissions() {
  const results = {
    location: 'undetermined',
    mediaLibrary: 'undetermined',
    camera: 'undetermined',
  };

  try {
    const location = await Location.requestForegroundPermissionsAsync();
    results.location = location.status;
  } catch (error) {
    console.warn('Location permission request failed:', error?.message);
  }

  await delay(400);

  try {
    const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
    results.mediaLibrary = media.status;
  } catch (error) {
    console.warn('Media library permission request failed:', error?.message);
  }

  await delay(400);

  try {
    const camera = await ImagePicker.requestCameraPermissionsAsync();
    results.camera = camera.status;
  } catch (error) {
    console.warn('Camera permission request failed:', error?.message);
  }

  return results;
}
