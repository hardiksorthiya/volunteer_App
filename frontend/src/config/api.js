import axios from 'axios';

// API URL - Auto-detect based on current domain or use environment variable
const getApiUrl = () => {
  // If environment variable is set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Auto-detect based on current window location
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // For localhost development only - use direct backend connection
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    
    // For all other cases (production domain, IP addresses, etc.)
    // Always use relative path - Apache .htaccess will proxy /api requests to backend
    // This ensures all API calls go through the main domain: https://www.volunteerconnect.cloud/api/*
    return '/api';
  }
  
  // Fallback: use relative path (works when backend is proxied)
  return '/api';
};

const API_BASE_URL = getApiUrl();

// Log API URL for debugging
console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Debug logging (remove in production)
      if (config.url && config.url.includes('/chat')) {
        console.log('Chat API request - Token present:', token ? 'Yes' : 'No', 'URL:', config.url);
      }
    } else {
      console.warn('API request made without token:', config.url);
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
  (error) => {
    // Only redirect on 401 (unauthorized), not 403 (forbidden)
    // 403 errors should be handled by individual components
    if (error.response?.status === 401) {
      // Debug logging (remove in production)
      console.error('401 Unauthorized error:', {
        url: error.config?.url,
        message: error.response?.data?.message,
        pathname: window.location.pathname
      });
      
      // Handle unauthorized access
      // Don't redirect here - let components handle it
      // Just clean up the auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

