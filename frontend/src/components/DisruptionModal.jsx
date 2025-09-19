import React, { useState } from 'react';
import { X, AlertTriangle, Train, Clock, MapPin } from 'lucide-react';

const DisruptionModal = ({ isOpen, onClose, onSubmit, trainOptions, stationOptions }) => {
  const [formData, setFormData] = useState({
    train_id: '',
    event_type: 'delay',
    delay_minutes: '',
    location: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const eventTypes = [
    { value: 'delay', label: 'Train Delay', icon: Clock },
    { value: 'track_failure', label: 'Track Blockage', icon: AlertTriangle },
    { value: 'signal_failure', label: 'Signal Failure', icon: AlertTriangle },
    { value: 'mechanical_issue', label: 'Mechanical Issue', icon: Train },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user makes changes
  };

  const validateForm = () => {
    if (!formData.train_id) {
      return 'Please select a train';
    }
    if (!formData.delay_minutes || formData.delay_minutes <= 0) {
      return 'Please enter a valid delay duration';
    }
    if (formData.delay_minutes > 480) { // 8 hours max
      return 'Delay cannot exceed 8 hours (480 minutes)';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const submissionData = {
        ...formData,
        delay_minutes: parseInt(formData.delay_minutes),
      };

      await onSubmit(submissionData);
      
      // Reset form on successful submission
      setFormData({
        train_id: '',
        event_type: 'delay',
        delay_minutes: '',
        location: '',
        description: '',
      });
    } catch (error) {
      setError('Failed to report disruption. Please try again.');
      console.error('Disruption submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedTrain = trainOptions.find(train => train.value === formData.train_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative rail-card max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-rail-blue/20">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-rail-warning" />
            <h2 className="text-xl font-semibold">Report Disruption</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Train Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Train className="w-4 h-4 inline mr-2" />
              Affected Train
            </label>
            <select
              value={formData.train_id}
              onChange={(e) => handleInputChange('train_id', e.target.value)}
              className="rail-select w-full"
              disabled={isSubmitting}
            >
              <option value="">Select a train...</option>
              {trainOptions.map(train => (
                <option key={train.value} value={train.value}>
                  {train.label}
                </option>
              ))}
            </select>
            {selectedTrain && (
              <p className="text-xs text-gray-400 mt-1">
                Route: {selectedTrain.section}
              </p>
            )}
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Event Type
            </label>
            <select
              value={formData.event_type}
              onChange={(e) => handleInputChange('event_type', e.target.value)}
              className="rail-select w-full"
              disabled={isSubmitting}
            >
              {eventTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Delay Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              Delay Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="480"
              value={formData.delay_minutes}
              onChange={(e) => handleInputChange('delay_minutes', e.target.value)}
              className="rail-input w-full"
              placeholder="Enter delay in minutes"
              disabled={isSubmitting}
            />
          </div>

          {/* Location (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Location (Optional)
            </label>
            <select
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="rail-select w-full"
              disabled={isSubmitting}
            >
              <option value="">Select location...</option>
              {stationOptions.map(station => (
                <option key={station.value} value={station.value}>
                  {station.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Details (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="rail-input w-full h-20 resize-none"
              placeholder="Describe the nature of the disruption..."
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rail-danger/20 border border-rail-danger/30 rounded-lg p-3">
              <p className="text-rail-danger text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rail-button-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rail-button-primary flex-1 bg-rail-warning hover:bg-yellow-600"
            >
              {isSubmitting ? 'Reporting...' : 'Report Disruption'}
            </button>
          </div>
        </form>

        {/* Info Footer */}
        <div className="px-6 pb-6">
          <div className="bg-rail-blue/10 border border-rail-blue/20 rounded-lg p-3">
            <p className="text-xs text-gray-400">
              <strong className="text-rail-accent">Note:</strong> Reporting a disruption will trigger 
              R-Vision's optimization engine to analyze the impact and provide recommendations 
              for minimizing delays across the network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisruptionModal;
