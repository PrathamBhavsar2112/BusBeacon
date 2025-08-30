import React from 'react';

const Sidebar = ({ darkMode, toggleDarkMode, onLogout }) => {
  return (
    <div className={`w-64 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} h-screen p-4 shadow-lg`}>
      <h2 className="text-2xl font-bold mb-6">BusBeacon</h2>
      <ul className="space-y-4">
        <li>
          <button className={`w-full text-left hover:${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-200`}>Map View</button>
        </li>
        <li>
          <button className={`w-full text-left hover:${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-200`}>Profile</button>
        </li>
        <li>
          <button
            onClick={toggleDarkMode}
            className={`w-full text-left hover:${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-200`}
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </li>
        <li>
          <button
            onClick={onLogout}
            className={`w-full text-left hover:${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-200`}
          >
            Logout
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;