import React from 'react';
import { FiX } from 'react-icons/fi';
import useGraphStore from '../stores/graphStore';

const ComparisonOverlay = () => {
  const { toggleComparison, selectedGraphs, originalGraph, optimizedGraphs } = useGraphStore();

  const getGraphByType = (type) => {
    if (type === 'original') return originalGraph;
    return optimizedGraphs[type];
  };

  const calculateDifferences = () => {
    if (selectedGraphs.length !== 2) return null;

    const graph1 = getGraphByType(selectedGraphs[0]);
    const graph2 = getGraphByType(selectedGraphs[1]);

    if (!graph1 || !graph2) return null;

    // Calculate differences
    const differences = {
      nodes: {
        added: [],
        removed: [],
        modified: []
      },
      edges: {
        added: [],
        removed: [],
        modified: []
      },
      trains: {
        delayed: [],
        rerouted: [],
        cancelled: []
      }
    };

    // Compare trains if available
    if (graph1.trains && graph2.trains) {
      graph2.trains.forEach(train => {
        const originalTrain = graph1.trains.find(t => t.id === train.id);
        if (!originalTrain) {
          differences.trains.delayed.push(train);
        } else if (train.delay > (originalTrain.delay || 0)) {
          differences.trains.delayed.push(train);
        } else if (train.status === 'rerouted') {
          differences.trains.rerouted.push(train);
        } else if (train.status === 'cancelled') {
          differences.trains.cancelled.push(train);
        }
      });
    }

    return differences;
  };

  const differences = calculateDifferences();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-dark-border">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Graph Comparison
          </h2>
          <button
            onClick={toggleComparison}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {selectedGraphs.length === 2 ? (
            <div className="space-y-6">
              {/* Comparison Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center flex-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Graph 1</span>
                  <h3 className="font-semibold capitalize">{selectedGraphs[0]}</h3>
                </div>
                <div className="text-2xl text-gray-400">vs</div>
                <div className="text-center flex-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Graph 2</span>
                  <h3 className="font-semibold capitalize">{selectedGraphs[1]}</h3>
                </div>
              </div>

              {/* Differences */}
              {differences && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Detected Changes</h4>
                  
                  {/* Train Changes */}
                  <div className="space-y-2">
                    {differences.trains.delayed.length > 0 && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                          Delayed Trains: {differences.trains.delayed.length}
                        </span>
                        <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                          {differences.trains.delayed.map(t => t.id).join(', ')}
                        </div>
                      </div>
                    )}
                    
                    {differences.trains.rerouted.length > 0 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Rerouted Trains: {differences.trains.rerouted.length}
                        </span>
                        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                          {differences.trains.rerouted.map(t => t.id).join(', ')}
                        </div>
                      </div>
                    )}
                    
                    {differences.trains.cancelled.length > 0 && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">
                          Cancelled Trains: {differences.trains.cancelled.length}
                        </span>
                        <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                          {differences.trains.cancelled.map(t => t.id).join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>Select exactly 2 graphs to compare</p>
              <p className="text-sm mt-2">Currently selected: {selectedGraphs.length} graph(s)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonOverlay;
