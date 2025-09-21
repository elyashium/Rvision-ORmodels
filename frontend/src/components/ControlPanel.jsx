import React, { useState, useEffect } from 'react';
import { Upload, Play, Square, AlertTriangle, Settings, RefreshCw, Zap } from 'lucide-react';
import DisruptionModal from './DisruptionModal';
import TrackFailureModal from './TrackFailureModal';
import SimulationControls from './SimulationControls';
import { apiService, handleApiError } from '../services/apiService';

const ControlPanel = ({ 
  networkState, 
  isSimulationRunning, 
  onScheduleUploaded, 
  onSimulationStart, 
  onSimulationStop, 
  onDisruptionReported,
  // Live simulation props
  simulationTrains = [],
  simulationTime = null,
  simulationSpeed = 1000,
  setSimulationSpeed = () => {},
  onResetSimulation = () => {},
  // Live rerouting props
  reportTrackFailure = null,
  isPaused = false,
  pauseReason = null
}) => {
  const [isDisruptionModalOpen, setIsDisruptionModalOpen] = useState(false);
  const [isTrackFailureModalOpen, setIsTrackFailureModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [availableTracks, setAvailableTracks] = useState([]);

  // Load available tracks when component mounts
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const response = await fetch('/api/tracks');
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success') {
            setAvailableTracks(data.tracks || []);
          }
        }
      } catch (error) {
        console.error('Failed to load tracks:', error);
      }
    };

    loadTracks();
  }, []);

  const handleScheduleUpload = async () => {
    setIsLoading(true);
    setUploadStatus('Loading schedule and network data...');
    
    try {
      // Try live simulation first
      await onScheduleUploaded();
      setUploadStatus('Live schedule loaded successfully!');
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (liveError) {
      console.warn('Live simulation failed, falling back to legacy mode:', liveError);
      
      try {
        // Fallback to legacy simulation
        const response = await apiService.resetSimulation();
        
        if (response.data.status === 'success') {
          setUploadStatus('Legacy schedule loaded successfully!');
          onScheduleUploaded(response.data.network_state);
          setTimeout(() => setUploadStatus(''), 3000);
        }
      } catch (legacyError) {
        const errorInfo = handleApiError(legacyError);
        setUploadStatus(`Error: ${errorInfo.message}`);
        setTimeout(() => setUploadStatus(''), 5000);
      }
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
          response.data.optimization_result,
          response.data.simulations
        );
        setIsDisruptionModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to report disruption:', error);
      throw error; // Re-throw so the modal can display the error
    }
  };

  const handleTrackFailureSubmit = async (trackId, description) => {
    if (reportTrackFailure) {
      // Use the live rerouting function from useTrainSimulation
      return await reportTrackFailure(trackId, description);
    } else {
      throw new Error('Track failure reporting not available');
    }
  };

  const getTrainOptions = () => {
    // Handle both networkState trains and simulationTrains
    let trains = [];
    
    if (simulationTrains && simulationTrains.length > 0) {
      // Use live simulation trains
      trains = simulationTrains.map(train => {
        const originStation = train.route?.[0]?.Station_Name || train.route?.[0]?.Station_ID || 'Unknown';
        const destStation = train.route?.[train.route?.length - 1]?.Station_Name || train.route?.[train.route?.length - 1]?.Station_ID || 'Unknown';
        
        return {
          value: train.Train_ID || train.train_id,
          label: `${train.Train_ID || train.train_id} (${train.Train_Type || train.type || 'Unknown'})`,
          section: `${originStation} → ${destStation}`,
        };
      });
    } else if (networkState?.trains) {
      // Use legacy networkState trains
      trains = Object.values(networkState.trains).map(train => ({
        value: train.train_id,
        label: `${train.train_id} (${train.train_type})`,
        section: `${train.section_start} → ${train.section_end}`,
      }));
    }
    
    return trains;
  };

  const getStationOptions = () => {
    const stations = new Set();
    
    // Handle both simulation trains and network state trains
    if (simulationTrains && simulationTrains.length > 0) {
      simulationTrains.forEach(train => {
        if (train.route) {
          train.route.forEach(stop => {
            const stationName = stop.Station_Name || stop.Station_ID || stop.station;
            if (stationName) {
              stations.add(stationName);
            }
          });
        }
      });
    } else if (networkState?.trains) {
      Object.values(networkState.trains).forEach(train => {
        if (train.section_start) stations.add(train.section_start);
        if (train.section_end) stations.add(train.section_end);
      });
    }
    
    // Add some default stations if none found
    if (stations.size === 0) {
      ['New Delhi', 'Anand Vihar', 'Ghaziabad', 'Aligarh', 'Kanpur'].forEach(station => {
        stations.add(station);
      });
    }
    
    return Array.from(stations).sort().map(station => ({
      value: station,
      label: station.replace(/_/g, ' '),
    }));
  };

  return (
    <div className="rail-card p-4 h-full flex flex-col">
      <div className="flex items-center space-x-2 mb-4 flex-shrink-0">
        <Settings className="w-4 h-4 text-rail-text" />
        <h2 className="text-sm font-semibold text-rail-text">Control Panel</h2>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4" style={{ maxHeight: 'calc(100vh - 180px)' }}>
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

        {/* Live Simulation Controls - Show if we have simulation data */}
        {simulationTrains.length > 0 && (
          <SimulationControls
            simulationSpeed={simulationSpeed}
            setSimulationSpeed={setSimulationSpeed}
            isRunning={isSimulationRunning}
            onStart={onSimulationStart}
            onStop={onSimulationStop}
            onReset={onResetSimulation}
            simulationTime={simulationTime}
            trainsCount={simulationTrains.length}
          />
        )}

        {/* Pause Status Display */}
        {isPaused && (
          <div className="space-y-2">
            <div className="bg-rail-warning/20 border border-rail-warning/30 rounded-md p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-rail-warning rounded-full animate-pulse"></div>
                <h4 className="text-sm font-medium text-rail-warning">Simulation Paused</h4>
              </div>
              <p className="text-xs text-rail-text-secondary mt-1">
                {pauseReason || 'Simulation is currently paused'}
              </p>
            </div>
          </div>
        )}

        {/* Live Track Failure Reporting - Show if we have live rerouting capability */}
        {simulationTrains.length > 0 && reportTrackFailure && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-rail-text-secondary uppercase tracking-wide">
              Live Track Management
            </h3>
            
            <button
              onClick={() => setIsTrackFailureModalOpen(true)}
              className="rail-button-danger w-full flex items-center justify-center space-x-2 hover:bg-rail-danger/90"
              disabled={isLoading}
            >
              <Zap className="w-4 h-4" />
              <span>Report Track Failure</span>
            </button>
            
            <div className="text-xs text-rail-text-secondary bg-rail-light-blue/10 border border-rail-light-blue/30 rounded-md p-2">
              <strong>Live Rerouting:</strong> Track failures will pause the simulation, 
              automatically reroute affected trains, and resume with updated paths.
            </div>
          </div>
        )}

        {/* Legacy Simulation Controls */}
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

      {/* Track Failure Modal */}
      <TrackFailureModal
        isOpen={isTrackFailureModalOpen}
        onClose={() => setIsTrackFailureModalOpen(false)}
        onSubmit={handleTrackFailureSubmit}
        availableTracks={availableTracks}
      />
    </div>
  );
};

export default ControlPanel;
