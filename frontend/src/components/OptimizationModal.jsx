import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import useGraphStore from '../stores/graphStore';
import clsx from 'clsx';

const OptimizationModal = () => {
  const { toggleOptimizationModal, triggerOptimization } = useGraphStore();
  const [formData, setFormData] = useState({
    type: 'delay',
    trainId: 'T100',
    delayMinutes: 20,
    trackId: 'NDLS_ANVR_MAIN'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const disruption = {
      type: formData.type,
      details: formData.type === 'delay' 
        ? { train_id: formData.trainId, delay_minutes: formData.delayMinutes }
        : formData.type === 'failure'
        ? { track_id: formData.trackId }
        : {}
    };
    triggerOptimization(disruption);
    toggleOptimizationModal();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-2xl w-full max-w-md mx-4 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-dark-border">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Configure Optimization
          </h2>
          <button
            onClick={toggleOptimizationModal}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Disruption Type
            </label>
            <select 
              value={formData.type} 
              onChange={e => setFormData({...formData, type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="delay">Train Delay</option>
              <option value="failure">Track Failure</option>
              <option value="priority">Priority Routing</option>
            </select>
          </div>

          {formData.type === 'delay' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Train ID
                </label>
                <input 
                  type="text" 
                  value={formData.trainId}
                  onChange={e => setFormData({...formData, trainId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., T100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delay Duration (minutes)
                </label>
                <input 
                  type="number" 
                  value={formData.delayMinutes}
                  onChange={e => setFormData({...formData, delayMinutes: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="1"
                  max="180"
                  required
                />
              </div>
            </>
          )}

          {formData.type === 'failure' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Track ID
              </label>
              <input 
                type="text" 
                value={formData.trackId}
                onChange={e => setFormData({...formData, trackId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., NDLS_ANVR_MAIN"
                required
              />
            </div>
          )}

          {formData.type === 'priority' && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Priority routing will automatically optimize the network based on train priorities.
                Express trains will get direct routes while goods trains may be rerouted.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button 
              type="submit"
              className={clsx(
                'flex-1 py-2 px-4 rounded-lg font-medium transition-all',
                'bg-primary-500 text-white hover:bg-primary-600',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
              )}
            >
              Start Optimization
            </button>
            <button 
              type="button"
              onClick={toggleOptimizationModal}
              className={clsx(
                'flex-1 py-2 px-4 rounded-lg font-medium transition-all',
                'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                'hover:bg-gray-300 dark:hover:bg-gray-600',
                'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
              )}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OptimizationModal;
