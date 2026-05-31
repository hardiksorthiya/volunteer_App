import * as Location from 'expo-location';

/**
 * Current position for AI chat (with optional reverse-geocoded place label).
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
