/**
 * Resolves the user's current position for AI chat requests.
 */
export function getChatLocationContext() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
    );
  });
}

/**
 * Prompt for browser location permission and return coordinates.
 */
export function requestChatLocationPermission() {
  return getChatLocationContext();
}

export async function getLocationPermissionState() {
  try {
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    }
  } catch {
    // ignore
  }
  return 'prompt';
}
