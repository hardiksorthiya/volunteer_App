import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ PRODUCTION API URL (your live server)
const API_BASE_URL = "https://volunteerconnect.cloud/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Debug log
console.log('API Base URL:', API_BASE_URL);

// ✅ Convert relative image path to full URL
export const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return origin + (path.startsWith('/') ? path : '/' + path);
};

// ✅ Attach token automatically
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
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const authEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password'
    ];

    const requestUrl = error.config?.url || '';
    const isAuthEndpoint = authEndpoints.some(endpoint =>
      requestUrl.includes(endpoint)
    );

    if (error.response?.status === 401 && !isAuthEndpoint) {
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        console.log('🔒 Token expired - cleared storage');
      } catch (storageError) {
        console.error('Storage error:', storageError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;