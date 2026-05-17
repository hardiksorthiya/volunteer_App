/**
 * User-friendly message for axios / fetch failures (avoids raw "Network Error").
 */
export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  const code = error.code || '';
  const status = error.response?.status;
  const serverMessage = error.response?.data?.message;

  if (serverMessage && typeof serverMessage === 'string') {
    return serverMessage;
  }

  if (code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Request timed out. Check your internet connection and try again.';
  }

  if (
    code === 'ECONNREFUSED' ||
    code === 'ERR_NETWORK' ||
    code === 'NETWORK_ERROR' ||
    error.message === 'Network Error'
  ) {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }

  if (status === 401) {
    return 'Session expired. Please log in again.';
  }

  if (status === 503) {
    return 'Service is temporarily unavailable. Please try again later.';
  }

  if (status >= 500) {
    return 'Server error. Please try again in a moment.';
  }

  if (error.message && !error.message.includes('Request failed with status')) {
    return error.message;
  }

  return fallback;
}
