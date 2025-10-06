import React from 'react';
import { FiSun, FiMoon, FiPlay, FiRefreshCw, FiGitBranch } from 'react-icons/fi';
import { useThemeStore } from '../stores/themeStore';
import useGraphStore from '../stores/graphStore';
import clsx from 'clsx';

const Header = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { toggleOptimizationModal, loadOriginalGraph, currentJob, clearJob } = useGraphStore();

  return (
    <header className="bg-white dark:bg-dark-surface border-b dark:border-dark-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FiGitBranch className="w-6 h-6 text-primary-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Railway Network Optimizer
              </h1>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              AI-Powered Decision Support System
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Optimization Status */}
            {currentJob && currentJob.status === 'running' && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <div className="spinner w-4 h-4"></div>
                <span className="text-sm text-primary-700 dark:text-primary-300">
                  Optimizing...
                </span>
              </div>
            )}

            {/* Clear Job Button */}
            {currentJob && currentJob.status === 'completed' && (
              <button
                onClick={clearJob}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Clear completed job"
              >
                <FiRefreshCw className="w-5 h-5" />
              </button>
            )}

            {/* Run Optimization Button */}
            <button
              onClick={toggleOptimizationModal}
              disabled={currentJob?.status === 'running'}
              className={clsx(
                'flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all',
                'bg-primary-500 text-white hover:bg-primary-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'shadow-md hover:shadow-lg'
              )}
            >
              <FiPlay className="w-4 h-4" />
              <span>Run Optimization</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={loadOriginalGraph}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Reload original graph"
            >
              <FiRefreshCw className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <FiSun className="w-5 h-5 text-yellow-500" />
              ) : (
                <FiMoon className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
