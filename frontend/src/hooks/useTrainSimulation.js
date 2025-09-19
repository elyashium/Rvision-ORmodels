// Custom hook for train simulation logic
import { useState, useEffect, useCallback } from 'react';

export const useTrainSimulation = () => {
  // Core simulation state
  const [networkData, setNetworkData] = useState(null);
  const [trains, setTrains] = useState([]);
  const [simulationTime, setSimulationTime] = useState(null);
  const [simulationSpeed, setSimulationSpeed] = useState(1000); // 1000x real-time speed
  const [isRunning, setIsRunning] = useState(false);
  const [rawScheduleData, setRawScheduleData] = useState([]);

  // Helper function to find the earliest departure time (Enhanced for new format)
  const findEarliestDepartureTime = (scheduleData) => {
    if (!scheduleData || scheduleData.length === 0) return new Date();
    
    const departureTimes = scheduleData.map(train => {
      if (train.Route && Array.isArray(train.Route) && train.Route.length > 0) {
        // New format - get departure time from first route stop
        const firstStop = train.Route[0];
        return firstStop.Departure_Time ? new Date(firstStop.Departure_Time) : new Date();
      } else {
        // Legacy format
        return new Date(train.Scheduled_Departure_Time);
      }
    });
    
    return new Date(Math.min(...departureTimes));
  };

  // Helper function to find track connecting two stations
  const findTrackBetweenStations = (startStation, endStation, networkData) => {
    if (!networkData?.tracks) return null;
    
    // First try to find direct track
    for (const [trackId, track] of Object.entries(networkData.tracks)) {
      if (track.from === startStation && track.to === endStation) {
        return { trackId, track, isDirect: true };
      }
    }
    
    // Try to find alternative route through route_alternatives
    if (networkData.route_alternatives) {
      const routeKey = `${startStation}_to_${endStation}`;
      const altRouteKey = `${endStation}_to_${startStation}`;
      
      let routeInfo = networkData.route_alternatives[routeKey] || networkData.route_alternatives[altRouteKey];
      
      if (routeInfo) {
        // Use primary route first
        const primaryRoute = routeInfo.primary;
        if (primaryRoute && primaryRoute.length > 0) {
          const firstTrackId = primaryRoute[0];
          const firstTrack = networkData.tracks[firstTrackId];
          if (firstTrack) {
            return { 
              trackId: firstTrackId, 
              track: firstTrack, 
              isDirect: primaryRoute.length === 1,
              fullRoute: primaryRoute
            };
          }
        }
        
        // If primary route doesn't work, try alternatives
        if (routeInfo.alternatives && routeInfo.alternatives.length > 0) {
          for (const altRoute of routeInfo.alternatives) {
            if (altRoute.length > 0) {
              const firstTrackId = altRoute[0];
              const firstTrack = networkData.tracks[firstTrackId];
              if (firstTrack) {
                return { 
                  trackId: firstTrackId, 
                  track: firstTrack, 
                  isDirect: altRoute.length === 1,
                  fullRoute: altRoute
                };
              }
            }
          }
        }
      }
    }
    
    // If no route found, return null
    return null;
  };

  // Helper function to get edge path from vis-network
  const getEdgePath = (fromStation, toStation, networkData, trackInfo = null) => {
    if (!networkData?.stations) return null;
    
    const fromCoords = getStationCoordinates(fromStation, networkData);
    const toCoords = getStationCoordinates(toStation, networkData);
    
    if (!fromCoords || !toCoords) return null;
    
    // If we have track info with a full route, create multi-point path
    if (trackInfo && trackInfo.fullRoute && trackInfo.fullRoute.length > 1) {
      const pathPoints = [];
      
      // Add starting point
      pathPoints.push(fromCoords);
      
      // Add intermediate points based on the track route
      for (let i = 0; i < trackInfo.fullRoute.length; i++) {
        const trackId = trackInfo.fullRoute[i];
        const track = networkData.tracks[trackId];
        if (track) {
          // Add intermediate station coordinates if this isn't the first or last track
          if (i > 0) {
            const intermediateStation = track.from;
            const intermediateCoords = getStationCoordinates(intermediateStation, networkData);
            if (intermediateCoords) {
              pathPoints.push(intermediateCoords);
            }
          }
        }
      }
      
      // Add ending point
      pathPoints.push(toCoords);
      
      return {
        startPoint: fromCoords,
        endPoint: toCoords,
        path: pathPoints
      };
    }
    
    // Default to simple two-point path
    return {
      startPoint: fromCoords,
      endPoint: toCoords,
      path: [fromCoords, toCoords]
    };
  };

  // Helper function to get station coordinates consistently
  const getStationCoordinates = (stationId, networkData) => {
    if (networkData && networkData.stations && networkData.stations[stationId]) {
      const coords = networkData.stations[stationId].coordinates;
      // Convert lat/lon to x/y coordinates (simplified projection)
      const x = (coords.lon - 77.2197) * 10000; // Offset from NDLS and scale
      const y = (coords.lat - 28.6431) * 10000; // Offset from NDLS and scale
      return { x, y };
    }
    
    // Fallback coordinates
    const fallbackCoords = {
      'NDLS': { x: 0, y: 0 },
      'ANVR': { x: 300, y: -50 },
      'Anand_Vihar': { x: 300, y: -50 },
      'GZB': { x: 600, y: 0 },
      'Ghaziabad': { x: 600, y: 0 },
      'SBB': { x: 500, y: 150 },
      'VVB': { x: 300, y: 100 },
      'SHZM': { x: 150, y: 75 },
      'DLI': { x: -100, y: 50 },
      'MUT': { x: 800, y: -100 },
      'Aligarh': { x: 900, y: 100 },
    };
    
    return fallbackCoords[stationId] || { x: 0, y: 0 };
  };

  // Helper function to interpolate along a path
  const interpolateAlongPath = (pathPoints, progress) => {
    if (!pathPoints || pathPoints.length < 2) {
      return { x: 0, y: 0 };
    }
    
    if (pathPoints.length === 2) {
      // Simple two-point interpolation
      const start = pathPoints[0];
      const end = pathPoints[1];
      return {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress
      };
    }
    
    // For multi-point paths (future enhancement)
    // Calculate total path length and interpolate along segments
    const totalLength = calculatePathLength(pathPoints);
    const targetDistance = totalLength * progress;
    
    let currentDistance = 0;
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const segmentStart = pathPoints[i];
      const segmentEnd = pathPoints[i + 1];
      const segmentLength = Math.sqrt(
        Math.pow(segmentEnd.x - segmentStart.x, 2) + 
        Math.pow(segmentEnd.y - segmentStart.y, 2)
      );
      
      if (currentDistance + segmentLength >= targetDistance) {
        // The target point is on this segment
        const segmentProgress = (targetDistance - currentDistance) / segmentLength;
        return {
          x: segmentStart.x + (segmentEnd.x - segmentStart.x) * segmentProgress,
          y: segmentStart.y + (segmentEnd.y - segmentStart.y) * segmentProgress
        };
      }
      
      currentDistance += segmentLength;
    }
    
    // Fallback to the last point
    return pathPoints[pathPoints.length - 1];
  };

  // Helper function to calculate total path length
  const calculatePathLength = (pathPoints) => {
    let totalLength = 0;
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const start = pathPoints[i];
      const end = pathPoints[i + 1];
      totalLength += Math.sqrt(
        Math.pow(end.x - start.x, 2) + 
        Math.pow(end.y - start.y, 2)
      );
    }
    return totalLength;
  };

  // Step 2: Pre-processing function for train data (Enhanced for multi-stop journeys)
  const preprocessTrainData = useCallback((scheduleData, networkData) => {
    if (!scheduleData || !networkData) return [];

    return scheduleData.map(trainData => {
      // Handle both old and new schedule formats
      let processedRoute = [];
      
      if (trainData.Route && Array.isArray(trainData.Route)) {
        // New enhanced schedule format with multi-stop routes
        processedRoute = trainData.Route.map((stop, index) => ({
          ...stop,
          arrivalTime: stop.Arrival_Time ? new Date(stop.Arrival_Time) : null,
          departureTime: stop.Departure_Time ? new Date(stop.Departure_Time) : null,
          isOrigin: index === 0,
          isDestination: index === trainData.Route.length - 1
        }));

        // Apply delays to all times
        if (trainData.Initial_Reported_Delay_Mins > 0) {
          const delayMs = trainData.Initial_Reported_Delay_Mins * 60 * 1000;
          processedRoute = processedRoute.map(stop => ({
            ...stop,
            arrivalTime: stop.arrivalTime ? new Date(stop.arrivalTime.getTime() + delayMs) : null,
            departureTime: stop.departureTime ? new Date(stop.departureTime.getTime() + delayMs) : null
          }));
        }
      } else {
        // Legacy schedule format - convert to new format
        const startStation = trainData.Section_Start || 'NDLS';
        const endStation = trainData.Section_End || 'GZB';
        const departureTime = new Date(trainData.Scheduled_Departure_Time);
        const arrivalTime = new Date(trainData.Scheduled_Arrival_Time);

        // Apply delays
        if (trainData.Initial_Reported_Delay_Mins > 0) {
          const delayMs = trainData.Initial_Reported_Delay_Mins * 60 * 1000;
          departureTime.setTime(departureTime.getTime() + delayMs);
          arrivalTime.setTime(arrivalTime.getTime() + delayMs);
        }

        processedRoute = [
          {
            Station_ID: startStation,
            Station_Name: startStation,
            arrivalTime: null,
            departureTime: departureTime,
            Stop_Duration_Mins: 0,
            Platform: "1",
            isOrigin: true,
            isDestination: false
          },
          {
            Station_ID: endStation,
            Station_Name: endStation,
            arrivalTime: arrivalTime,
            departureTime: null,
            Stop_Duration_Mins: 0,
            Platform: "1",
            isOrigin: false,
            isDestination: true
          }
        ];
      }

      const train = {
        ...trainData,
        route: processedRoute,
        
        // Ensure we have a consistent Train_ID
        Train_ID: trainData.Train_ID || trainData.train_id,
        
        // Journey state tracking
        currentLegIndex: 0, // Which leg of journey train is on
        currentStopIndex: 0, // Which stop train is approaching/at
        isAtStation: false,
        stationArrivalTime: null,
        
        // Dynamic state properties that persist throughout simulation
        currentStatus: 'Scheduled',
        currentPosition: getStationCoordinates(processedRoute[0].Station_ID, networkData) || { x: 0, y: 0 },
        progressPercentage: 0,
        
        // Lifecycle tracking
        hasStarted: false,
        hasCompleted: false,
        
        // Store original data for reference
        originalData: trainData
      };

      return train;
    });
  }, []);

  // Step 3: Enhanced function to calculate train position for multi-stop journeys
  const calculateTrainPosition = useCallback((train, currentTime, networkData) => {
    if (!train || !currentTime || !networkData || !train.route || train.route.length === 0) {
      return { 
        status: 'Unknown', 
        position: { x: 0, y: 0 },
        currentStop: null,
        nextStop: null,
        isAtStation: false
      };
    }

    // Note: Station coordinates are now handled by getStationCoordinates() function

    const route = train.route;
    const firstStop = route[0];
    const lastStop = route[route.length - 1];

    // Check if train hasn't started yet
    if (currentTime < firstStop.departureTime) {
      return {
        status: 'Scheduled',
        position: getStationCoordinates(firstStop.Station_ID, networkData),
        currentStop: firstStop,
        nextStop: route[1] || null,
        isAtStation: true,
        stationInfo: `Platform ${firstStop.Platform} - Scheduled Departure`,
        progressPercentage: 0,
        hasStarted: false,
        hasCompleted: false
      };
    }

    // Check if train has completed its journey
    if (lastStop.arrivalTime && currentTime >= lastStop.arrivalTime) {
      return {
        status: 'Arrived',
        position: getStationCoordinates(lastStop.Station_ID, networkData),
        currentStop: lastStop,
        nextStop: null,
        isAtStation: true,
        stationInfo: `Platform ${lastStop.Platform} - Journey Complete`,
        progressPercentage: 100,
        hasStarted: true,
        hasCompleted: true
      };
    }

    // Find current leg of journey
    for (let i = 0; i < route.length - 1; i++) {
      const currentStop = route[i];
      const nextStop = route[i + 1];
      
      const legDepartureTime = currentStop.departureTime || currentStop.arrivalTime;
      const legArrivalTime = nextStop.arrivalTime;

      if (!legDepartureTime || !legArrivalTime) continue;

      // Check if train is between these two stops
      if (currentTime >= legDepartureTime && currentTime <= legArrivalTime) {
        // Calculate progress along this leg
        const legDuration = legArrivalTime.getTime() - legDepartureTime.getTime();
        const timeElapsed = currentTime.getTime() - legDepartureTime.getTime();
        const progressPercentage = Math.max(0, Math.min(1, timeElapsed / legDuration));

        // Find the track/edge between these stations
        const trackInfo = findTrackBetweenStations(currentStop.Station_ID, nextStop.Station_ID, networkData);
        let position;

        if (trackInfo) {
          // Use track-based movement with proper route following
          const edgePath = getEdgePath(currentStop.Station_ID, nextStop.Station_ID, networkData, trackInfo);
          if (edgePath) {
            // Interpolate along the actual edge path (may include intermediate stations)
            position = interpolateAlongPath(edgePath.path, progressPercentage);
            console.log(`Train following ${trackInfo.isDirect ? 'direct' : 'multi-hop'} track: ${trackInfo.trackId}`);
          } else {
            // Fallback to direct interpolation
            const currentStopCoords = getStationCoordinates(currentStop.Station_ID, networkData);
            const nextStopCoords = getStationCoordinates(nextStop.Station_ID, networkData);
            position = {
              x: currentStopCoords.x + (nextStopCoords.x - currentStopCoords.x) * progressPercentage,
              y: currentStopCoords.y + (nextStopCoords.y - currentStopCoords.y) * progressPercentage
            };
          }
        } else {
          // No track found - use direct line as fallback
          console.warn(`No track found between ${currentStop.Station_ID} and ${nextStop.Station_ID} - using direct route`);
          const currentStopCoords = getStationCoordinates(currentStop.Station_ID, networkData);
          const nextStopCoords = getStationCoordinates(nextStop.Station_ID, networkData);
          position = {
            x: currentStopCoords.x + (nextStopCoords.x - currentStopCoords.x) * progressPercentage,
            y: currentStopCoords.y + (nextStopCoords.y - currentStopCoords.y) * progressPercentage
          };
        }

        const status = train.Initial_Reported_Delay_Mins > 0 ? 'Delayed' : 'En-Route';

        return {
          status,
          position,
          currentStop: currentStop,
          nextStop: nextStop,
          isAtStation: false,
          progressPercentage,
          stationInfo: `${currentStop.Station_Name} → ${nextStop.Station_Name}`,
          trackId: trackInfo?.trackId || null,
          hasStarted: true,
          hasCompleted: false
        };
      }

      // Check if train is currently stopped at a station
      if (nextStop.arrivalTime && nextStop.departureTime && 
          currentTime >= nextStop.arrivalTime && currentTime < nextStop.departureTime) {
        return {
          status: nextStop.Stop_Duration_Mins > 0 ? 'Stopped' : 'En-Route',
          position: getStationCoordinates(nextStop.Station_ID, networkData),
          currentStop: nextStop,
          nextStop: route[i + 2] || null,
          isAtStation: true,
          stationInfo: `Platform ${nextStop.Platform} - ${nextStop.Stop_Duration_Mins}min stop`,
          progressPercentage: Math.round((i + 1) / route.length * 100),
          hasStarted: true,
          hasCompleted: false
        };
      }
    }

    // Fallback - return position at origin with preserved state
    return {
      status: 'Unknown',
      position: getStationCoordinates(firstStop.Station_ID, networkData),
      currentStop: firstStop,
      nextStop: route[1] || null,
      isAtStation: true,
      stationInfo: 'Unknown Status',
      progressPercentage: train.progressPercentage || 0,
      hasStarted: train.hasStarted || false,
      hasCompleted: train.hasCompleted || false
    };
  }, []);

  // Load schedule function (Enhanced to try new schedule format first)
  const loadSchedule = useCallback(async () => {
    try {
      // Load network graph data
      const networkResponse = await fetch('/network_graph.json');
      const networkData = await networkResponse.json();
      setNetworkData(networkData);

      let scheduleData;
      
      try {
        // Try to load enhanced schedule first
        const enhancedResponse = await fetch('/enhanced_schedule.json');
        scheduleData = await enhancedResponse.json();
        console.log('✅ Loaded enhanced multi-stop schedule');
      } catch (enhancedError) {
        console.log('Enhanced schedule not found, falling back to legacy schedule');
        // Fallback to legacy schedule
        const legacyResponse = await fetch('/schedule.json');
        scheduleData = await legacyResponse.json();
        console.log('✅ Loaded legacy schedule');
      }
      
      setRawScheduleData(scheduleData);

      // Preprocess train data
      const processedTrains = preprocessTrainData(scheduleData, networkData);
      setTrains(processedTrains);

      // Initialize simulation time to earliest departure
      const earliestTime = findEarliestDepartureTime(scheduleData);
      setSimulationTime(earliestTime);

      console.log('Schedule loaded successfully:', {
        trains: processedTrains.length,
        networkStations: Object.keys(networkData.stations || {}).length,
        simulationStartTime: earliestTime.toISOString(),
        hasMultiStopRoutes: scheduleData.some(train => train.Route && train.Route.length > 2)
      });

      return { networkData, trains: processedTrains, simulationTime: earliestTime };
    } catch (error) {
      console.error('Failed to load schedule:', error);
      throw error;
    }
  }, [preprocessTrainData]);

  // Step 4: Enhanced simulation loop for multi-stop journeys
  useEffect(() => {
    if (!isRunning || !simulationTime) return;

    const intervalId = setInterval(() => {
      // Use a ref to track current simulation time to avoid stale closures
      const currentTime = new Date();
      
      setSimulationTime(prevTime => {
        if (!prevTime) return currentTime;
        const newTime = new Date(prevTime.getTime() + (1000 * simulationSpeed / 60)); // Advance by scaled minute
        
        // Update train positions based on the new simulation time
        setTrains(prevTrains => {
          // Always preserve all trains, just update their positions and state
          return prevTrains.map(train => {
            const positionData = calculateTrainPosition(train, newTime, networkData);
            return {
              ...train, // Preserve all existing train data
              currentStatus: positionData.status,
              currentPosition: positionData.position,
              currentStop: positionData.currentStop,
              nextStop: positionData.nextStop,
              isAtStation: positionData.isAtStation,
              stationInfo: positionData.stationInfo,
              progressPercentage: positionData.progressPercentage || train.progressPercentage || 0,
              hasStarted: positionData.hasStarted !== undefined ? positionData.hasStarted : train.hasStarted,
              hasCompleted: positionData.hasCompleted !== undefined ? positionData.hasCompleted : train.hasCompleted,
              trackId: positionData.trackId || train.trackId
            };
          });
        });
        
        return newTime;
      });
    }, 50); // Tick every 50ms

    return () => clearInterval(intervalId);
  }, [isRunning, networkData, simulationSpeed, calculateTrainPosition]); // Keep minimal dependencies

  // Control functions
  const startSimulation = useCallback(() => {
    if (trains.length > 0) {
      setIsRunning(true);
    }
  }, [trains.length]);

  const stopSimulation = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetSimulation = useCallback(() => {
    if (rawScheduleData.length > 0 && networkData) {
      setIsRunning(false);
      const processedTrains = preprocessTrainData(rawScheduleData, networkData);
      setTrains(processedTrains);
      const earliestTime = findEarliestDepartureTime(rawScheduleData);
      setSimulationTime(earliestTime);
    }
  }, [rawScheduleData, networkData, preprocessTrainData]);

  // Function to load trains from strategy simulation results  
  const loadStrategySimulation = useCallback((strategySimulationData) => {
    try {
      // Stop current simulation
      setIsRunning(false);
      
      let scheduleData = [];
      
      // Handle different data formats
      if (Array.isArray(strategySimulationData)) {
        // Direct schedule array format (new backend format)
        scheduleData = strategySimulationData;
      } else if (strategySimulationData.trains) {
        // Legacy network state format
        if (Array.isArray(strategySimulationData.trains)) {
          scheduleData = strategySimulationData.trains;
        } else {
          // Convert object format to array
          scheduleData = Object.values(strategySimulationData.trains).map(train => ({
            Train_ID: train.train_id || train.Train_ID,
            Train_Type: train.train_type || train.Train_Type || 'Express',
            Train_Name: train.train_name || train.Train_Name || train.train_id || train.Train_ID,
            Route: train.Route || [{
              Station_ID: train.section_start,
              Station_Name: train.section_start,
              Arrival_Time: train.scheduled_departure || '06:00:00',
              Departure_Time: train.scheduled_departure || '06:00:00',
              Platform: '1'
            }, {
              Station_ID: train.section_end,
              Station_Name: train.section_end,
              Arrival_Time: train.scheduled_arrival || '08:00:00',
              Departure_Time: train.scheduled_arrival || '08:00:00',
              Platform: '1'
            }],
            status: train.status || 'On Time',
            current_delay_mins: train.current_delay_mins || 0
          }));
        }
      } else {
        console.warn('Unknown strategy simulation data format:', strategySimulationData);
        return { trains: [] };
      }
      
      console.log('Processing strategy schedule data:', scheduleData.length, 'trains');
      
      if (scheduleData.length > 0 && networkData) {
        // Store the raw schedule data for the simulation
        setRawScheduleData(scheduleData);
        
        // Process the schedule data using the standard preprocessing
        const processedTrains = preprocessTrainData(scheduleData, networkData);
        setTrains(processedTrains);
        
        // Set simulation time to earliest departure
        const earliestTime = findEarliestDepartureTime(scheduleData);
        setSimulationTime(earliestTime);
        
        console.log('Strategy simulation loaded successfully:');
        console.log('  - Trains:', processedTrains.length);
        console.log('  - Start time:', earliestTime);
        console.log('  - Sample train:', processedTrains[0]?.Train_ID);
        
        return { trains: processedTrains };
      }
      
      console.warn('No valid schedule data or network data available');
      return { trains: [] };
    } catch (error) {
      console.error('Failed to load strategy simulation:', error);
      throw error;
    }
  }, [preprocessTrainData, networkData, findEarliestDepartureTime]);

  return {
    // State
    networkData,
    trains,
    simulationTime,
    simulationSpeed,
    isRunning,
    
    // Actions
    loadSchedule,
    loadStrategySimulation,
    startSimulation,
    stopSimulation,
    resetSimulation,
    setSimulationSpeed,
    
    // Utils
    calculateTrainPosition
  };
};
