/**
 * Navbar Component
 * Top navigation bar with app branding, theme toggle, and settings
 * Features:
 * - App name/logo
 * - Theme switcher (light/dark mode)
 * - Settings icon (opens model brain editor)
 */

import React from 'react';
import {
  SunIcon,
  MoonIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const Navbar = ({ theme, onThemeToggle, onSettingsClick }) => {
  return (
    <nav className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-6 z-10">
      {/* App branding */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-lg">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Voice Assistant
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            AI-Powered Conversations
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <MoonIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <SunIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Open settings"
          title="Settings & Model Brain"
        >
          <Cog6ToothIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
