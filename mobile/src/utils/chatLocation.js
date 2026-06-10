import * as Location from 'expo-location';

/**
 * Read current permission status without prompting.
 */
export async function getLocationPermissionStatus() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status;
  } catch {
    return 'undetermined';
  }
}

/**
 * Request location via the system dialog only (no custom pre-prompt).
 * Call when the user explicitly enables a location-dependent feature.
 */
export async function requestChatLocationPermission() {
  try {
    const result = await Location.requestForegroundPermissionsAsync();
    return result.status;
  } catch (error) {
    console.warn('Location permission request failed:', error.message);
    return 'undetermined';
  }
}

/**
 * Current position for AI chat when permission is already granted.
 * Does not show any dialog unless requestIfNeeded is true (user-initiated feature only).
 */
export async function getChatLocationContext({ requestIfNeeded = false } = {}) {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    let status = existing.status;

    if (status !== 'granted' && requestIfNeeded) {
      const requested = await Location.requestForegroundPermissionsAsync();
      status = requested.status;
    }

    if (status !== 'granted') {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const payload = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };

    try {
      const places = await Location.reverseGeocodeAsync({
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
      const place = places?.[0];
      if (place) {
        const city =
          place.city || place.subregion || place.district || place.name || '';
        const region = place.region || '';
        const country = place.country || '';
        if (city) payload.city = city;
        if (region) payload.region = region;
        if (country) payload.country = country;
        const labelParts = [city, region, country].filter(Boolean);
        if (labelParts.length > 0) {
          payload.label = labelParts.join(', ');
        }
      }
    } catch {
      // Coordinates alone are still useful; backend may reverse-geocode.
    }

    return payload;
  } catch (error) {
    console.warn('Chat location unavailable:', error.message);
    return null;
  }
}

/**
 * User turned on "include location" in chat — triggers system permission, then reads coords.
 */
export async function enableChatLocationSharing() {
  const status = await getLocationPermissionStatus();
  if (status !== 'granted') {
    const requested = await requestChatLocationPermission();
    if (requested !== 'granted') {
      return null;
    }
  }
  return getChatLocationContext();
}
