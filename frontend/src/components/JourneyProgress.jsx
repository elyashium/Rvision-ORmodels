import React from 'react';
import { MapPin, Clock, CheckCircle } from 'lucide-react';

const JourneyProgress = ({ train }) => {
  if (!train || !train.route || train.route.length === 0) {
    return null;
  }

  const route = train.route;
  const currentTime = new Date(); // This should be simulation time in real implementation

  const getStopStatus = (stop, index) => {
    if (!train.currentStop) return 'upcoming';
    
    const currentStopIndex = route.findIndex(s => s.Station_ID === train.currentStop.Station_ID);
    
    if (index < currentStopIndex) return 'completed';
    if (index === currentStopIndex) return 'current';
    if (index === currentStopIndex + 1 && !train.isAtStation) return 'approaching';
    return 'upcoming';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-rail-success" />;
      case 'current':
        return <div className="w-3 h-3 rounded-full bg-rail-warning animate-pulse" />;
      case 'approaching':
        return <div className="w-3 h-3 rounded-full bg-rail-blue animate-pulse" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-rail-gray" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Departed';
      case 'current': return train.isAtStation ? 'At Station' : 'En Route';
      case 'approaching': return 'Approaching';
      default: return 'Scheduled';
    }
  };

  return (
    <div className="bg-white border border-rail-gray rounded-lg p-3 space-y-2">
      <div className="flex items-center space-x-2 mb-2">
        <MapPin className="w-4 h-4 text-rail-blue" />
        <h4 className="text-sm font-medium text-rail-text">Journey Progress</h4>
        <div className="text-xs text-rail-text-secondary">
          {train.Train_ID}
        </div>
      </div>

      <div className="space-y-2">
        {route.map((stop, index) => {
          const status = getStopStatus(stop, index);
          const isLast = index === route.length - 1;
          
          return (
            <div key={stop.Station_ID} className="relative">
              {/* Stop Details */}
              <div className="flex items-center space-x-3">
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {getStatusIcon(status)}
                </div>
                
                {/* Station Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-rail-text truncate">
                      {stop.Station_Name}
                    </div>
                    <div className="text-xs text-rail-text-secondary">
                      Platform {stop.Platform}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-rail-text-secondary">
                    <div>
                      {getStatusText(status)}
                    </div>
                    <div className="flex space-x-2">
                      {stop.arrivalTime && (
                        <span>Arr: {stop.arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      {stop.departureTime && (
                        <span>Dep: {stop.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                  
                  {stop.Stop_Duration_Mins > 0 && status === 'current' && train.isAtStation && (
                    <div className="text-xs text-rail-warning">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {stop.Stop_Duration_Mins}min stop
                    </div>
                  )}
                </div>
              </div>
              
              {/* Connection Line */}
              {!isLast && (
                <div className="absolute left-1.5 top-6 w-0.5 h-4 bg-rail-gray"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      {train.progressPercentage && (
        <div className="mt-3 pt-2 border-t border-rail-gray">
          <div className="flex justify-between text-xs text-rail-text-secondary mb-1">
            <span>Journey Progress</span>
            <span>{Math.round((train.progressPercentage || 0) * 100)}%</span>
          </div>
          <div className="w-full bg-rail-gray rounded-full h-1.5">
            <div 
              className="bg-rail-blue h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${(train.progressPercentage || 0) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JourneyProgress;
