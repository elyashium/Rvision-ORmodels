import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut, X } from 'lucide-react';
import JourneyProgress from './JourneyProgress';

const NetworkGraph = ({ 
  networkState, 
  isSimulationRunning, 
  leftPanelContent, 
  rightPanelContent, 
  onFullscreenChange,
  // New props for live simulation
  simulationTrains = [], 
  simulationTime = null,
  networkData = null,
  // Strategy simulation props
  currentStrategy = null // 'balanced', 'punctuality', 'throughput', or null for normal
}) => {
  const networkContainer = useRef(null);
  const networkInstance = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [trainPositions, setTrainPositions] = useState({});
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [trainNodes, setTrainNodes] = useState(new DataSet());
  const [selectedTrain, setSelectedTrain] = useState(null);

  // Network graph data (stations and tracks) - loaded from your network_graph.json structure
  const getNetworkData = () => {
    // Use actual network data if available, otherwise fall back to hardcoded data
    if (networkData && networkData.stations && networkData.tracks) {
      const nodes = new DataSet();
      const edges = new DataSet();

      // Create station nodes from network_graph.json
      Object.entries(networkData.stations).forEach(([stationId, station]) => {
        const coords = station.coordinates;
        // Convert lat/lon to x/y coordinates (simplified projection)
        const x = (coords.lon - 77.2197) * 10000; // Offset from NDLS and scale
        const y = (coords.lat - 28.6431) * 10000; // Offset from NDLS and scale
        
        nodes.add({
          id: stationId,
          label: station.name.replace(' ', '\n'),
          x: x,
          y: y,
          group: station.type,
          title: `${station.name} (${station.type})\nPlatforms: ${station.platforms}`
        });
      });

      // Create track edges from network_graph.json with failure visualization
      Object.entries(networkData.tracks).forEach(([trackId, track]) => {
        const isDisabled = track.status === 'disabled';
        const isHighPriority = track.priority === 'high';
        
        // Dynamic styling based on track status
        let edgeColor, edgeWidth, edgeDashes, edgeLabel;
        
        if (isDisabled) {
          // Failed track styling
          edgeColor = { color: '#dc3545', highlight: '#b02a37' }; // Red for failed tracks
          edgeWidth = 3;
          edgeDashes = [10, 5]; // Distinctive dashed pattern for failures
          edgeLabel = `❌ ${track.travel_time_minutes}min (FAILED)`;
        } else {
          // Normal track styling
          edgeColor = { color: isHighPriority ? '#495057' : '#6c757d' };
          edgeWidth = isHighPriority ? 2 : 1;
          edgeDashes = track.track_type === 'single_line' ? [5, 5] : false;
          edgeLabel = `${track.travel_time_minutes}min`;
        }
        
        let title = `${trackId} (${track.travel_time_minutes} min)\n${track.track_type}`;
        if (track.max_speed_kmh) {
          title += `, ${track.max_speed_kmh} km/h`;
        }
        
        if (isDisabled) {
          title += `\n🚫 TRACK FAILED: ${track.disable_reason || 'Unknown reason'}`;
          if (track.disabled_timestamp) {
            title += `\nFailed at: ${new Date(track.disabled_timestamp).toLocaleString()}`;
          }
        }
        
        edges.add({
          id: trackId,
          from: track.from,
          to: track.to,
          label: edgeLabel,
          color: edgeColor,
          width: edgeWidth,
          dashes: edgeDashes,
          title: title,
          font: isDisabled ? { 
            color: '#dc3545', 
            size: 10, 
            strokeWidth: 2, 
            strokeColor: '#ffffff',
            align: 'middle'
          } : {
            size: 8,
            color: '#495057',
            strokeWidth: 1,
            strokeColor: '#ffffff',
            align: 'middle'
          }
        });
      });

      return { nodes, edges };
    }

    // Fallback hardcoded data
    const nodes = new DataSet([
      // Stations as nodes
      { id: 'NDLS', label: 'New Delhi\nStation', x: 0, y: 0, group: 'major_junction', title: 'New Delhi Station (Major Junction)' },
      { id: 'ANVR', label: 'Anand Vihar\nTerminal', x: 300, y: -50, group: 'terminal', title: 'Anand Vihar Terminal' },
      { id: 'GZB', label: 'Ghaziabad\nJunction', x: 600, y: 0, group: 'major_junction', title: 'Ghaziabad Junction' },
      { id: 'SBB', label: 'Sahibabad', x: 500, y: 150, group: 'intermediate', title: 'Sahibabad (Intermediate)' },
      { id: 'VVB', label: 'Vivek Vihar', x: 300, y: 100, group: 'intermediate', title: 'Vivek Vihar (Intermediate)' },
      { id: 'SHZM', label: 'Shaheed Nagar', x: 150, y: 75, group: 'small', title: 'Shaheed Nagar (Small Station)' },
      { id: 'DLI', label: 'Old Delhi\nJunction', x: -100, y: 50, group: 'junction', title: 'Old Delhi Junction' },
      { id: 'MUT', label: 'Meerut City', x: 800, y: -100, group: 'destination', title: 'Meerut City (Destination)' },
    ]);

    const edges = new DataSet([
      // Main tracks
      { id: 'NDLS_ANVR_MAIN', from: 'NDLS', to: 'ANVR', label: 'Main Line', color: { color: '#495057' }, width: 2, title: 'NDLS-ANVR Main Line (25 min)' },
      { id: 'ANVR_GZB_MAIN', from: 'ANVR', to: 'GZB', label: 'Main Line', color: { color: '#495057' }, width: 2, title: 'ANVR-GZB Main Line (30 min)' },
      { id: 'GZB_MUT_EXTENSION', from: 'GZB', to: 'MUT', label: 'Extension', color: { color: '#495057' }, width: 2, title: 'GZB-MUT Extension (60 min)' },
      
      // Alternative routes
      { id: 'NDLS_SBB_ALT', from: 'NDLS', to: 'SBB', label: 'Alt Route', color: { color: '#6c757d' }, width: 1, dashes: [5, 5], title: 'NDLS-SBB Alternative (35 min)' },
      { id: 'SBB_GZB_ALT', from: 'SBB', to: 'GZB', label: 'Alt Route', color: { color: '#6c757d' }, width: 1, dashes: [5, 5], title: 'SBB-GZB Alternative (20 min)' },
      
      // Bypass routes
      { id: 'NDLS_VVB_BYPASS', from: 'NDLS', to: 'VVB', label: 'Bypass', color: { color: '#28a745' }, width: 1, dashes: [10, 5], title: 'NDLS-VVB Bypass (40 min)' },
      { id: 'VVB_ANVR_BYPASS', from: 'VVB', to: 'ANVR', label: 'Bypass', color: { color: '#28a745' }, width: 1, dashes: [10, 5], title: 'VVB-ANVR Bypass (18 min)' },
      
      // Local connections
      { id: 'NDLS_DLI_CONNECTOR', from: 'NDLS', to: 'DLI', label: 'Connector', color: { color: '#ffc107' }, width: 1, title: 'NDLS-DLI Connector (8 min)' },
      { id: 'DLI_SHZM_LOCAL', from: 'DLI', to: 'SHZM', label: 'Local', color: { color: '#ffc107' }, width: 1, title: 'DLI-SHZM Local (15 min)' },
      { id: 'SHZM_ANVR_LOCAL', from: 'SHZM', to: 'ANVR', label: 'Local', color: { color: '#ffc107' }, width: 1, title: 'SHZM-ANVR Local (20 min)' },
      
      // Direct connection for enhanced schedule routes
      { id: 'NDLS_SHZM_DIRECT', from: 'NDLS', to: 'SHZM', label: 'Direct', color: { color: '#17a2b8' }, width: 2, title: 'NDLS-SHZM Direct (12 min)' },
    ]);

    return { nodes, edges };
  };

  // Helper function to get edge geometry from vis-network
  const getVisualEdgeGeometry = (fromStationId, toStationId) => {
    if (!networkInstance.current?.body?.edges) return null;
    
    try {
      // Get the vis-network body for accessing edge geometry
      const network = networkInstance.current;
      
      // Normalize station IDs for edge lookup
      const normalizedFrom = normalizeStationId(fromStationId);
      const normalizedTo = normalizeStationId(toStationId);
      
      // Try different edge ID patterns to find the correct edge
      const possibleEdgeIds = [
        `${normalizedFrom}_${normalizedTo}_MAIN`,
        `${normalizedTo}_${normalizedFrom}_MAIN`,
        `${normalizedFrom}_${normalizedTo}_ALT`,
        `${normalizedTo}_${normalizedFrom}_ALT`,
        `${normalizedFrom}_${normalizedTo}`,
        `${toStationId}_${fromStationId}`
      ];
      
      let targetEdgeId = null;
      let edgeObject = null;
      
      // First try to find edge by ID pattern
      for (const edgeId of possibleEdgeIds) {
        if (network.body.edges[edgeId]) {
          targetEdgeId = edgeId;
          edgeObject = network.body.edges[edgeId];
          break;
        }
      }
      
      // If not found, search through all edges with normalized IDs
      if (!edgeObject) {
        for (const [edgeId, edge] of Object.entries(network.body.edges)) {
          const edgeData = network.body.data.edges.get(edgeId);
          if (edgeData && 
              ((edgeData.from === normalizedFrom && edgeData.to === normalizedTo) ||
               (edgeData.from === normalizedTo && edgeData.to === normalizedFrom))) {
            targetEdgeId = edgeId;
            edgeObject = edge;
            break;
          }
        }
      }
      
      if (!edgeObject) {
        // Only log occasionally to reduce console spam
        if (Math.random() < 0.02) { // 2% of the time
          console.warn(`No edge found between ${fromStationId} and ${toStationId}`);
        }
        return null;
      }
      
      // Get the connected nodes
      const fromNode = network.body.nodes[edgeObject.fromId];
      const toNode = network.body.nodes[edgeObject.toId];
      
      if (!fromNode || !toNode) {
        console.warn(`Missing nodes for edge ${targetEdgeId}`);
        return null;
      }
      
      // Determine correct direction based on normalized station IDs
      const isForward = edgeObject.fromId === normalizedFrom;
      
      return {
        from: { x: fromNode.x, y: fromNode.y },
        to: { x: toNode.x, y: toNode.y },
        edgeId: targetEdgeId,
        isForward
      };
    } catch (error) {
      console.warn('Error getting edge geometry:', error);
      return null;
    }
  };

  // Helper function to normalize station IDs for network graph compatibility
  const normalizeStationId = (stationId) => {
    const stationMapping = {
      'Anand_Vihar': 'ANVR',
      'Ghaziabad': 'GZB', 
      'New_Delhi': 'NDLS',
      'Sahibabad': 'SBB',
      'Vivek_Vihar': 'VVB',
      'Shaheed_Nagar': 'SHZM',
      'Old_Delhi': 'DLI',
      'Meerut': 'MUT'
    };
    return stationMapping[stationId] || stationId;
  };

  // Function to get station position from vis-network
  const getStationVisualPosition = (stationId) => {
    if (!networkInstance.current) return null;
    
    try {
      const network = networkInstance.current;
      const normalizedId = normalizeStationId(stationId);
      const node = network.body.nodes[normalizedId];
      
      if (node) {
        return { x: node.x, y: node.y };
      }
    } catch (error) {
      console.warn('Error getting station position:', error);
    }
    
    return null;
  };

  // COMPREHENSIVE: Track-following positioning for all simulations
  const getTrainPosition = (train) => {
    // Determine start and end times from schedule data for progress calculation
    let startTime, endTime;
    if (train.route && train.route.length >= 2) {
      const firstStop = train.route[0];
      const lastStop = train.route[train.route.length - 1];
      if (!firstStop.Departure_Time || !lastStop.Arrival_Time) return { x: 0, y: 0 };
      startTime = new Date(firstStop.Departure_Time);
      endTime = new Date(lastStop.Arrival_Time);
    } else {
      if (!train.Scheduled_Departure_Time || !train.Scheduled_Arrival_Time) return { x: 0, y: 0 };
      startTime = new Date(train.Scheduled_Departure_Time);
      endTime = new Date(train.Scheduled_Arrival_Time);
    }

    if (train.Initial_Reported_Delay_Mins > 0) {
      startTime.setMinutes(startTime.getMinutes() + train.Initial_Reported_Delay_Mins);
      endTime.setMinutes(endTime.getMinutes() + train.Initial_Reported_Delay_Mins);
    }

    // Calculate finite progress (0 before start, 1 after end)
    let progress = 0;
    if (simulationTime && startTime < endTime) {
      if (simulationTime >= endTime) progress = 1;
      else if (simulationTime > startTime) {
        progress = (simulationTime.getTime() - startTime.getTime()) / (endTime.getTime() - startTime.getTime());
      }
    }

    // Get the actual route path from train data or determine best visual route
    const routePath = getVisualRoutePath(train, currentStrategy);
    if (!routePath || routePath.length === 0) {
      return { x: 0, y: 0 };
    }

    // Calculate position along the visual route path
    return interpolateAlongVisualRoute(routePath, progress);
  };

  // Get the visual route path that trains should follow
  const getVisualRoutePath = (train, strategy) => {
    // Priority 1: Use backend-computed visual route path if available
    if (train.visual_route_path && train.visual_route_path.length >= 2) {
      return train.visual_route_path.map(station => normalizeStationId(station));
    }

    // Priority 2: Use train's schedule route if multi-stop
    if (train.route && train.route.length >= 2) {
      const routeStations = train.route.map(stop => normalizeStationId(stop.Station_ID));
      if (routeStations.length > 2) {
        return routeStations;
      }
    }

    // Priority 3: Determine route based on strategy and available visual tracks
    const fromStation = normalizeStationId(train.Section_Start || (train.route && train.route[0]?.Station_ID));
    const toStation = normalizeStationId(train.Section_End || (train.route && train.route[train.route.length - 1]?.Station_ID));
    
    if (!fromStation || !toStation) return [];
    
    return getStrategySpecificRoute(fromStation, toStation, strategy);
  };

  // Get route based on strategy and visual network availability
  const getStrategySpecificRoute = (fromStation, toStation, strategy) => {
    // Try to find available visual edges between stations
    const directEdge = getVisualEdgeGeometry(fromStation, toStation);
    
    // Strategy-specific route selection
    if (strategy === 'throughput') {
      // Throughput: Prefer direct routes when available
      if (directEdge) {
        return [fromStation, toStation];
      }
    } else if (strategy === 'punctuality') {
      // Punctuality: Try alternative routes for variety
      const alternativeRoutes = getAlternativeVisualRoutes(fromStation, toStation);
      if (alternativeRoutes.length > 0) {
        // Use first alternative route
        return alternativeRoutes[0];
      }
    }
    
    // Default/Balanced: Use main route via intermediate stations
    if (fromStation === 'NDLS' && toStation === 'GZB') {
      return ['NDLS', 'ANVR', 'GZB'];
    } else if (fromStation === 'GZB' && toStation === 'NDLS') {
      return ['GZB', 'ANVR', 'NDLS'];
    } else if (fromStation === 'MUT' && toStation === 'NDLS') {
      return ['MUT', 'GZB', 'ANVR', 'NDLS'];
    } else if (fromStation === 'NDLS' && toStation === 'MUT') {
      return ['NDLS', 'ANVR', 'GZB', 'MUT'];
    }
    
    // Fallback to direct route
    return [fromStation, toStation];
  };

  // Get alternative visual routes between stations
  const getAlternativeVisualRoutes = (fromStation, toStation) => {
    const alternatives = [];
    
    if (fromStation === 'NDLS' && toStation === 'GZB') {
      // Check if alternative route tracks exist visually
      if (getVisualEdgeGeometry('NDLS', 'SBB') && getVisualEdgeGeometry('SBB', 'GZB')) {
        alternatives.push(['NDLS', 'SBB', 'GZB']);
      }
      if (getVisualEdgeGeometry('NDLS', 'SHZM') && getVisualEdgeGeometry('SHZM', 'ANVR') && getVisualEdgeGeometry('ANVR', 'GZB')) {
        alternatives.push(['NDLS', 'SHZM', 'ANVR', 'GZB']);
      }
    }
    
    return alternatives;
  };

  // Interpolate position along a multi-station visual route
  const interpolateAlongVisualRoute = (routeStations, progress) => {
    if (routeStations.length < 2) return { x: 0, y: 0 };
    if (routeStations.length === 2) {
      // Simple two-station route
      const edgeGeometry = getVisualEdgeGeometry(routeStations[0], routeStations[1]);
      if (edgeGeometry) {
        return interpolateOnEdge(edgeGeometry, progress);
      }
      // Fallback to straight line
      const fromPos = getStationVisualPosition(routeStations[0]);
      const toPos = getStationVisualPosition(routeStations[1]);
      if (fromPos && toPos) {
        return {
          x: fromPos.x + (toPos.x - fromPos.x) * progress,
          y: fromPos.y + (toPos.y - fromPos.y) * progress,
        };
      }
      return { x: 0, y: 0 };
    }

    // Multi-station route: determine which leg we're on
    const numLegs = routeStations.length - 1;
    const legIndex = Math.floor(progress * numLegs);
    const adjustedLegIndex = Math.min(legIndex, numLegs - 1);
    const legProgress = (progress * numLegs) - adjustedLegIndex;
    
    const currentStation = routeStations[adjustedLegIndex];
    const nextStation = routeStations[adjustedLegIndex + 1];
    
    // Follow the visual edge for this leg
    const edgeGeometry = getVisualEdgeGeometry(currentStation, nextStation);
    if (edgeGeometry) {
      return interpolateOnEdge(edgeGeometry, legProgress);
    }
    
    // Fallback to straight line between stations
    const fromPos = getStationVisualPosition(currentStation);
    const toPos = getStationVisualPosition(nextStation);
    if (fromPos && toPos) {
      return {
        x: fromPos.x + (toPos.x - fromPos.x) * legProgress,
        y: fromPos.y + (toPos.y - fromPos.y) * legProgress,
      };
    }
    
    return getStationVisualPosition(currentStation) || { x: 0, y: 0 };
  };

  // Helper to interpolate position on a visual edge (re-add this)
  const interpolateOnEdge = (edgeGeometry, progress) => {
    const network = networkInstance.current;
    if (network && edgeGeometry) {
      const edgeObject = network.body.edges[edgeGeometry.edgeId];
      if (edgeObject?.edgeType?.getPoint) {
        try {
          const point = edgeObject.edgeType.getPoint(progress);
          if (point?.x !== undefined) return point;
        } catch (e) { /* silent */ }
      }
      return {
        x: edgeGeometry.from.x + (edgeGeometry.to.x - edgeGeometry.from.x) * progress,
        y: edgeGeometry.from.y + (edgeGeometry.to.y - edgeGeometry.from.y) * progress,
      };
    }
    return { x: 0, y: 0 };
  };

  // SIMPLE: Update train visualization - just follow the tracks!
  const updateTrainVisualization = () => {
    if (!networkInstance.current || !simulationTrains || simulationTrains.length === 0) {
      return;
    }

    const nodes = networkInstance.current.body.data.nodes;
    
    // Clear existing train nodes
    const existingTrainIds = nodes.get().filter(node => node.id.startsWith('train_')).map(node => node.id);
    if (existingTrainIds.length > 0) {
      nodes.remove(existingTrainIds);
    }

    // Add trains based on schedule data
    const trainNodesToAdd = simulationTrains.map(train => {
      const trainId = `train_${train.Train_ID}`;
      
      // Get position along the vis-network track
      const visualPosition = getTrainPosition(train);
      
      // Get strategy-specific train styling
      const getTrainStyleByStrategy = (strategy, status) => {
        // Base colors by status
        const statusColors = {
          'Scheduled': { background: '#6c757d', border: '#495057' },
          'En-Route': { background: '#28a745', border: '#198754' },
          'Delayed': { background: '#ffc107', border: '#e0a800' },
          'Stopped': { background: '#17a2b8', border: '#138496' },
          'Arrived': { background: '#007bff', border: '#0056b3' },
        };

        // Strategy-specific modifications with distinct pathfinding algorithms
        const baseColor = statusColors[status] || { background: '#dc3545', border: '#b02a37' };
        
        switch (strategy) {
          case 'balanced':
            return {
              ...baseColor,
              emoji: '🚂', // Steam locomotive for balanced approach (Dijkstra - optimal)
              size: 16,
              borderWidth: 2,
              shadow: { enabled: true, color: 'rgba(40, 167, 69, 0.4)', size: 4 },
              algorithm: 'Dijkstra (Optimal)'
            };
          case 'punctuality':
            return {
              background: '#6f42c1', // Purple for punctuality
              border: '#5a2d91',
              emoji: '🚄', // High-speed train for punctuality first (A* - fast optimal)
              size: 18,
              borderWidth: 3,
              shadow: { enabled: true, color: 'rgba(111, 66, 193, 0.5)', size: 5 },
              algorithm: 'A* (Fast Optimal)'
            };
          case 'throughput':
            return {
              background: '#fd7e14', // Orange for maximum throughput
              border: '#e8630a',
              emoji: '🚅', // Bullet train for max throughput (Greedy - fast decisions)
              size: 20,
              borderWidth: 2,
              shadow: { enabled: true, color: 'rgba(253, 126, 20, 0.6)', size: 6 },
              algorithm: 'Greedy (Fast Decision)'
            };
          default:
            return {
              ...baseColor,
              emoji: '🚆', // Regular train for normal simulation
              size: 16,
              borderWidth: 2,
              shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.3)', size: 3 },
              algorithm: 'Standard'
            };
        }
      };

      // Simple tooltip
      const createTooltip = (trainStyle) => {
        let tooltip = `🚆 ${train.Train_ID}\n`;
        tooltip += `Type: ${train.Train_Type || 'Unknown'}\n`;
        
        if (currentStrategy) {
          tooltip += `Strategy: ${currentStrategy.charAt(0).toUpperCase() + currentStrategy.slice(1)}\n`;
          if (trainStyle.algorithm) {
            tooltip += `Pathfinding: ${trainStyle.algorithm}\n`;
          }
        }
        
        // Show route
        if (train.route && train.route.length >= 2) {
          const origin = train.route[0];
          const destination = train.route[train.route.length - 1];
          tooltip += `Route: ${origin.Station_Name || origin.Station_ID} → ${destination.Station_Name || destination.Station_ID}\n`;
        } else if (train.Section_Start && train.Section_End) {
          tooltip += `Route: ${train.Section_Start} → ${train.Section_End}\n`;
        }
        
        if (train.Initial_Reported_Delay_Mins > 0) {
          tooltip += `Delay: ${train.Initial_Reported_Delay_Mins}min`;
        }
        
        return tooltip;
      };

      // Get strategy-specific styling
      const status = train.Initial_Reported_Delay_Mins > 0 ? 'Delayed' : 'En-Route';
      const trainStyle = getTrainStyleByStrategy(currentStrategy, status);
      
      return {
        id: trainId,
        label: trainStyle.emoji,
        x: visualPosition.x,
        y: visualPosition.y,
        group: 'train',
        color: { 
          background: trainStyle.background, 
          border: trainStyle.border 
        },
        title: createTooltip(trainStyle),
        physics: false,
        shape: 'circle',
        size: trainStyle.size,
        font: { 
          size: Math.max(12, trainStyle.size - 4), 
          color: 'white',
          face: 'monospace'
        },
        borderWidth: trainStyle.borderWidth,
        shadow: trainStyle.shadow
      };
    });

    nodes.add(trainNodesToAdd);
  };

  // Legacy function for backward compatibility (now deprecated)
  const addTrainNodes = (nodes, trains) => {
    if (!trains) return;

    Object.values(trains).forEach(train => {
      const trainId = `train_${train.train_id}`;
      
      // Determine train position based on current location and route
      const position = getTrainPosition(train);
      
      nodes.add({
        id: trainId,
        label: train.train_id.split('_')[0],
        x: position.x,
        y: position.y,
        group: 'train',
        title: `${train.train_name}\nStatus: ${train.status}\nDelay: ${train.current_delay_mins}min\nRoute: ${train.section_start} → ${train.section_end}`,
        physics: false, // Trains don't participate in physics simulation
      });
    });
  };


  // Network configuration options
  const getNetworkOptions = () => ({
    nodes: {
      shape: 'dot',
      size: 12,
      font: {
        size: 10,
        color: '#212529',
        face: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      },
      borderWidth: 1,
      shadow: {
        enabled: false, // Disable shadows for better performance
      },
    },
    edges: {
      font: {
        size: 8,
        color: '#495057',
        strokeWidth: 1,
        strokeColor: '#ffffff',
        align: 'middle'
      },
      smooth: {
        enabled: false, // Disable smooth edges for better performance
      },
      shadow: {
        enabled: false, // Disable shadows for better performance
      },
    },
    groups: {
      major_junction: {
        color: { background: '#212529', border: '#495057' },
        size: 18,
        shape: 'diamond',
      },
      terminal: {
        color: { background: '#6c757d', border: '#495057' },
        size: 15,
        shape: 'square',
      },
      junction: {
        color: { background: '#28a745', border: '#198754' },
        size: 14,
        shape: 'triangle',
      },
      intermediate: {
        color: { background: '#ffc107', border: '#e0a800' },
        size: 12,
        shape: 'circle',
      },
      small: {
        color: { background: '#dee2e6', border: '#6c757d' },
        size: 10,
        shape: 'circle',
      },
      destination: {
        color: { background: '#6c757d', border: '#495057' },
        size: 16,
        shape: 'star',
      },
      train: {
        color: { 
          background: '#dc3545', 
          border: '#b02a37',
          highlight: { background: '#e35d6a', border: '#dc3545' },
        },
        size: 10,
        shape: 'triangle',
        font: { size: 8, color: '#ffffff' },
      },
    },
    physics: {
      enabled: false, // Disable physics for fixed layout
    },
    interaction: {
      dragNodes: false,
      zoomView: true,
      dragView: true,
      hover: true,
    },
    layout: {
      improvedLayout: false,
    },
    autoResize: true,
    height: '100%',
    width: '100%',
  });

  // Initialize network
  useEffect(() => {
    if (networkContainer.current) {
      const { nodes, edges } = getNetworkData();
      
      console.log('Initializing network with:', nodes.length, 'nodes and', edges.length, 'edges');
      
      // Add trains if available
      if (networkState?.trains) {
        addTrainNodes(nodes, networkState.trains);
        console.log('Added train nodes:', Object.keys(networkState.trains || {}).length);
      }

      const data = { nodes, edges };
      const options = getNetworkOptions();

      try {
        networkInstance.current = new Network(networkContainer.current, data, options);

        // Event handlers
        networkInstance.current.on('click', (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            console.log('Clicked node:', nodeId);
            
            // Check if clicked node is a train
            if (nodeId.startsWith('train_')) {
              const trainId = nodeId.replace('train_', '');
              const train = simulationTrains.find(t => t.Train_ID === trainId);
              if (train) {
                setSelectedTrain(train);
                console.log('Selected train:', train);
              }
            } else {
              // Clicked on a station or other node - close train details
              setSelectedTrain(null);
            }
          } else {
            // Clicked on empty space - close train details
            setSelectedTrain(null);
          }
        });

        // Wait for the network to be fully ready before fitting
        networkInstance.current.once('afterDrawing', () => {
          console.log('Main network ready, fitting view');
          if (networkInstance.current && typeof networkInstance.current.fit === 'function') {
            try {
              networkInstance.current.fit({
                animation: {
                  duration: 1000,
                  easingFunction: 'easeInOutQuad'
                }
              });
            } catch (fitError) {
              console.error('Error fitting network:', fitError);
              // Fallback: try simple fit without animation
              try {
                networkInstance.current.fit();
              } catch (simpleFitError) {
                console.error('Simple fit also failed:', simpleFitError);
              }
            }
          }
        });

        console.log('Network initialized successfully');
      } catch (error) {
        console.error('Failed to initialize network:', error);
      }
    }

    return () => {
      if (networkInstance.current) {
        networkInstance.current.destroy();
        networkInstance.current = null;
      }
    };
  }, []);

  // Update network edges when track status changes (for failure visualization)
  useEffect(() => {
    if (networkInstance.current && networkData) {
      const { edges } = getNetworkData();
      const edgeDataSet = networkInstance.current.body.data.edges;
      
      // Update existing edges with new styling (failure states)
      Object.entries(networkData.tracks || {}).forEach(([trackId, track]) => {
        try {
          const isDisabled = track.status === 'disabled';
          const isHighPriority = track.priority === 'high';
          
          let edgeColor, edgeWidth, edgeDashes, edgeLabel;
          
          if (isDisabled) {
            edgeColor = { color: '#dc3545', highlight: '#b02a37' };
            edgeWidth = 3;
            edgeDashes = [10, 5];
            edgeLabel = `❌ ${track.travel_time_minutes}min (FAILED)`;
          } else {
            edgeColor = { color: isHighPriority ? '#495057' : '#6c757d' };
            edgeWidth = isHighPriority ? 2 : 1;
            edgeDashes = track.track_type === 'single_line' ? [5, 5] : false;
            edgeLabel = `${track.travel_time_minutes}min`;
          }
          
          let title = `${trackId} (${track.travel_time_minutes} min)\n${track.track_type}`;
          if (track.max_speed_kmh) {
            title += `, ${track.max_speed_kmh} km/h`;
          }
          if (isDisabled) {
            title += `\n🚫 TRACK FAILED: ${track.disable_reason || 'Unknown reason'}`;
            if (track.disabled_timestamp) {
              title += `\nFailed at: ${new Date(track.disabled_timestamp).toLocaleString()}`;
            }
          }
          
          edgeDataSet.update({
            id: trackId,
            color: edgeColor,
            width: edgeWidth,
            dashes: edgeDashes,
            label: edgeLabel,
            title: title,
            font: isDisabled ? { 
              color: '#dc3545', 
              size: 10, 
              strokeWidth: 2, 
              strokeColor: '#ffffff',
              align: 'middle'
            } : {
              size: 8,
              color: '#495057',
              strokeWidth: 1,
              strokeColor: '#ffffff',
              align: 'middle'
            }
          });
          
        } catch (error) {
          // Edge might not exist in the dataset, skip silently
        }
      });
    }
  }, [networkData?.tracks]); // Re-run when track data changes

  // Update train positions during live simulation
  useEffect(() => {
    // Only update if network is fully initialized
    if (networkInstance.current && networkInstance.current.body && networkInstance.current.body.nodes) {
      updateTrainVisualization();
    }
  }, [simulationTrains, simulationTime]);

  // Legacy train position updates (for backward compatibility)
  useEffect(() => {
    if (networkInstance.current && networkState?.trains) {
      const { nodes } = networkInstance.current.body.data;
      
      // Update existing train positions
      Object.values(networkState.trains).forEach(train => {
        const trainId = `train_${train.train_id}`;
        const position = getTrainPosition(train);
        
        try {
          nodes.update({
            id: trainId,
            x: position.x,
            y: position.y,
            title: `${train.train_name}\nStatus: ${train.status}\nDelay: ${train.current_delay_mins}min\nRoute: ${train.section_start} → ${train.section_end}`,
          });
        } catch (error) {
          // Node doesn't exist, add it
          nodes.add({
            id: trainId,
            label: train.train_id.split('_')[0],
            x: position.x,
            y: position.y,
            group: 'train',
            title: `${train.train_name}\nStatus: ${train.status}\nDelay: ${train.current_delay_mins}min\nRoute: ${train.section_start} → ${train.section_end}`,
            physics: false,
          });
        }
      });
    }
  }, [networkState, isSimulationRunning]);


  // Mouse position tracking for floating panels
  useEffect(() => {
    if (!isFullscreen) return;

    const handleMouseMove = (e) => {
      const threshold = 80; // pixels from edge
      const panelWidth = 320; // width of the panels when visible
      const windowWidth = window.innerWidth;
      
      // Show left panel when mouse is near left edge or over the panel
      setShowLeftPanel(e.clientX < threshold || (showLeftPanel && e.clientX < panelWidth));
      
      // Show right panel when mouse is near right edge or over the panel
      setShowRightPanel(e.clientX > windowWidth - threshold || (showRightPanel && e.clientX > windowWidth - panelWidth));
    };

    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isFullscreen, showLeftPanel, showRightPanel]);

  // Control functions
  const handleZoomIn = () => {
    if (networkInstance.current && typeof networkInstance.current.getScale === 'function') {
      try {
        const scale = networkInstance.current.getScale();
        networkInstance.current.moveTo({ scale: scale * 1.2 });
      } catch (error) {
        console.error('Zoom in failed:', error);
      }
    }
  };

  const handleZoomOut = () => {
    if (networkInstance.current && typeof networkInstance.current.getScale === 'function') {
      try {
        const scale = networkInstance.current.getScale();
        networkInstance.current.moveTo({ scale: scale * 0.8 });
      } catch (error) {
        console.error('Zoom out failed:', error);
      }
    }
  };

  const handleReset = () => {
    if (networkInstance.current && typeof networkInstance.current.fit === 'function') {
      try {
        networkInstance.current.fit();
      } catch (error) {
        console.error('Reset view failed:', error);
      }
    }
  };

  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    if (onFullscreenChange) {
      onFullscreenChange(newFullscreenState);
    }
  };

  return (
    <div className={`relative ${isFullscreen ? 'h-full bg-white' : 'h-full max-h-full overflow-hidden'}`}>
      {/* Header - Only show when not in fullscreen */}
      {!isFullscreen && (
        <div className="flex items-center justify-between p-2 border-b border-rail-gray">
          <h3 className="text-xs font-semibold text-rail-text">Railway Network Visualization</h3>
          
          {/* Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-rail-gray rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3 text-rail-text" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-rail-gray rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3 text-rail-text" />
            </button>
            <button
              onClick={handleReset}
              className="p-1 hover:bg-rail-gray rounded transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-3 h-3 text-rail-text" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1 hover:bg-rail-gray rounded transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3 text-rail-text" /> : <Maximize2 className="w-3 h-3 text-rail-text" />}
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Controls */}
      {isFullscreen && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center space-x-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-rail-gray">
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-rail-gray rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3 text-rail-text" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-rail-gray rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3 text-rail-text" />
          </button>
          <button
            onClick={handleReset}
            className="p-1 hover:bg-rail-gray rounded transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-3 h-3 text-rail-text" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1 hover:bg-rail-gray rounded transition-colors"
            title="Exit Fullscreen"
          >
            <Minimize2 className="w-3 h-3 text-rail-text" />
          </button>
        </div>
      )}

      {/* Network Container */}
      <div 
        ref={networkContainer} 
        className={`bg-white ${isFullscreen ? 'h-full' : 'h-[calc(100%-40px)]'}`}
        style={{ 
          width: '100%',
          maxHeight: isFullscreen ? '100%' : 'calc(100% - 40px)',
          position: 'relative',
          overflow: 'hidden'
        }}
      />

      {/* Legend */}
      <div className="absolute bottom-2 left-2 rail-card p-2 max-w-xs">
        <h4 className="text-xs font-semibold mb-1 text-rail-text">Legend</h4>
        <div className="grid grid-cols-2 gap-1 text-xs text-rail-text">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-rail-light-blue rounded-full"></div>
            <span>Major Junction</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-rail-accent rounded-sm"></div>
            <span>Terminal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-rail-success rounded-full"></div>
            <span>Junction</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-rail-warning rounded-full"></div>
            <span>Intermediate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent border-b-rail-danger"></div>
            <span>Active Train</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-rail-light-blue"></div>
            <span>Main Track</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-rail-danger" style={{borderStyle: 'dashed', borderWidth: '1px 0'}}></div>
            <span>Failed Track</span>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      {(networkState || simulationTrains.length > 0) && (
        <div className="absolute top-16 right-2 rail-card p-2">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-rail-blue">Active Trains:</span>
              <span className="text-rail-accent font-medium">
                {simulationTrains.length > 0 ? simulationTrains.length : Object.keys(networkState?.trains || {}).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-rail-blue">Simulation:</span>
              <span className={`font-medium ${isSimulationRunning ? 'text-rail-success' : 'text-rail-gray'}`}>
                {isSimulationRunning ? 'Running' : 'Paused'}
              </span>
            </div>
            {simulationTime && (
              <div className="flex justify-between">
                <span className="text-rail-blue">Sim Time:</span>
                <span className="text-rail-accent font-medium text-xs">
                  {simulationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hover indicators for fullscreen */}
      {isFullscreen && (
        <>
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-rail-text-secondary text-xs opacity-30 pointer-events-none">
            ← Hover for Controls
          </div>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-rail-text-secondary text-xs opacity-30 pointer-events-none">
            Hover for Alerts →
          </div>
        </>
      )}

      {/* Floating Left Panel - Control Panel */}
      {isFullscreen && leftPanelContent && (
        <div className={`absolute left-0 top-0 h-full w-80 bg-white/95 backdrop-blur-sm border-r border-rail-gray shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          showLeftPanel ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="h-full overflow-y-auto p-4">
            {leftPanelContent}
          </div>
        </div>
      )}

      {/* Floating Right Panel - Alerts */}
      {isFullscreen && rightPanelContent && (
        <div className={`absolute right-0 top-0 h-full w-96 bg-white/95 backdrop-blur-sm border-l border-rail-gray shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          showRightPanel ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="h-full overflow-y-auto p-4">
            {rightPanelContent}
          </div>
        </div>
      )}

      {/* Train Journey Progress Overlay */}
      {selectedTrain && (
        <div className="absolute bottom-4 left-4 w-80 z-40">
          <div className="relative">
            <button
              onClick={() => setSelectedTrain(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-rail-danger text-white rounded-full flex items-center justify-center text-xs hover:bg-rail-danger/90 transition-colors z-50"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
            <JourneyProgress train={selectedTrain} />
          </div>
        </div>
      )}

    </div>
  );
};

export default NetworkGraph;
