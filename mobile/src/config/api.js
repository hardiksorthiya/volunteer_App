import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// API Configuration
// IMPORTANT: Update this URL based on your environment:
// - iOS Simulator: 'http://localhost:3000/api'
// - Android Emulator: 'http://10.0.2.2:3000/api'
// - Physical Device: 'http://YOUR_COMPUTER_IP:3000/api' (e.g., 'http://192.168.1.100:3000/api')
// 
// To find your computer's IP address:
// - Windows: ipconfig (look for IPv4 Address)
// - Mac/Linux: ifconfig or ip addr

// Production API Configuration
// For production, use the live API URL
const getApiUrl = () => {
  // For Expo Go (development and production), use the production API URL
  // since tunnel/Expo Go needs a publicly accessible URL
  // Update this URL to match your actual backend domain
  
  // Option 1: Use your server hostname (current server)
  const PRODUCTION_API_URL = 'http://srv1237846.hstgr.cloud:3000/api';
  
  // Option 2: If you have a custom domain, use it instead:
  // const PRODUCTION_API_URL = 'https://volunteerconnect.io/api';
  // const PRODUCTION_API_URL = 'https://yourdomain.com/api';
  
  // For Expo Go tunnel, always use a publicly accessible URL
  // Change 'true' to 'false' if you want to use local URLs for emulator/simulator
  if (__DEV__ === false || true) { // Force production URL for Expo Go
    return PRODUCTION_API_URL;
  }
  
  // Development mode - use local network (only works if on same network)
  const USE_PHYSICAL_DEVICE = true; // Change to false for emulator/simulator
  
  if (USE_PHYSICAL_DEVICE) {
    // For physical device - use your computer's IP address
    // Make sure your phone and computer are on the same WiFi network
    // NOTE: This won't work with Expo Go tunnel - use production URL instead
    return 'http://192.168.1.9:3000/api';
  }
  
  if (Platform.OS === 'android') {
    // For Android emulator
    return 'http://10.0.2.2:3000/api';
  }
  // For iOS simulator
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Log API URL for debugging
console.log('API Base URL:', API_BASE_URL);

// Convert relative image path from API (e.g. /uploads/profiles/xxx.jpeg) to full URL so Image can load it
export const getFullImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return origin + (path.startsWith('/') ? path : '/' + path);
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token from storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Skip 401 handling for authentication endpoints (login, register, forgot-password)
    // These endpoints should handle 401 errors themselves
    const authEndpoints = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint = authEndpoints.some(endpoint => requestUrl.includes(endpoint));
    
    // Only handle 401 for non-auth endpoints (where token might be expired)
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Handle unauthorized access
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        console.log('🔒 Token expired or invalid - cleared storage');
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

