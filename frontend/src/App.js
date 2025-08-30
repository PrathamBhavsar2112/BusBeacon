import React, { useState } from 'react';
import { Amplify } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react';
import awsconfig from './aws-exports';
import Sidebar from './components/Sidebar';
import BusTracker from './components/BusTracker';

Amplify.configure(awsconfig);

const App = ({ signOut, user }) => {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Sidebar darkMode={darkMode} toggleDarkMode={toggleDarkMode} onLogout={signOut} />
      <div className={`flex-1 p-6 overflow-auto ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <h1 className="text-4xl font-bold mb-6">BusBeacon</h1>
        <div className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <p>Instructions: View bus locations and nearest stops. Alerts show when buses are within 1 km.</p>
        </div>
        {user && <BusTracker user={user} signOut={signOut} darkMode={darkMode} />}
      </div>
    </div>
  );
};

export default withAuthenticator(App, {
  signUpAttributes: ['email'],
  loginMechanisms: ['email'],
  initialState: 'signUp',
});