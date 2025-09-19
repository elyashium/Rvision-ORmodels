import React, { useState, useEffect } from 'react';
import { Train, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import ControlPanel from './components/ControlPanel';
import NetworkGraph from './components/NetworkGraph';
import AlertsAndRecommendations from './components/AlertsAndRecommendations';
import { apiService } from './services/apiService';
import './App.css';

function App() {
  const [networkState, setNetworkState] = useState(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [systemHealth, setSystemHealth] = useState('healthy');

  // Fetch initial system state
  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const response = await apiService.getSystemInfo();
        if (response.data.system_info.total_trains > 0) {
          const stateResponse = await apiService.getCurrentState();
          setNetworkState(stateResponse.data);
          setSystemHealth(stateResponse.data.network_status?.network_health || 'healthy');
        }
      } catch (error) {
        console.error('Failed to fetch system info:', error);
        addAlert('error', 'Failed to connect to R-Vision backend system');
      }
    };

    fetchSystemInfo();
  }, []);

  // Simulation polling
  useEffect(() => {
    let interval;
    if (isSimulationRunning && networkState) {
      interval = setInterval(async () => {
        try {
          const response = await apiService.getCurrentState();
          setNetworkState(response.data);
          setSystemHealth(response.data.network_status?.network_health || 'healthy');
        } catch (error) {
          console.error('Failed to fetch state during simulation:', error);
        }
      }, 3000); // Poll every 3 seconds during simulation
    }
    return () => clearInterval(interval);
  }, [isSimulationRunning, networkState]);

  const addAlert = (type, message, details = null) => {
    const newAlert = {
      id: Date.now(),
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    setAlerts(prev => [newAlert, ...prev.slice(0, 9)]); // Keep last 10 alerts
  };

  const addRecommendation = (recommendation) => {
    setRecommendations(prev => [recommendation, ...prev.slice(0, 4)]); // Keep last 5 recommendations
  };

  const handleScheduleUploaded = (newNetworkState) => {
    setNetworkState(newNetworkState);
    setSystemHealth(newNetworkState.network_status?.network_health || 'healthy');
    addAlert('success', 'Schedule loaded successfully', `${Object.keys(newNetworkState.trains || {}).length} trains initialized`);
  };

  const handleSimulationStart = () => {
    setIsSimulationRunning(true);
    addAlert('info', 'Simulation started', 'Real-time train monitoring active');
  };

  const handleSimulationStop = () => {
    setIsSimulationRunning(false);
    addAlert('info', 'Simulation stopped', 'Real-time monitoring paused');
  };

  const handleDisruptionReported = (eventData, optimizationResult) => {
    addAlert('warning', `Disruption reported: ${eventData.train_id}`, `${eventData.delay_minutes} minute delay`);
    
    if (optimizationResult && optimizationResult.recommendation) {
      addRecommendation({
        id: Date.now(),
        ...optimizationResult,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const getHealthStatusIcon = () => {
    switch (systemHealth) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-rail-success" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-rail-warning" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-rail-danger" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rail-darker to-rail-dark text-white">
      {/* Header */}
      <header className="rail-card m-4 mb-0 px-6 py-4 border-b-0 rounded-b-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Train className="w-8 h-8 text-rail-accent" />
              <div>
                <h1 className="text-2xl font-bold text-white">R-Vision</h1>
                <p className="text-sm text-gray-400">Intelligent Rail Optimization System</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* System Health Indicator */}
            <div className="flex items-center space-x-2">
              {getHealthStatusIcon()}
              <span className="text-sm font-medium capitalize">{systemHealth}</span>
            </div>
            
            {/* Simulation Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isSimulationRunning ? 'bg-rail-success animate-pulse' : 'bg-rail-gray'}`}></div>
              <span className="text-sm font-medium">
                {isSimulationRunning ? 'Live Simulation' : 'Simulation Paused'}
              </span>
            </div>
            
            {/* Active Trains Count */}
            {networkState && (
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-rail-accent" />
                <span className="text-sm font-medium">
                  {Object.keys(networkState.trains || {}).length} Trains Active
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-100px)] m-4 mt-0 space-x-4">
        {/* Left Sidebar - Control Panel */}
        <div className="w-80 flex flex-col">
          <ControlPanel
            networkState={networkState}
            isSimulationRunning={isSimulationRunning}
            onScheduleUploaded={handleScheduleUploaded}
            onSimulationStart={handleSimulationStart}
            onSimulationStop={handleSimulationStop}
            onDisruptionReported={handleDisruptionReported}
          />
        </div>

        {/* Main Content - Network Visualization */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 rail-card p-4">
            <div className="h-full">
              <NetworkGraph
                networkState={networkState}
                isSimulationRunning={isSimulationRunning}
              />
            </div>
          </div>

          {/* Bottom Panel - Alerts and Recommendations */}
          <div className="h-64 mt-4">
            <AlertsAndRecommendations
              alerts={alerts}
              recommendations={recommendations}
              onAcceptRecommendation={(recommendation) => {
                addAlert('success', 'Recommendation accepted', recommendation.recommendation?.recommendation_text);
              }}
              onRejectRecommendation={(recommendation) => {
                addAlert('info', 'Recommendation rejected', 'Manual override applied');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;