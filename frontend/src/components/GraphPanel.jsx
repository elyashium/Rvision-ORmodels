import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-data';
import { FiDownload, FiMaximize2, FiInfo } from 'react-icons/fi';
import clsx from 'clsx';

const GraphPanel = ({ title, graph, type, metadata }) => {
  const networkRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!graph || !networkRef.current) return;

    // Prepare nodes and edges for vis-network
    const nodes = new DataSet(
      graph.nodes?.map(node => ({
        id: node.id,
        label: node.label || node.id,
        color: getNodeColor(node.type),
        shape: getNodeShape(node.type),
        x: node.x,
        y: node.y,
        physics: false
      })) || []
    );

    const edges = new DataSet(
      graph.edges?.map(edge => ({
        id: edge.id || `${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        label: edge.travel_time ? `${edge.travel_time}min` : '',
        color: getEdgeColor(edge.status),
        width: edge.status === 'failed' ? 3 : 2,
        dashes: edge.status === 'failed',
        arrows: 'to'
      })) || []
    );

    const data = { nodes, edges };

    const options = {
      physics: {
        enabled: false
      },
      interaction: {
        hover: true,
        zoomView: true,
        dragView: true
      },
      nodes: {
        font: {
          size: 14,
          color: '#333333'
        },
        borderWidth: 2,
        borderWidthSelected: 3
      },
      edges: {
        font: {
          size: 12,
          color: '#666666',
          strokeWidth: 3,
          strokeColor: '#ffffff'
        },
        smooth: {
          type: 'cubicBezier',
          roundness: 0.4
        }
      }
    };

    // Create network
    const net = new Network(networkRef.current, data, options);

    // Add train animations if routes exist
    if (graph.routes) {
      animateTrains(net, graph.routes);
    }

    return () => {
      if (net) {
        net.destroy();
      }
    };
  }, [graph]);

  const getNodeColor = (type) => {
    const colors = {
      junction: '#3b82f6',
      terminal: '#10b981',
      station: '#8b5cf6',
      intermediate: '#f59e0b'
    };
    return colors[type] || '#6b7280';
  };

  const getNodeShape = (type) => {
    const shapes = {
      junction: 'dot',
      terminal: 'square',
      station: 'triangle',
      intermediate: 'diamond'
    };
    return shapes[type] || 'dot';
  };

  const getEdgeColor = (status) => {
    const colors = {
      operational: '#10b981',
      delayed: '#f59e0b',
      failed: '#ef4444',
      maintenance: '#6b7280'
    };
    return colors[status] || '#3b82f6';
  };

  const animateTrains = (network, routes) => {
    // Simple train animation logic
    routes.forEach((route, index) => {
      if (route.path && route.path.length > 1) {
        const trainNode = {
          id: `train-${route.train_id}`,
          label: route.train_id,
          shape: 'box',
          color: route.status === 'delayed' ? '#f59e0b' : '#3b82f6',
          size: 10
        };
        
        // Add train node at first position
        const positions = network.getPositions([route.path[0]]);
        if (positions[route.path[0]]) {
          trainNode.x = positions[route.path[0]].x;
          trainNode.y = positions[route.path[0]].y;
          network.body.data.nodes.add(trainNode);
        }
      }
    });
  };

  const downloadGraph = () => {
    if (!graph) return;
    
    const dataStr = JSON.stringify(graph, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = metadata?.filename || `graph_${type}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getStatusBadge = () => {
    if (!graph) return null;
    
    const scenario = graph.meta?.scenario || metadata?.scenario;
    const colors = {
      baseline: 'bg-gray-500',
      delay: 'bg-warning',
      failure: 'bg-danger',
      priority: 'bg-primary-500'
    };
    
    return (
      <span className={clsx(
        'px-2 py-1 text-xs font-semibold text-white rounded',
        colors[scenario] || 'bg-gray-400'
      )}>
        {scenario?.toUpperCase()}
      </span>
    );
  };

  return (
    <div className={clsx(
      'bg-white dark:bg-dark-surface rounded-lg shadow-lg overflow-hidden transition-all duration-300',
      isFullscreen && 'fixed inset-4 z-50'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-dark-border">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadGraph}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Download JSON"
          >
            <FiDownload className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Fullscreen"
          >
            <FiMaximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div className="relative">
        <div
          ref={networkRef}
          className={clsx(
            'w-full bg-gray-50 dark:bg-gray-800',
            isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-96'
          )}
        />
        
        {!graph && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <FiInfo className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No graph data available</p>
              <p className="text-xs mt-1">Run optimization to generate</p>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Footer */}
      {graph?.meta && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t dark:border-dark-border text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <span>Generated: {new Date(graph.meta.generated_at).toLocaleString()}</span>
            {graph.meta.statistics && (
              <span>
                Trains: {graph.trains?.length || 0} | 
                Delays: {graph.meta.statistics.delayed_trains || 0}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphPanel;
