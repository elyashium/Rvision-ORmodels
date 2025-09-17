import React from 'react';

const ProgressBar = ({ progress = 0, message = 'Processing...' }) => {
  return (
    <div className="bg-white dark:bg-dark-surface border-b dark:border-dark-border shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {message}
          </span>
          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
            {progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            className="h-2 rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-primary-400 to-primary-600"
            style={{ 
              width: `${progress}%`,
              animation: 'shimmer 2s infinite linear',
              backgroundSize: '200% 100%'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
