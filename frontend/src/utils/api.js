import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints for Railway System
export const endpoints = {
  health: '/',
  state: '/api/state',
  trains: '/api/trains',
  networkStatus: '/api/network-status',
  reportEvent: '/api/report-event',
  trackFailure: '/api/track-failure',
  trackRepair: '/api/track-repair',
  acceptRecommendation: '/api/accept-recommendation',
  reset: '/api/reset',
  systemInfo: '/api/system-info',
  websocket: `${WS_BASE_URL}/ws`
};

// API methods
export const railwayAPI = {
  getState: () => api.get(endpoints.state),
  getTrains: () => api.get(endpoints.trains),
  getNetworkStatus: () => api.get(endpoints.networkStatus),
  reportEvent: (data) => api.post(endpoints.reportEvent, data),
  reportTrackFailure: (data) => api.post(endpoints.trackFailure, data),
  reportTrackRepair: (data) => api.post(endpoints.trackRepair, data),
  acceptRecommendation: (data) => api.post(endpoints.acceptRecommendation, data),
  resetSimulation: () => api.post(endpoints.reset),
  getSystemInfo: () => api.get(endpoints.systemInfo),
  checkHealth: () => api.get(endpoints.health)
};

export default api;
