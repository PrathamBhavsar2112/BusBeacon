import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from '@aws-amplify/auth';
import Map from './Map';

const BusTracker = ({ user, signOut, darkMode }) => {
  const [buses, setBuses] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [nearestStop, setNearestStop] = useState(null);
  const [proximityAlerts, setProximityAlerts] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null); 
  const [apiErrors, setApiErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Get API URL from environment variables
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(newLocation);
          console.log('User Location Set:', newLocation);
        },
        error => {
          console.error('Geolocation error:', error);
          setUserLocation({ lat: 44.65, lng: -63.57 }); 
          console.log('Default User Location Set:', { lat: 44.65, lng: -63.57 });
        }
      );
    } else {
      setUserLocation({ lat: 44.65, lng: -63.57 }); 
      console.log('Default User Location Set (no geolocation):', { lat: 44.65, lng: -63.57 });
    }
  }, []);

  const fetchBuses = async () => {
    if (!user) return;

    setIsLoading(true);
    setApiErrors(prev => ({ ...prev, buses: null }));

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('Fetching buses with token:', token.substring(0, 20) + '...');

      // Use environment variable for API URL
      const response = await fetch(`${API_URL}/buses`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      console.log('Buses API response status:', response.status);
      console.log('Buses API response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Buses API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.log('Buses data received:', data);
      setBuses(Array.isArray(data) ? data : []);

      if (userLocation && Array.isArray(data)) {
        const alerts = data
          .map(bus => {
            const distance = calculateDistance(userLocation.lat, userLocation.lng, bus.lat, bus.lng);
            return distance <= 1 ? { busId: bus.bus_id, distance, time: Math.round(distance * 12) } : null;
          })
          .filter(alert => alert !== null);
        setProximityAlerts(alerts);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
      setApiErrors(prev => ({ ...prev, buses: error.message }));

      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        setApiErrors(prev => ({ 
          ...prev, 
          buses: 'CORS or Network Error: Unable to connect to API. Check if the API allows requests from localhost:3000' 
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNearestStop = async (busId = null) => {
    if (!userLocation || !user) return;

    setApiErrors(prev => ({ ...prev, nearestStop: null }));
    console.log('Fetching nearest stop with userLocation:', userLocation, 'and busId:', busId);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Use environment variable for API URL
      const url = `${API_URL}/nearest-stop?lat=${userLocation.lat}&lon=${userLocation.lng}${
        busId ? `&bus_id=${busId}` : ''
      }`;
      console.log('Fetching nearest stop from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      console.log('Nearest stop API response status:', response.status);
      console.log('Nearest stop API response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Nearest stop API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.log('Nearest stop data received:', data);
      setNearestStop(data);
    } catch (error) {
      console.error('Error fetching nearest stop:', error);
      setApiErrors(prev => ({ ...prev, nearestStop: error.message }));

      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        setApiErrors(prev => ({ 
          ...prev, 
          nearestStop: 'CORS or Network Error: Unable to connect to API. Check if the API allows requests from localhost:3000' 
        }));
      }
    }
  };

  useEffect(() => {
    if (user && userLocation) {
      fetchBuses();
      fetchNearestStop(); 
    }
  }, [user, userLocation]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const retryFetch = () => {
    if (user && userLocation) {
      fetchBuses();
      fetchNearestStop();
    }
  };

  const handleBusClick = (busId) => {
    const selectedBus = buses.find(bus => bus.bus_id === busId);
    setSelectedBus(selectedBus); 
    fetchNearestStop(busId);
    console.log('Bus clicked, selectedBus:', selectedBus, 'fetching nearest stop for busId:', busId);
  };

  const formatLastUpdated = (lastUpdated) => {
    if (!lastUpdated) return 'N/A';
    const date = new Date(lastUpdated);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true, 
      timeZoneName: 'short' 
    });
  };

  return (
    <div className={`flex-1 p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'} overflow-auto`}>
      {/* Loading indicator */}
      {isLoading && (
        <div className={`mb-4 p-4 rounded-lg ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
          <p>Loading data...</p>
        </div>
      )}

      {/* Error messages */}
      {(apiErrors.buses || apiErrors.nearestStop) && (
        <div className={`mb-4 p-4 rounded-lg ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>
          <h3 className="font-semibold mb-2">API Errors:</h3>
          {apiErrors.buses && (
            <div className="mb-2">
              <strong>Buses API:</strong> {apiErrors.buses}
            </div>
          )}
          {apiErrors.nearestStop && (
            <div className="mb-2">
              <strong>Nearest Stop API:</strong> {apiErrors.nearestStop}
            </div>
          )}
          <button 
            onClick={retryFetch}
            className={`mt-2 px-4 py-2 rounded ${darkMode ? 'bg-red-800 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
          >
            Retry
          </button>
        </div>
      )}
      
      {userLocation && (
        <div className={`p-4 rounded-lg shadow-md mb-6 space-y-4 ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
          <p className="text-lg">
            Your Location: Lat {userLocation.lat.toFixed(4)}, Lon {userLocation.lng.toFixed(4)}
          </p>
          
          {nearestStop && !apiErrors.nearestStop && (
            <p className="text-lg">
              Nearest Stop: <span className="font-semibold">{nearestStop.name}</span> (
              {nearestStop.distance_km} km, ~{nearestStop.walking_time_minutes} min walk)
            </p>
          )}
          
          {proximityAlerts.length > 0 && (
            <div className={`p-2 rounded ${darkMode ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}`}>
              <p className="font-semibold">Proximity Alerts:</p>
              {proximityAlerts.map(alert => (
                <p key={alert.busId} className="ml-2">
                  Bus {alert.busId}: {alert.distance.toFixed(2)} km away (~{alert.time} min walk)
                </p>
              ))}
            </div>
          )}

          {/* Selected Bus Information */}
          {selectedBus && (
            <div className={`p-2 rounded space-y-2 ${darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'}`}>
              <p className="font-semibold">Selected Bus Information:</p>
              <p><strong>Bus ID:</strong> {selectedBus.bus_id || 'N/A'}</p>
              <p><strong>Route:</strong> {selectedBus.route || 'N/A'}</p>
              <p><strong>Last Updated:</strong> {formatLastUpdated(selectedBus.last_updated)}</p>
              {userLocation && (
                <p><strong>Distance:</strong> {calculateDistance(userLocation.lat, userLocation.lng, selectedBus.lat, selectedBus.lng).toFixed(2)} km</p>
              )}
              {userLocation && calculateDistance(userLocation.lat, userLocation.lng, selectedBus.lat, selectedBus.lng) <= 1 && (
                <p><strong>Alert:</strong> Bus is within 1 km! (~{Math.round(calculateDistance(userLocation.lat, userLocation.lng, selectedBus.lat, selectedBus.lng) * 12)} min walk)</p>
              )}
            </div>
          )}
        </div>
      )}

      <Map 
        buses={buses} 
        nearestStop={nearestStop} 
        userLocation={userLocation} 
        proximityAlerts={proximityAlerts} 
        onBusClick={handleBusClick} 
      />
    </div>
  );
};

export default BusTracker;
