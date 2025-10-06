import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

const SimpleNetworkTest = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      // Simple test data
      const nodes = new DataSet([
        { id: 1, label: 'Station A', x: 0, y: 0 },
        { id: 2, label: 'Station B', x: 200, y: 0 },
        { id: 3, label: 'Station C', x: 100, y: 100 }
      ]);

      const edges = new DataSet([
        { from: 1, to: 2, label: 'Track 1' },
        { from: 2, to: 3, label: 'Track 2' },
        { from: 1, to: 3, label: 'Track 3' }
      ]);

      const data = { nodes, edges };
      const options = {
        physics: { enabled: false },
        nodes: {
          color: { background: '#3b82f6', border: '#1e40af' },
          font: { color: '#ffffff' }
        },
        edges: {
          color: { color: '#06b6d4' }
        }
      };

      try {
        const network = new Network(containerRef.current, data, options);
        console.log('Simple network created successfully');
        
        // Wait for the network to be fully ready before fitting
        network.once('afterDrawing', () => {
          console.log('Simple network ready, fitting view');
          if (network && typeof network.fit === 'function') {
            network.fit();
          }
        });

        return () => {
          if (network) {
            network.destroy();
          }
        };
      } catch (error) {
        console.error('Failed to create simple network:', error);
      }
    }
  }, []);

  return (
    <div className="w-full h-96 bg-gray-800 border border-gray-600 rounded">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default SimpleNetworkTest;
