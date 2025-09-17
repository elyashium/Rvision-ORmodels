import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Train, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Activity,
  RefreshCw,
  XCircle,
  Shield
} from 'lucide-react';
import { railwayAPI } from '../utils/api';

const TrainDashboard = () => {
  const [trains, setTrains] = useState([]);
  const [networkState, setNetworkState] = useState(null);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Priority colors
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 1: return 'text-red-500 bg-red-50 border-red-200';
      case 2: return 'text-orange-500 bg-orange-50 border-orange-200';
      case 3: return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 4: return 'text-blue-500 bg-blue-50 border-blue-200';
      case 5: return 'text-gray-500 bg-gray-50 border-gray-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityName = (priority) => {
    switch(priority) {
      case 1: return 'Express';
      case 2: return 'Priority';
      case 3: return 'Regular';
      case 4: return 'Local';
      case 5: return 'Goods';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status) => {
    if (status?.includes('delay') || status?.includes('Delay')) {
      return <AlertCircle className="w-5 h-5 text-orange-500" />;
    } else if (status?.includes('halt') || status?.includes('Halt')) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else if (status === 'on_time' || status === 'On Time') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <Activity className="w-5 h-5 text-blue-500" />;
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch state first
      const stateResponse = await railwayAPI.getState();
      if (stateResponse.data?.data) {
        setNetworkState(stateResponse.data.data);
        // Convert trains object to array if needed
        const trainsData = stateResponse.data.data.trains;
        if (trainsData) {
          const trainsArray = Array.isArray(trainsData) 
            ? trainsData 
            : Object.values(trainsData);
          setTrains(trainsArray);
        } else {
          setTrains([]);
        }
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to connect to railway system. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const handleReset = async () => {
    try {
      await railwayAPI.resetSimulation();
      fetchData();
    } catch (err) {
      setError('Failed to reset simulation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading Railway Network...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Train className="w-8 h-8 text-blue-600" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Railway Network Optimizer
                </h1>
                <p className="text-sm text-gray-500">
                  AI-Powered Decision Support System
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Last Updated: {lastUpdate.toLocaleTimeString()}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                className="p-2 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReset}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset Simulation
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto px-4 mt-4"
        >
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Network Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Network Status</h2>
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Trains</span>
                  <span className="font-semibold text-gray-900">{trains.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">System Time</span>
                  <span className="font-semibold text-gray-900">
                    {networkState?.current_time || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Delays</span>
                  <span className="font-semibold text-orange-600">
                    {Array.isArray(trains) ? trains.filter(t => t && t.delay_minutes > 0).length : 0}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">System Status</span>
                    <span className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Operational
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Trains List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Active Trains</h2>
              </div>
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                <AnimatePresence>
                  {Array.isArray(trains) && trains.map((train, index) => (
                    <motion.div
                      key={train.train_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ backgroundColor: '#f9fafb' }}
                      onClick={() => setSelectedTrain(train)}
                      className="p-4 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-lg border ${getPriorityColor(train.priority)}`}>
                            <Train className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900">
                                {train.train_id}
                              </span>
                              <span className="text-sm text-gray-500">
                                {train.train_name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500">
                                {getPriorityName(train.priority)}
                              </span>
                              {train.current_station && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {train.current_station}
                                </div>
                              )}
                              {train.next_station && (
                                <div className="flex items-center text-xs text-gray-500">
                                  → {train.next_station}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {train.delay_minutes > 0 && (
                            <div className="flex items-center text-orange-500">
                              <Clock className="w-4 h-4 mr-1" />
                              <span className="text-sm font-medium">
                                +{train.delay_minutes}m
                              </span>
                            </div>
                          )}
                          {getStatusIcon(train.status)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Selected Train Details */}
        <AnimatePresence>
          {selectedTrain && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6"
            >
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Train Details: {selectedTrain.train_id}
                  </h3>
                  <button
                    onClick={() => setSelectedTrain(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Train Name</span>
                      <span className="font-medium">{selectedTrain.train_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Priority Level</span>
                      <span className="font-medium">
                        {getPriorityName(selectedTrain.priority)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className="font-medium">{selectedTrain.status}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current Delay</span>
                      <span className="font-medium text-orange-600">
                        {selectedTrain.delay_minutes} minutes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current Location</span>
                      <span className="font-medium">
                        {selectedTrain.current_station || 'En Route'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Next Station</span>
                      <span className="font-medium">
                        {selectedTrain.next_station || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedTrain.route && selectedTrain.route.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Route</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrain.route.map((station, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                        >
                          {station.station_code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TrainDashboard;
