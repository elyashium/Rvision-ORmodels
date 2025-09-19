import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('🚫 API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  healthCheck: () => api.get('/'),

  // Get current network state
  getCurrentState: () => api.get('/api/state'),

  // Get all trains information
  getAllTrains: () => api.get('/api/trains'),

  // Get network status and topology
  getNetworkStatus: () => api.get('/api/network-status'),

  // Get system configuration info
  getSystemInfo: () => api.get('/api/system-info'),

  // Report a train disruption event
  reportEvent: (eventData) => api.post('/api/report-event', eventData),

  // Report track failure
  reportTrackFailure: (trackData) => api.post('/api/track-failure', trackData),

  // Report track repair
  reportTrackRepair: (trackData) => api.post('/api/track-repair', trackData),

  // Accept a recommendation
  acceptRecommendation: (recommendationData) => api.post('/api/accept-recommendation', recommendationData),

  // Reset simulation to initial state
  resetSimulation: () => api.post('/api/reset'),

  // Upload schedule (simulated - the backend initializes from schedule.json)
  uploadSchedule: async (scheduleData) => {
    // For the hackathon, we'll simulate schedule upload by resetting the system
    // In a real system, this would upload the actual schedule file
    try {
      const response = await api.post('/api/reset');
      return response;
    } catch (error) {
      throw new Error('Failed to upload schedule: ' + error.message);
    }
  },

  // Simulate a "what-if" scenario (future enhancement)
  simulateScenario: (scenarioData) => {
    // This would be implemented for ghost path visualization
    return api.post('/api/simulate', scenarioData);
  },
};

// Utility function to handle API errors gracefully
export const handleApiError = (error, fallbackMessage = 'An unexpected error occurred') => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.error || fallbackMessage,
      status: error.response.status,
      details: error.response.data,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Unable to connect to R-Vision backend. Please ensure the server is running on port 5001.',
      status: 0,
      details: null,
    };
  } else {
    // Something else happened
    return {
      message: error.message || fallbackMessage,
      status: -1,
      details: null,
    };
  }
};

// Mock data for development when backend is not available
export const mockData = {
  networkState: {
    trains: {
      '12001_SHATABDI': {
        train_id: '12001_SHATABDI',
        train_name: 'Express 12001_SHATABDI',
        train_type: 'Express',
        priority: 1,
        status: 'On-Time',
        section_start: 'Anand_Vihar',
        section_end: 'Ghaziabad',
        current_delay_mins: 0,
        current_location: 'Anand_Vihar',
      },
      '15005_PASSENGER': {
        train_id: '15005_PASSENGER',
        train_name: 'Passenger 15005_PASSENGER',
        train_type: 'Passenger',
        priority: 3,
        status: 'On-Time',
        section_start: 'Ghaziabad',
        section_end: 'Aligarh',
        current_delay_mins: 0,
        current_location: 'Ghaziabad',
      },
    },
    network_status: {
      total_stations: 8,
      total_tracks: 12,
      operational_tracks: 12,
      failed_tracks: 0,
      network_health: 'healthy',
    },
    timestamp: new Date().toISOString(),
  },
};

export default apiService;
