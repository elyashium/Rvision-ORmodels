import React, { useState, useEffect } from 'react';
import { Train, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import ControlPanel from './components/ControlPanel';
import NetworkGraph from './components/NetworkGraph';
import AlertsAndRecommendations from './components/AlertsAndRecommendations';
import MultiStrategySimulation from './components/MultiStrategySimulation';
import SimulationClock from './components/SimulationClock';
import { apiService } from './services/apiService';
import { useTrainSimulation } from './hooks/useTrainSimulation';
import './App.css';

function App() {
  const [networkState, setNetworkState] = useState(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [multiStrategySimulations, setMultiStrategySimulations] = useState(null);
  const [isImplementingStrategy, setIsImplementingStrategy] = useState(false);
  const [systemHealth, setSystemHealth] = useState('healthy');
  const [isNetworkFullscreen, setIsNetworkFullscreen] = useState(false);

  // Live simulation state
  const {
    networkData,
    trains: simulationTrains,
    simulationTime,
    simulationSpeed,
    isRunning: isLiveSimulationRunning,
    loadSchedule,
    startSimulation: startLiveSimulation,
    stopSimulation: stopLiveSimulation,
    resetSimulation,
    setSimulationSpeed
  } = useTrainSimulation();

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

  const handleScheduleUploaded = async (newNetworkState) => {
    // If newNetworkState is provided, use legacy mode
    if (newNetworkState) {
      setNetworkState(newNetworkState);
      setSystemHealth(newNetworkState.network_status?.network_health || 'healthy');
      addAlert('success', 'Schedule loaded successfully', `${Object.keys(newNetworkState.trains || {}).length} trains initialized`);
      return;
    }

    // Otherwise, use live simulation
    try {
      const simulationData = await loadSchedule();
      setSystemHealth('healthy');
      addAlert('success', 'Live schedule loaded successfully', `${simulationData.trains.length} trains initialized for simulation`);
    } catch (error) {
      console.error('Failed to load live schedule:', error);
      addAlert('error', 'Failed to load schedule', error.message);
    }
  };

  const handleSimulationStart = () => {
    if (simulationTrains.length > 0) {
      // Use live simulation
      startLiveSimulation();
      setIsSimulationRunning(true);
      addAlert('info', 'Live simulation started', 'Trains are now moving according to their schedules');
    } else {
      // Use legacy simulation
      setIsSimulationRunning(true);
      addAlert('info', 'Simulation started', 'Real-time train monitoring active');
    }
  };

  const handleSimulationStop = () => {
    if (isLiveSimulationRunning) {
      stopLiveSimulation();
    }
    setIsSimulationRunning(false);
    addAlert('info', 'Simulation stopped', 'Real-time monitoring paused');
  };

  const handleDisruptionReported = (eventData, optimizationResult, simulations) => {
    console.log('App: handleDisruptionReported called with:', { eventData, optimizationResult, simulations });
    
    addAlert('warning', `Disruption reported: ${eventData.train_id}`, `${eventData.delay_minutes} minute delay`);
    
    // Handle multi-strategy simulations
    if (simulations && Object.keys(simulations).length > 0) {
      console.log('App: Setting multi-strategy simulations:', simulations);
      setMultiStrategySimulations(simulations);
      addAlert('info', 'Multi-strategy analysis completed', `${Object.keys(simulations).length} optimization strategies evaluated`);
    } 
    // Fallback to legacy single recommendation
    else if (optimizationResult && optimizationResult.recommendation) {
      console.log('App: Using legacy single recommendation:', optimizationResult);
      addRecommendation({
        id: Date.now(),
        ...optimizationResult,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn('App: No simulations or optimization result received');
    }
  };

  const handleImplementStrategy = async (strategyData) => {
    setIsImplementingStrategy(true);
    
    try {
      // Call the accept-recommendation API endpoint
      const response = await apiService.acceptRecommendation(strategyData.recommendation);
      
      if (response.data.status === 'success') {
        addAlert('success', `${strategyData.strategyName} strategy implemented`, 
          strategyData.recommendation.recommendation_text);
        
        // Clear the multi-strategy simulations after implementation
        setMultiStrategySimulations(null);
        
        // Refresh network state
        const stateResponse = await apiService.getCurrentState();
        setNetworkState(stateResponse.data);
      }
    } catch (error) {
      console.error('Failed to implement strategy:', error);
      addAlert('error', 'Failed to implement strategy', error.message);
    } finally {
      setIsImplementingStrategy(false);
    }
  };

  const handleRunSimulation = async (strategyData) => {
    try {
      addAlert('info', `Running ${strategyData.strategyName} simulation`, 
        'Visualizing strategy outcomes on the network map...');
      
      // If there's a recommendation, apply it temporarily to see its effects
      if (strategyData.recommendation && Object.keys(strategyData.recommendation).length > 0) {
        const response = await apiService.acceptRecommendation(strategyData.recommendation);
        
        if (response.data.status === 'success') {
          // Get updated network state to visualize the simulation
          const stateResponse = await apiService.getCurrentState();
          setNetworkState(stateResponse.data);
          
          // Start the live simulation to show the strategy in action
          if (stateResponse.data.trains && stateResponse.data.trains.length > 0) {
            setSimulationTrains(stateResponse.data.trains);
            handleSimulationStart();
            
            addAlert('success', `${strategyData.strategyName} simulation started`, 
              'Watch the network visualization to see the strategy in action');
          }
        }
      } else {
        // For strategies without recommendations (like NoConflict), just start the current simulation
        const stateResponse = await apiService.getCurrentState();
        setNetworkState(stateResponse.data);
        
        if (stateResponse.data.trains && stateResponse.data.trains.length > 0) {
          setSimulationTrains(stateResponse.data.trains);
          handleSimulationStart();
          
          addAlert('success', `${strategyData.strategyName} baseline simulation started`, 
            'Showing current network state - no optimization changes needed');
        } else {
          addAlert('info', 'No active trains for simulation', 
            'Add some trains to the network to run simulations');
        }
      }
    } catch (error) {
      console.error('Failed to run simulation:', error);
      addAlert('error', 'Failed to run simulation', error.message);
    }
  };

  const getHealthStatusIcon = () => {
    switch (systemHealth) {
      case 'healthy':
        return <CheckCircle className="w-3 h-3 text-rail-success" />;
      case 'degraded':
        return <AlertTriangle className="w-3 h-3 text-rail-warning" />;
      default:
        return <AlertTriangle className="w-3 h-3 text-rail-danger" />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-rail-text">
      {/* Premium Notch Header - Hide in fullscreen */}
      {!isNetworkFullscreen && (
        <header className="notch-header">
        <div className="notch-content">
          <Train className="w-4 h-4 text-rail-text flex-shrink-0" />
          <span className="text-xs font-semibold text-rail-text whitespace-nowrap">R-Vision</span>
          
          <div className="notch-expanded flex items-center space-x-3">
            {/* System Health Indicator */}
            <div className="flex items-center space-x-1">
              {getHealthStatusIcon()}
              <span className="text-xs font-medium capitalize">{systemHealth}</span>
            </div>
            
            {/* Simulation Status */}
            <div className="flex items-center space-x-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isSimulationRunning ? 'bg-rail-success animate-pulse' : 'bg-rail-gray'}`}></div>
              <span className="text-xs font-medium">
                {isSimulationRunning ? 'Live' : 'Paused'}
              </span>
            </div>
            
            {/* Active Trains Count */}
            {(networkState || simulationTrains.length > 0) && (
              <div className="flex items-center space-x-1">
                <Activity className="w-3 h-3 text-rail-text" />
                <span className="text-xs font-medium text-rail-text">
                  {simulationTrains.length > 0 ? simulationTrains.length : Object.keys(networkState?.trains || {}).length} Trains
                </span>
              </div>
            )}
          </div>
        </div>
        </header>
      )}

      {/* Main Layout */}
      {!isNetworkFullscreen ? (
        <div className="flex h-[calc(100vh-20px)] p-3 pt-16 gap-3">
          {/* Left Sidebar - Control Panel */}
          <div className="w-64 flex flex-col">
            <ControlPanel
              networkState={networkState}
              isSimulationRunning={isSimulationRunning}
              onScheduleUploaded={handleScheduleUploaded}
              onSimulationStart={handleSimulationStart}
              onSimulationStop={handleSimulationStop}
              onDisruptionReported={handleDisruptionReported}
              // Live simulation props
              simulationTrains={simulationTrains}
              simulationTime={simulationTime}
              simulationSpeed={simulationSpeed}
              setSimulationSpeed={setSimulationSpeed}
              onResetSimulation={resetSimulation}
            />
          </div>

          {/* Main Content - Network Visualization and Alerts */}
          <div className="flex-1 flex gap-3 min-h-0">
            {/* Network Visualization */}
            <div className="flex-1 rail-card p-3 min-h-0">
              <NetworkGraph
                networkState={networkState}
                isSimulationRunning={isSimulationRunning}
                onFullscreenChange={setIsNetworkFullscreen}
                // Live simulation props
                simulationTrains={simulationTrains}
                simulationTime={simulationTime}
                networkData={networkData}
                leftPanelContent={
                  <ControlPanel
                    networkState={networkState}
                    isSimulationRunning={isSimulationRunning}
                    onScheduleUploaded={handleScheduleUploaded}
                    onSimulationStart={handleSimulationStart}
                    onSimulationStop={handleSimulationStop}
                    onDisruptionReported={handleDisruptionReported}
                    // Live simulation props
                    simulationTrains={simulationTrains}
                    simulationTime={simulationTime}
                    simulationSpeed={simulationSpeed}
                    setSimulationSpeed={setSimulationSpeed}
                    onResetSimulation={resetSimulation}
                  />
                }
                rightPanelContent={
                  multiStrategySimulations ? (
                    <MultiStrategySimulation
                      simulations={multiStrategySimulations}
                      onImplementStrategy={handleImplementStrategy}
                      isImplementing={isImplementingStrategy}
                    />
                  ) : (
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
                  )
                }
              />
            </div>

            {/* Right Panel - Clock and Alerts */}
            <div className="w-72 flex-shrink-0 flex flex-col space-y-3">
              {/* Simulation Clock - Only show when live simulation is available */}
              {simulationTrains.length > 0 && (
                <SimulationClock
                  simulationTime={simulationTime}
                  simulationSpeed={simulationSpeed}
                  isRunning={isLiveSimulationRunning}
                  onSpeedChange={setSimulationSpeed}
                  onTogglePlayPause={isLiveSimulationRunning ? handleSimulationStop : handleSimulationStart}
                  onReset={resetSimulation}
                  trainsCount={simulationTrains.length}
                />
              )}
              
              {/* Multi-Strategy Simulation or Alerts and Recommendations */}
              <div className="flex-1 min-h-0">
                {multiStrategySimulations ? (
                  <MultiStrategySimulation
                    simulations={multiStrategySimulations}
                    onImplementStrategy={handleImplementStrategy}
                    onRunSimulation={handleRunSimulation}
                    isImplementing={isImplementingStrategy}
                  />
                ) : (
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
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Fullscreen Network Visualization */
        <div className="h-screen">
          <NetworkGraph
            networkState={networkState}
            isSimulationRunning={isSimulationRunning}
            onFullscreenChange={setIsNetworkFullscreen}
            // Live simulation props
            simulationTrains={simulationTrains}
            simulationTime={simulationTime}
            networkData={networkData}
            leftPanelContent={
              <ControlPanel
                networkState={networkState}
                isSimulationRunning={isSimulationRunning}
                onScheduleUploaded={handleScheduleUploaded}
                onSimulationStart={handleSimulationStart}
                onSimulationStop={handleSimulationStop}
                onDisruptionReported={handleDisruptionReported}
                // Live simulation props
                simulationTrains={simulationTrains}
                simulationTime={simulationTime}
                simulationSpeed={simulationSpeed}
                setSimulationSpeed={setSimulationSpeed}
                onResetSimulation={resetSimulation}
              />
            }
            rightPanelContent={
              <div className="space-y-4">
                {/* Simulation Clock in fullscreen mode */}
                {simulationTrains.length > 0 && (
                  <SimulationClock
                    simulationTime={simulationTime}
                    simulationSpeed={simulationSpeed}
                    isRunning={isLiveSimulationRunning}
                    onSpeedChange={setSimulationSpeed}
                    onTogglePlayPause={isLiveSimulationRunning ? handleSimulationStop : handleSimulationStart}
                    onReset={resetSimulation}
                    trainsCount={simulationTrains.length}
                  />
                )}
                
                {multiStrategySimulations ? (
                  <MultiStrategySimulation
                    simulations={multiStrategySimulations}
                    onImplementStrategy={handleImplementStrategy}
                    onRunSimulation={handleRunSimulation}
                    isImplementing={isImplementingStrategy}
                  />
                ) : (
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
                )}
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

export default App;