import React, { useState } from 'react';
import { Upload, Play, Square, AlertTriangle, Settings, RefreshCw } from 'lucide-react';
import DisruptionModal from './DisruptionModal';
import { apiService, handleApiError } from '../services/apiService';

const ControlPanel = ({ 
  networkState, 
  isSimulationRunning, 
  onScheduleUploaded, 
  onSimulationStart, 
  onSimulationStop, 
  onDisruptionReported 
}) => {
  const [isDisruptionModalOpen, setIsDisruptionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleScheduleUpload = async () => {
    setIsLoading(true);
    setUploadStatus('Initializing railway network...');
    
    try {
      // For the hackathon, we simulate schedule upload by resetting the system
      const response = await apiService.resetSimulation();
      
      if (response.data.status === 'success') {
        setUploadStatus('Schedule loaded successfully!');
        onScheduleUploaded(response.data.network_state);
        
        setTimeout(() => setUploadStatus(''), 3000);
      }
    } catch (error) {
      const errorInfo = handleApiError(error);
      setUploadStatus(`Error: ${errorInfo.message}`);
      setTimeout(() => setUploadStatus(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulationToggle = () => {
    if (isSimulationRunning) {
      onSimulationStop();
    } else {
      onSimulationStart();
    }
  };

  const handleDisruptionSubmit = async (disruptionData) => {
    try {
      const response = await apiService.reportEvent(disruptionData);
      
      if (response.data.status === 'success') {
        onDisruptionReported(
          response.data.event_processed, 
          response.data.optimization_result
        );
        setIsDisruptionModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to report disruption:', error);
      // The modal will handle displaying the error
    }
  };

  const getTrainOptions = () => {
    if (!networkState?.trains) return [];
    
    return Object.values(networkState.trains).map(train => ({
      value: train.train_id,
      label: `${train.train_id} (${train.train_type})`,
      section: `${train.section_start} → ${train.section_end}`,
    }));
  };

  const getStationOptions = () => {
    if (!networkState?.trains) return [];
    
    const stations = new Set();
    Object.values(networkState.trains).forEach(train => {
      stations.add(train.section_start);
      stations.add(train.section_end);
    });
    
    return Array.from(stations).map(station => ({
      value: station,
      label: station.replace(/_/g, ' '),
    }));
  };

  return (
    <div className="rail-card p-4 h-full flex flex-col">
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="w-4 h-4 text-rail-text" />
        <h2 className="text-sm font-semibold text-rail-text">Control Panel</h2>
      </div>

      <div className="space-y-4 flex-1">
        {/* Schedule Upload Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-rail-text-secondary uppercase tracking-wide">
            System Initialization
          </h3>
          
          <button
            onClick={handleScheduleUpload}
            disabled={isLoading}
            className="rail-button-primary w-full flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Loading...' : 'Load Schedule'}</span>
          </button>
          
          {uploadStatus && (
            <div className={`text-xs p-2 rounded ${
              uploadStatus.includes('Error') 
                ? 'bg-rail-danger/20 text-rail-danger border border-rail-danger/30' 
                : 'bg-rail-success/20 text-rail-success border border-rail-success/30'
            }`}>
              {uploadStatus}
            </div>
          )}
        </div>

        {/* Simulation Controls */}
        {networkState && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-rail-text-secondary uppercase tracking-wide">
              Simulation Control
            </h3>
            
            <button
              onClick={handleSimulationToggle}
              className={`w-full flex items-center justify-center space-x-2 ${
                isSimulationRunning 
                  ? 'rail-button-danger' 
                  : 'rail-button-primary'
              }`}
            >
              {isSimulationRunning ? (
                <Square className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>
                {isSimulationRunning ? 'Stop Simulation' : 'Start Simulation'}
              </span>
            </button>
          </div>
        )}

        {/* Disruption Reporting */}
        {networkState && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-rail-text-secondary uppercase tracking-wide">
              Event Reporting
            </h3>
            
            <button
              onClick={() => setIsDisruptionModalOpen(true)}
              className="rail-button-secondary w-full flex items-center justify-center space-x-2 hover:bg-rail-warning/10 hover:border-rail-warning/50 hover:text-rail-warning"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report Disruption</span>
            </button>
          </div>
        )}

        {/* System Status */}
        {networkState && (
          <div className="space-y-3 mt-auto">
            <h3 className="text-xs font-medium text-rail-text-secondary uppercase tracking-wide">
              System Status
            </h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-rail-text-secondary">Active Trains:</span>
                <span className="text-rail-text font-medium">
                  {networkState?.trains ? Object.keys(networkState.trains).length : 0}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-rail-text-secondary">Network Health:</span>
                <span className={`font-medium capitalize ${
                  networkState?.network_status?.network_health === 'healthy' 
                    ? 'text-rail-success' 
                    : 'text-rail-warning'
                }`}>
                  {networkState?.network_status?.network_health || 'Unknown'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-rail-text-secondary">Operational Tracks:</span>
                <span className="text-rail-text font-medium">
                  {networkState?.network_status?.operational_tracks || 0} / {networkState?.network_status?.total_tracks || 0}
                </span>
              </div>
              
              {(networkState?.network_status?.failed_tracks || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-rail-text-secondary">Failed Tracks:</span>
                  <span className="text-rail-danger font-medium">
                    {networkState.network_status.failed_tracks}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Disruption Modal */}
      <DisruptionModal
        isOpen={isDisruptionModalOpen}
        onClose={() => setIsDisruptionModalOpen(false)}
        onSubmit={handleDisruptionSubmit}
        trainOptions={getTrainOptions()}
        stationOptions={getStationOptions()}
      />
    </div>
  );
};

export default ControlPanel;
