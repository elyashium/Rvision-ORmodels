import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Send, 
  X, 
  Train,
  AlertCircle,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { railwayAPI } from '../utils/api';

const EventReporter = ({ onClose, onEventReported }) => {
  const [eventType, setEventType] = useState('delay');
  const [formData, setFormData] = useState({
    train_id: '',
    delay_minutes: '',
    track_id: '',
    description: '',
    weather: 'Clear'
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const weatherOptions = ['Clear', 'Fog', 'Rain', 'Storm', 'Snow'];
  
  const trainIds = [
    '12001_SHATABDI',
    '12301_RAJDHANI',
    '18205_GOODS',
    '14015_PASSENGER',
    '22109_LOCAL',
    '19020_DEHRADUN'
  ];

  const trackIds = [
    'NDLS_ANVR_MAIN',
    'NDLS_ANVR_LOOP',
    'ANVR_SHD_MAIN',
    'SHD_GZB_MAIN',
    'GZB_CNB_MAIN'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      let result;
      
      if (eventType === 'delay') {
        result = await railwayAPI.reportEvent({
          train_id: formData.train_id,
          delay_minutes: parseInt(formData.delay_minutes),
          description: formData.description,
          weather: formData.weather,
          event_type: 'delay'
        });
      } else if (eventType === 'track_failure') {
        result = await railwayAPI.reportTrackFailure({
          track_id: formData.track_id,
          description: formData.description
        });
      } else if (eventType === 'track_repair') {
        result = await railwayAPI.reportTrackRepair({
          track_id: formData.track_id,
          description: formData.description
        });
      }

      setResponse(result.data);
      if (onEventReported) {
        onEventReported();
      }
    } catch (err) {
      console.error('Error reporting event:', err);
      setError(err.response?.data?.error || 'Failed to report event');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      train_id: '',
      delay_minutes: '',
      track_id: '',
      description: '',
      weather: 'Clear'
    });
    setResponse(null);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Report Event</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Event Type Selector */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex space-x-2">
            {[
              { id: 'delay', label: 'Train Delay', icon: Train },
              { id: 'track_failure', label: 'Track Failure', icon: AlertCircle },
              { id: 'track_repair', label: 'Track Repair', icon: Zap }
            ].map((type) => (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setEventType(type.id);
                  handleReset();
                }}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  eventType === type.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <type.icon className="w-4 h-4" />
                <span className="font-medium">{type.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Form */}
        {!response ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {eventType === 'delay' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Train ID
                  </label>
                  <select
                    required
                    value={formData.train_id}
                    onChange={(e) => setFormData({ ...formData, train_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a train</option>
                    {trainIds.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delay (minutes)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="300"
                    value={formData.delay_minutes}
                    onChange={(e) => setFormData({ ...formData, delay_minutes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter delay in minutes"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weather Conditions
                  </label>
                  <select
                    value={formData.weather}
                    onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {weatherOptions.map((weather) => (
                      <option key={weather} value={weather}>{weather}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {(eventType === 'track_failure' || eventType === 'track_repair') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Track ID
                </label>
                <select
                  required
                  value={formData.track_id}
                  onChange={(e) => setFormData({ ...formData, track_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a track</option>
                  {trackIds.map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Provide additional details about the event..."
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center"
              >
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </motion.div>
            )}

            <div className="flex space-x-3 pt-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReset}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Reporting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Report Event</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="font-semibold text-green-700">Event Reported Successfully</span>
              </div>
              <p className="text-sm text-green-600">
                The event has been processed and recommendations have been generated.
              </p>
            </div>

            {response.optimization_result && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">AI Recommendations</h3>
                
                {response.optimization_result.recommendations?.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-blue-900">
                            {rec.action?.action_type || 'Recommendation'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            Score: {rec.score?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm text-blue-800">
                          {rec.action?.description || rec.description}
                        </p>
                        {rec.action?.train_id && (
                          <p className="text-xs text-blue-600 mt-1">
                            Train: {rec.action.train_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {response.optimization_result.conflicts_detected && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                      <span className="font-medium text-orange-700">Conflicts Detected</span>
                    </div>
                    <p className="text-sm text-orange-600">
                      {response.optimization_result.conflicts_detected.length} potential conflicts found
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default EventReporter;
