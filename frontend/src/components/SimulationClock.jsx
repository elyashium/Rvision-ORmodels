import React from 'react';
import { Clock, Play, Pause, RotateCcw, Gauge } from 'lucide-react';

const SimulationClock = ({ 
  simulationTime, 
  simulationSpeed = 1000, 
  isRunning = false,
  onSpeedChange,
  onTogglePlayPause,
  onReset,
  trainsCount = 0
}) => {
  const speedOptions = [
    { value: 100, label: '100x' },
    { value: 500, label: '500x' },
    { value: 1000, label: '1000x' },
    { value: 2000, label: '2000x' },
    { value: 5000, label: '5000x' }
  ];

  const formatSimulationTime = (time) => {
    if (!time) return '--:--:--';
    return time.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (time) => {
    if (!time) return '';
    return time.toLocaleDateString([], {
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <div className="bg-gradient-to-br from-rail-darker to-rail-dark text-white p-4 rounded-lg shadow-lg border border-rail-gray">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-rail-light-blue" />
          <h3 className="text-sm font-semibold">Simulation Clock</h3>
        </div>
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-rail-success animate-pulse' : 'bg-rail-gray'}`}></div>
      </div>

      {/* Time Display */}
      <div className="text-center mb-4">
        <div className="text-2xl font-mono font-bold text-rail-light-blue">
          {formatSimulationTime(simulationTime)}
        </div>
        <div className="text-xs text-rail-text-secondary mt-1">
          {formatDate(simulationTime)}
        </div>
      </div>

      {/* Status Information */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div className="text-center">
          <div className="text-rail-text-secondary">Status</div>
          <div className={`font-medium ${isRunning ? 'text-rail-success' : 'text-rail-warning'}`}>
            {isRunning ? 'Running' : 'Paused'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-rail-text-secondary">Active Trains</div>
          <div className="font-medium text-rail-accent">{trainsCount}</div>
        </div>
      </div>

      {/* Speed Control */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <Gauge className="w-3 h-3 text-rail-text-secondary" />
          <span className="text-xs text-rail-text-secondary">Simulation Speed</span>
        </div>
        <select
          value={simulationSpeed}
          onChange={(e) => onSpeedChange && onSpeedChange(Number(e.target.value))}
          className="w-full px-2 py-1 text-xs bg-rail-gray text-rail-text border border-rail-gray rounded focus:outline-none focus:ring-1 focus:ring-rail-blue"
        >
          {speedOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label} Real-time
            </option>
          ))}
        </select>
      </div>

      {/* Controls */}
      <div className="flex space-x-2">
        <button
          onClick={onTogglePlayPause}
          disabled={trainsCount === 0}
          className={`flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded text-xs font-medium transition-colors ${
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

      {/* Real-time Speed Indicator */}
      <div className="mt-3 text-center text-xs text-rail-text-secondary">
        {simulationTime && isRunning && (
          <div className="flex items-center justify-center space-x-1">
            <div className="w-1 h-1 bg-rail-success rounded-full animate-pulse"></div>
            <span>1 sim min = {60000 / simulationSpeed}ms real time</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationClock;
