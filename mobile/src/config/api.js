import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DEFAULT_API_URL = 'https://volunteerconnect.cloud/api';
const CHAT_TIMEOUT_MS = 60000;
const DEFAULT_TIMEOUT_MS = 30000;

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  Constants.manifest?.extra?.apiUrl ||
  DEFAULT_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: DEFAULT_TIMEOUT_MS,
});

console.log('API Base URL:', API_BASE_URL);

export const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return origin + (path.startsWith('/') ? path : '/' + path);
};

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }

    const url = config.url || '';
    if (url.includes('/chat')) {
      config.timeout = CHAT_TIMEOUT_MS;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const authEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
    ];

    const requestUrl = error.config?.url || '';
    const isAuthEndpoint = authEndpoints.some((endpoint) =>
      requestUrl.includes(endpoint)
    );

    if (error.response?.status === 401 && !isAuthEndpoint) {
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      } catch (storageError) {
        console.error('Storage error:', storageError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
