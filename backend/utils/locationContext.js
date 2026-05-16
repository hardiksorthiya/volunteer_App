const geocodeCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

const cacheKey = (lat, lng) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

const pickAddressFields = (data) => {
  if (!data || typeof data !== 'object') return {};

  const address = data.address || {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    address.state_district ||
    '';
  const region = address.state || address.region || '';
  const country = address.country || '';

  const parts = [city, region, country].filter(Boolean);
  const label = parts.length > 0 ? parts.join(', ') : data.display_name || '';

  return { city, region, country, label };
};

const reverseGeocode = async (lat, lng) => {
  const key = cacheKey(lat, lng);
  const cached = geocodeCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'json');
  url.searchParams.set('zoom', '10');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'VolunteerConnect/1.0 (volunteer-connect-ai-chat)',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const fields = pickAddressFields(data);
  geocodeCache.set(key, { at: Date.now(), value: fields });
  return fields;
};

/**
 * Adds human-readable place fields when the client only sent coordinates.
 */
const enrichLocationContext = async (locationContext) => {
  if (!locationContext || typeof locationContext !== 'object') {
    return locationContext;
  }

  const lat = Number(locationContext.latitude);
  const lng = Number(locationContext.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return locationContext;
  }

  const enriched = { ...locationContext };

  if (enriched.label && enriched.city) {
    return enriched;
  }

  try {
    const geo = await reverseGeocode(lat, lng);
    if (geo) {
      if (!enriched.city && geo.city) enriched.city = geo.city;
      if (!enriched.region && geo.region) enriched.region = geo.region;
      if (!enriched.country && geo.country) enriched.country = geo.country;
      if (!enriched.label && geo.label) enriched.label = geo.label;
    }
  } catch (error) {
    console.warn('Reverse geocode failed for chat location:', error.message);
  }

  return enriched;
};

module.exports = { enrichLocationContext };
