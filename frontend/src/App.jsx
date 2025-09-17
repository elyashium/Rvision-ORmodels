import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import TrainDashboard from './components/TrainDashboard';
import EventReporter from './components/EventReporter';
import { useThemeStore } from './stores/themeStore';
import './styles/index.css';

function App() {
  const { isDarkMode } = useThemeStore();
  const [showEventReporter, setShowEventReporter] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEventReported = () => {
    // Trigger a refresh of the dashboard
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    // Apply dark mode class to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'dark:bg-dark-surface dark:text-dark-text',
          duration: 4000,
        }}
      />
      
      {/* Main Dashboard */}
      <TrainDashboard key={refreshKey} />
      
      {/* Floating Action Button for Event Reporter */}
      <button
        onClick={() => setShowEventReporter(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-110 flex items-center justify-center group z-40"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="absolute right-full mr-3 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Report Event
        </span>
      </button>

      {/* Event Reporter Modal */}
      <AnimatePresence>
        {showEventReporter && (
          <EventReporter
            onClose={() => setShowEventReporter(false)}
            onEventReported={handleEventReported}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
