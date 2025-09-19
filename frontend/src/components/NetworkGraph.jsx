import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

const NetworkGraph = ({ networkState, isSimulationRunning }) => {
  const networkContainer = useRef(null);
  const networkInstance = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [trainPositions, setTrainPositions] = useState({});

  // Network graph data (stations and tracks) - loaded from your network_graph.json structure
  const getNetworkData = () => {
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
    ]);

    return { nodes, edges };
  };

  // Add train nodes to the visualization
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

  // Calculate train position based on its current state
  const getTrainPosition = (train) => {
    const stationPositions = {
      'NDLS': { x: 0, y: 0 },
      'ANVR': { x: 300, y: -50 },
      'GZB': { x: 600, y: 0 },
      'SBB': { x: 500, y: 150 },
      'VVB': { x: 300, y: 100 },
      'SHZM': { x: 150, y: 75 },
      'DLI': { x: -100, y: 50 },
      'MUT': { x: 800, y: -100 },
      'Anand_Vihar': { x: 300, y: -50 },
      'Ghaziabad': { x: 600, y: 0 },
      'Aligarh': { x: 900, y: 100 },
    };

    const start = stationPositions[train.section_start] || stationPositions[train.current_location] || { x: 0, y: 0 };
    const end = stationPositions[train.section_end] || { x: 100, y: 0 };

    // Simple animation: move train along the route based on simulation time
    const progress = isSimulationRunning ? 
      ((Date.now() / 10000) % 1) : // Complete route every 10 seconds during simulation
      0; // Static position when not simulating

    return {
      x: start.x + (end.x - start.x) * progress + Math.random() * 20 - 10, // Add slight randomness
      y: start.y + (end.y - start.y) * progress + Math.random() * 20 - 10,
    };
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

  // Update train positions during simulation
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
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-40 bg-rail-darker' : 'h-full max-h-full overflow-hidden'}`}>
      {/* Header */}
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

      {/* Network Container */}
      <div 
        ref={networkContainer} 
        className={`bg-white ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-[calc(100%-40px)]'}`}
        style={{ 
          width: '100%',
          maxHeight: isFullscreen ? 'calc(100vh - 80px)' : 'calc(100% - 40px)',
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
        </div>
      </div>

      {/* Status Indicator */}
      {networkState && (
        <div className="absolute top-16 right-2 rail-card p-2">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-rail-blue">Active Trains:</span>
              <span className="text-rail-accent font-medium">
                {Object.keys(networkState.trains || {}).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-rail-blue">Simulation:</span>
              <span className={`font-medium ${isSimulationRunning ? 'text-rail-success' : 'text-rail-gray'}`}>
                {isSimulationRunning ? 'Running' : 'Paused'}
              </span>
            </div>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleFullscreen}
            className="rail-button-secondary px-3 py-2"
          >
            Exit Fullscreen
          </button>
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;
