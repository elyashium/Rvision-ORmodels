import React, { useState, useEffect } from 'react';
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiRepeat } from 'react-icons/fi';
import clsx from 'clsx';

const TimelineControls = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + speed;
          if (next >= duration) {
            if (loop) {
              return 0;
            } else {
              setIsPlaying(false);
              return duration;
            }
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, duration, loop]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(currentTime + 10, duration));
  };

  const handleSkipBack = () => {
    setCurrentTime(Math.max(currentTime - 10, 0));
  };

  const formatTime = (time) => {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Simulation Timeline
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Speed:</span>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => setCurrentTime(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                     slider-thumb focus:outline-none focus:ring-2 focus:ring-primary-500"
            style={{
              background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${(currentTime / duration) * 100}%, rgb(229 231 235) ${(currentTime / duration) * 100}%, rgb(229 231 235) 100%)`
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center space-x-2">
        <button
          onClick={handleSkipBack}
          className={clsx(
            'p-2 rounded-lg transition-all',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-primary-500'
          )}
          title="Skip Back 10"
        >
          <FiSkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={handlePlayPause}
          className={clsx(
            'p-3 rounded-lg transition-all',
            'bg-primary-500 text-white hover:bg-primary-600',
            'focus:outline-none focus:ring-2 focus:ring-primary-500'
          )}
        >
          {isPlaying ? (
            <FiPause className="w-6 h-6" />
          ) : (
            <FiPlay className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={handleSkipForward}
          className={clsx(
            'p-2 rounded-lg transition-all',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-primary-500'
          )}
          title="Skip Forward 10"
        >
          <FiSkipForward className="w-5 h-5" />
        </button>

        <button
          onClick={handleReset}
          className={clsx(
            'p-2 rounded-lg transition-all',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-primary-500'
          )}
          title="Reset"
        >
          <FiSkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={() => setLoop(!loop)}
          className={clsx(
            'p-2 rounded-lg transition-all',
            loop ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : '',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-primary-500'
          )}
          title="Loop"
        >
          <FiRepeat className="w-5 h-5" />
        </button>
      </div>

      {/* Status Display */}
      <div className="flex items-center justify-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-gray-500 dark:text-gray-400">Status:</span>
          <span className={clsx(
            'px-2 py-1 rounded text-xs font-medium',
            isPlaying 
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          )}>
            {isPlaying ? 'Playing' : 'Paused'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-500 dark:text-gray-400">Loop:</span>
          <span className={clsx(
            'px-2 py-1 rounded text-xs font-medium',
            loop
              ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          )}>
            {loop ? 'On' : 'Off'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TimelineControls;
