import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Zap, CheckCircle, XCircle } from 'lucide-react';

const TrackFailureModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  availableTracks = []
}) => {
  const [selectedTrack, setSelectedTrack] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTrack('');
      setDescription('');
      setSubmitResult(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTrack) {
      alert('Please select a track to report failure');
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const result = await onSubmit(selectedTrack, description || 'Track failure reported from UI');
      setSubmitResult(result);
      
      if (result.success) {
        // Auto-close after successful submission and rerouting
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (error) {
      console.error('Track failure submission error:', error);
      setSubmitResult({ 
        success: false, 
        error: error.message || 'Failed to report track failure' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rail-gray">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rail-danger" />
            <h2 className="text-lg font-semibold text-rail-text">Report Track Failure</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-rail-gray rounded transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-rail-text" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!submitResult ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Track Selection */}
              <div>
                <label className="block text-sm font-medium text-rail-text mb-2">
                  Select Track <span className="text-rail-danger">*</span>
                </label>
                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value)}
                  className="w-full p-2 border border-rail-gray rounded-md focus:ring-2 focus:ring-rail-accent focus:border-transparent"
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Choose a track...</option>
                  {availableTracks
                    .filter(track => track.can_disable)
                    .map(track => (
                      <option key={track.track_id} value={track.track_id}>
                        {track.track_id} ({track.from_station} → {track.to_station})
                        {track.track_type && ` - ${track.track_type}`}
                      </option>
                    ))
                  }
                </select>
                {availableTracks.length === 0 && (
                  <p className="text-sm text-rail-text-secondary mt-1">
                    Loading available tracks...
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-rail-text mb-2">
                  Failure Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Signal failure, track obstruction, maintenance required, etc."
                  className="w-full p-2 border border-rail-gray rounded-md focus:ring-2 focus:ring-rail-accent focus:border-transparent"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              {/* Live Rerouting Info */}
              <div className="bg-rail-light-blue/10 border border-rail-light-blue/30 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <Zap className="w-4 h-4 text-rail-light-blue flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-rail-light-blue">Live Rerouting Enabled</h4>
                    <p className="text-xs text-rail-text-secondary mt-1">
                      The simulation will pause, affected trains will be automatically rerouted, 
                      and the simulation will resume with updated paths.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rail-button-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rail-button-danger flex items-center space-x-2"
                  disabled={isSubmitting || !selectedTrack}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>Report Failure</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Results Display */
            <div className="space-y-4">
              {/* Result Header */}
              <div className={`flex items-center space-x-2 p-3 rounded-md ${
                submitResult.success 
                  ? 'bg-rail-success/10 border border-rail-success/30' 
                  : 'bg-rail-danger/10 border border-rail-danger/30'
              }`}>
                {submitResult.success ? (
                  <CheckCircle className="w-5 h-5 text-rail-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-rail-danger" />
                )}
                <div>
                  <h3 className={`font-medium ${
                    submitResult.success ? 'text-rail-success' : 'text-rail-danger'
                  }`}>
                    {submitResult.success ? 'Track Failure Processed' : 'Failed to Process'}
                  </h3>
                  <p className="text-sm text-rail-text-secondary">
                    {submitResult.success 
                      ? 'Live rerouting completed successfully'
                      : submitResult.error || 'Unknown error occurred'
                    }
                  </p>
                </div>
              </div>

              {/* Rerouting Summary */}
              {submitResult.success && submitResult.rerouting_summary && (
                <div className="space-y-3">
                  <h4 className="font-medium text-rail-text">Rerouting Summary</h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-rail-gray/20 rounded">
                      <div className="text-lg font-bold text-rail-text">
                        {submitResult.affected_trains?.length || 0}
                      </div>
                      <div className="text-rail-text-secondary">Affected Trains</div>
                    </div>
                    
                    <div className="text-center p-2 bg-rail-success/20 rounded">
                      <div className="text-lg font-bold text-rail-success">
                        {submitResult.rerouting_summary.successfully_rerouted || 0}
                      </div>
                      <div className="text-rail-text-secondary">Rerouted</div>
                    </div>
                  </div>

                  {submitResult.affected_trains && submitResult.affected_trains.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-rail-text mb-2">Affected Trains:</h5>
                      <div className="flex flex-wrap gap-1">
                        {submitResult.affected_trains.map(trainId => (
                          <span 
                            key={trainId}
                            className="px-2 py-1 bg-rail-accent/20 text-rail-accent text-xs rounded"
                          >
                            {trainId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="rail-button-primary"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackFailureModal;

