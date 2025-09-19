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
        return trackId;
      }
    }
    
    // If no direct track found, return null (could implement multi-hop routing later)
    return null;
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
        
        // Journey state tracking
        currentLegIndex: 0, // Which leg of journey train is on
        currentStopIndex: 0, // Which stop train is approaching/at
        isAtStation: false,
        stationArrivalTime: null,
        
        // Dynamic state properties
        currentStatus: 'Scheduled',
        currentPosition: { x: 0, y: 0 },
        
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

    // Station coordinates mapping - dynamically generated from network data or fallback
    const stationCoordinates = {};
    
    if (networkData && networkData.stations) {
      // Use actual coordinates from network_graph.json
      Object.entries(networkData.stations).forEach(([stationId, station]) => {
        const coords = station.coordinates;
        // Convert lat/lon to x/y coordinates (simplified projection)
        const x = (coords.lon - 77.2197) * 10000; // Offset from NDLS and scale
        const y = (coords.lat - 28.6431) * 10000; // Offset from NDLS and scale
        stationCoordinates[stationId] = { x, y };
      });
    } else {
      // Fallback coordinates
      Object.assign(stationCoordinates, {
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
      });
    }

    const route = train.route;
    const firstStop = route[0];
    const lastStop = route[route.length - 1];

    // Check if train hasn't started yet
    if (currentTime < firstStop.departureTime) {
      return {
        status: 'Scheduled',
        position: stationCoordinates[firstStop.Station_ID] || { x: 0, y: 0 },
        currentStop: firstStop,
        nextStop: route[1] || null,
        isAtStation: true,
        stationInfo: `Platform ${firstStop.Platform}`
      };
    }

    // Check if train has completed its journey
    if (lastStop.arrivalTime && currentTime >= lastStop.arrivalTime) {
      return {
        status: 'Arrived',
        position: stationCoordinates[lastStop.Station_ID] || { x: 100, y: 0 },
        currentStop: lastStop,
        nextStop: null,
        isAtStation: true,
        stationInfo: `Platform ${lastStop.Platform} - Journey Complete`
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
        const currentStopCoords = stationCoordinates[currentStop.Station_ID] || { x: 0, y: 0 };
        const nextStopCoords = stationCoordinates[nextStop.Station_ID] || { x: 100, y: 0 };

        // Calculate progress along this leg
        const legDuration = legArrivalTime.getTime() - legDepartureTime.getTime();
        const timeElapsed = currentTime.getTime() - legDepartureTime.getTime();
        const progressPercentage = Math.max(0, Math.min(1, timeElapsed / legDuration));

        // Linear interpolation between current and next station
        const currentX = currentStopCoords.x + (nextStopCoords.x - currentStopCoords.x) * progressPercentage;
        const currentY = currentStopCoords.y + (nextStopCoords.y - currentStopCoords.y) * progressPercentage;

        const status = train.Initial_Reported_Delay_Mins > 0 ? 'Delayed' : 'En-Route';

        return {
          status,
          position: { x: currentX, y: currentY },
          currentStop: currentStop,
          nextStop: nextStop,
          isAtStation: false,
          progressPercentage,
          stationInfo: `${currentStop.Station_Name} → ${nextStop.Station_Name}`
        };
      }

      // Check if train is currently stopped at a station
      if (nextStop.arrivalTime && nextStop.departureTime && 
          currentTime >= nextStop.arrivalTime && currentTime < nextStop.departureTime) {
        return {
          status: nextStop.Stop_Duration_Mins > 0 ? 'Stopped' : 'En-Route',
          position: stationCoordinates[nextStop.Station_ID] || { x: 0, y: 0 },
          currentStop: nextStop,
          nextStop: route[i + 2] || null,
          isAtStation: true,
          stationInfo: `Platform ${nextStop.Platform} - ${nextStop.Stop_Duration_Mins}min stop`
        };
      }
    }

    // Fallback - return position at origin
    return {
      status: 'Unknown',
      position: stationCoordinates[firstStop.Station_ID] || { x: 0, y: 0 },
      currentStop: firstStop,
      nextStop: route[1] || null,
      isAtStation: true,
      stationInfo: 'Unknown Status'
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
    if (!isRunning || !simulationTime || trains.length === 0) return;

    const intervalId = setInterval(() => {
      // Advance the simulation clock
      setSimulationTime(prevTime => {
        const newTime = new Date(prevTime.getTime() + (1000 * simulationSpeed / 60)); // Advance by scaled minute
        
        // Update train positions based on new time
        const updatedTrains = trains.map(train => {
          const positionData = calculateTrainPosition(train, newTime, networkData);
          return {
            ...train,
            currentStatus: positionData.status,
            currentPosition: positionData.position,
            currentStop: positionData.currentStop,
            nextStop: positionData.nextStop,
            isAtStation: positionData.isAtStation,
            stationInfo: positionData.stationInfo,
            progressPercentage: positionData.progressPercentage || 0
          };
        });
        
        setTrains(updatedTrains);
        return newTime;
      });
    }, 50); // Tick every 50ms

    return () => clearInterval(intervalId);
  }, [isRunning, simulationTime, trains, networkData, simulationSpeed, calculateTrainPosition]);

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

  return {
    // State
    networkData,
    trains,
    simulationTime,
    simulationSpeed,
    isRunning,
    
    // Actions
    loadSchedule,
    startSimulation,
    stopSimulation,
    resetSimulation,
    setSimulationSpeed,
    
    // Utils
    calculateTrainPosition
  };
};
