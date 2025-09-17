import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

const useGraphStore = create((set, get) => ({
  // State
  originalGraph: null,
  optimizedGraphs: {
    delay: null,
    failure: null,
    priority: null
  },
  currentJob: null,
  jobs: [],
  showOptimizationModal: false,
  showComparison: false,
  selectedGraphs: [],
  isLoading: false,
  wsConnection: null,

  // Actions
  loadOriginalGraph: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/api/graph/original');
      set({ originalGraph: response.data.data });
      toast.success('Original graph loaded successfully');
    } catch (error) {
      toast.error('Failed to load original graph');
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  triggerOptimization: async (disruption) => {
    try {
      const response = await api.post('/api/optimise', { disruption });
      const jobId = response.data.job_id;
      
      set({ 
        currentJob: { 
          id: jobId, 
          status: 'pending',
          progress: 0
        }
      });

      // Connect WebSocket for progress updates
      get().connectWebSocket(jobId);
      
      toast.success('Optimization job started');
      return jobId;
    } catch (error) {
      toast.error('Failed to start optimization');
      console.error(error);
      return null;
    }
  },

  connectWebSocket: (jobId) => {
    const ws = new WebSocket(`ws://localhost:8000/api/optimise/stream/${jobId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'status' || data.type === 'progress') {
        set(state => ({
          currentJob: {
            ...state.currentJob,
            status: data.status,
            progress: data.progress,
            message: data.message
          }
        }));
      } else if (data.type === 'completed') {
        // Fetch the optimized graphs
        get().fetchOptimizedGraphs(data.result_files);
        set(state => ({
          currentJob: {
            ...state.currentJob,
            status: 'completed',
            progress: 100
          }
        }));
        toast.success('Optimization completed!');
        
        // Close WebSocket
        ws.close();
      } else if (data.type === 'error') {
        toast.error(data.message);
        set({ currentJob: null });
        ws.close();
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Connection error');
    };

    set({ wsConnection: ws });
  },

  fetchOptimizedGraphs: async (resultFiles) => {
    try {
      const graphs = {};
      
      for (const [type, filename] of Object.entries(resultFiles)) {
        const response = await api.get(`/api/graph/${filename}`);
        graphs[type] = {
          ...response.data.data,
          filename
        };
      }
      
      set({ optimizedGraphs: graphs });
    } catch (error) {
      toast.error('Failed to fetch optimized graphs');
      console.error(error);
    }
  },

  checkJobStatus: async (jobId) => {
    try {
      const response = await api.get(`/api/optimise/status/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to check job status:', error);
      return null;
    }
  },

  loadJobs: async () => {
    try {
      const response = await api.get('/api/jobs');
      set({ jobs: response.data.jobs });
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  },

  toggleOptimizationModal: () => {
    set(state => ({ showOptimizationModal: !state.showOptimizationModal }));
  },

  toggleComparison: () => {
    set(state => ({ showComparison: !state.showComparison }));
  },

  selectGraphForComparison: (graphType) => {
    set(state => {
      const selected = [...state.selectedGraphs];
      const index = selected.indexOf(graphType);
      
      if (index > -1) {
        selected.splice(index, 1);
      } else if (selected.length < 2) {
        selected.push(graphType);
      }
      
      return { selectedGraphs: selected };
    });
  },

  clearJob: () => {
    set({ currentJob: null });
    const ws = get().wsConnection;
    if (ws) {
      ws.close();
      set({ wsConnection: null });
    }
  }
}));

export default useGraphStore;
