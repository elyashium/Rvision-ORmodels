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

  // Helper function to find the earliest departure time
  const findEarliestDepartureTime = (scheduleData) => {
    if (!scheduleData || scheduleData.length === 0) return new Date();
    
    const departureTimes = scheduleData.map(train => new Date(train.Scheduled_Departure_Time));
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

  // Step 2: Pre-processing function for train data
  const preprocessTrainData = useCallback((scheduleData, networkData) => {
    if (!scheduleData || !networkData) return [];

    return scheduleData.map(trainData => {
      const train = {
        ...trainData,
        // Convert time strings to Date objects
        scheduledDepartureTime: new Date(trainData.Scheduled_Departure_Time),
        scheduledArrivalTime: new Date(trainData.Scheduled_Arrival_Time),
        
        // Add dynamic state properties
        currentStatus: 'Scheduled',
        currentPosition: { x: 0, y: 0 },
        currentTrack: findTrackBetweenStations(trainData.Section_Start, trainData.Section_End, networkData),
        
        // Store original data for reference
        originalData: trainData
      };

      // Adjust times for initial delay
      if (trainData.Initial_Reported_Delay_Mins > 0) {
        train.scheduledDepartureTime = new Date(
          train.scheduledDepartureTime.getTime() + (trainData.Initial_Reported_Delay_Mins * 60 * 1000)
        );
        train.scheduledArrivalTime = new Date(
          train.scheduledArrivalTime.getTime() + (trainData.Initial_Reported_Delay_Mins * 60 * 1000)
        );
      }

      return train;
    });
  }, []);

  // Step 3: Core function to calculate train position
  const calculateTrainPosition = useCallback((train, currentTime, networkData) => {
    if (!train || !currentTime || !networkData) {
      return { status: 'Unknown', position: { x: 0, y: 0 } };
    }

    const { scheduledDepartureTime, scheduledArrivalTime, Section_Start, Section_End, Initial_Reported_Delay_Mins } = train;

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

    const startCoords = stationCoordinates[Section_Start] || { x: 0, y: 0 };
    const endCoords = stationCoordinates[Section_End] || { x: 100, y: 0 };

    // Determine status and position
    if (currentTime < scheduledDepartureTime) {
      // Train hasn't departed yet
      return {
        status: 'Scheduled',
        position: startCoords
      };
    } else if (currentTime > scheduledArrivalTime) {
      // Train has arrived
      return {
        status: 'Arrived',
        position: endCoords
      };
    } else {
      // Train is en-route
      const status = Initial_Reported_Delay_Mins > 0 ? 'Delayed' : 'En-Route';
      
      // Calculate progress percentage
      const totalJourneyTime = scheduledArrivalTime.getTime() - scheduledDepartureTime.getTime();
      const timeElapsed = currentTime.getTime() - scheduledDepartureTime.getTime();
      const progressPercentage = Math.max(0, Math.min(1, timeElapsed / totalJourneyTime));

      // Linear interpolation between start and end coordinates
      const currentX = startCoords.x + (endCoords.x - startCoords.x) * progressPercentage;
      const currentY = startCoords.y + (endCoords.y - startCoords.y) * progressPercentage;

      return {
        status,
        position: { x: currentX, y: currentY }
      };
    }
  }, []);

  // Load schedule function
  const loadSchedule = useCallback(async () => {
    try {
      // Load network graph data
      const networkResponse = await fetch('/network_graph.json');
      const networkData = await networkResponse.json();
      setNetworkData(networkData);

      // Load schedule data
      const scheduleResponse = await fetch('/schedule.json');
      const scheduleData = await scheduleResponse.json();
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
        simulationStartTime: earliestTime.toISOString()
      });

      return { networkData, trains: processedTrains, simulationTime: earliestTime };
    } catch (error) {
      console.error('Failed to load schedule:', error);
      throw error;
    }
  }, [preprocessTrainData]);

  // Step 4: Simulation loop
  useEffect(() => {
    if (!isRunning || !simulationTime || trains.length === 0) return;

    const intervalId = setInterval(() => {
      // Advance the simulation clock
      setSimulationTime(prevTime => {
        const newTime = new Date(prevTime.getTime() + (1000 * simulationSpeed / 60)); // Advance by scaled minute
        
        // Update train positions based on new time
        const updatedTrains = trains.map(train => {
          const { status, position } = calculateTrainPosition(train, newTime, networkData);
          return {
            ...train,
            currentStatus: status,
            currentPosition: position
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
