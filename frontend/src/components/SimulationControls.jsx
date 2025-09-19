import React from 'react';
import { Play, Pause, RotateCcw, Gauge } from 'lucide-react';

const SimulationControls = ({ 
  simulationSpeed, 
  setSimulationSpeed, 
  isRunning, 
  onStart, 
  onStop, 
  onReset,
  simulationTime,
  trainsCount = 0
}) => {
  const speedOptions = [
    { value: 100, label: '100x' },
    { value: 500, label: '500x' },
    { value: 1000, label: '1000x' },
    { value: 2000, label: '2000x' },
    { value: 5000, label: '5000x' }
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-rail-text-secondary uppercase tracking-wide">
          Live Simulation Controls
        </h3>
        
        {/* Simulation Status */}
        <div className="rail-card p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-rail-text">Status:</span>
            <span className={`text-xs font-medium ${isRunning ? 'text-rail-success' : 'text-rail-gray'}`}>
              {isRunning ? 'Running' : 'Paused'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-rail-text">Active Trains:</span>
            <span className="text-xs font-medium text-rail-accent">{trainsCount}</span>
          </div>
          
          {simulationTime && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-rail-text">Sim Time:</span>
              <span className="text-xs font-medium text-rail-blue">
                {simulationTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex space-x-2">
          <button
            onClick={isRunning ? onStop : onStart}
            disabled={trainsCount === 0}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded text-xs font-medium transition-colors ${
              trainsCount === 0 
                ? 'bg-rail-gray text-rail-text-secondary cursor-not-allowed'
                : isRunning 
                  ? 'bg-rail-warning text-white hover:bg-rail-warning/90' 
                  : 'bg-rail-success text-white hover:bg-rail-success/90'
            }`}
          >
            {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isRunning ? 'Pause' : 'Start'}</span>
          </button>
          
          <button
            onClick={onReset}
            disabled={trainsCount === 0}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center ${
              trainsCount === 0
                ? 'bg-rail-gray text-rail-text-secondary cursor-not-allowed'
                : 'bg-rail-accent text-white hover:bg-rail-accent/90'
            }`}
            title="Reset Simulation"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Gauge className="w-3 h-3 text-rail-text" />
            <span className="text-xs text-rail-text">Simulation Speed</span>
          </div>
          
          <select
            value={simulationSpeed}
            onChange={(e) => setSimulationSpeed(Number(e.target.value))}
            className="w-full px-2 py-1 text-xs border border-rail-gray rounded focus:outline-none focus:ring-1 focus:ring-rail-blue"
          >
            {speedOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} Real-time
              </option>
            ))}
          </select>
        </div>

        {/* Info */}
        <div className="text-xs text-rail-text-secondary bg-rail-gray/20 p-2 rounded">
          <p className="mb-1"><strong>Live Simulation Mode:</strong></p>
          <p>• Trains move according to their actual schedules</p>
          <p>• Times and delays are realistically simulated</p>
          <p>• Speed control accelerates time passage</p>
        </div>
      </div>
    </div>
  );
};

export default SimulationControls;
