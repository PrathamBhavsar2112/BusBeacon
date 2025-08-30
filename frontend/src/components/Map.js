import React, { useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


const busIcon = L.icon({
  iconUrl: '/icons/bus-icon.png',
  iconSize: [25, 25],
  iconAnchor: [12, 25], 
  popupAnchor: [1, -34],
});

const userIcon = L.icon({
  iconUrl: '/icons/user-icon.png',
  iconSize: [25, 25],
  iconAnchor: [12, 25], 
  popupAnchor: [1, -34],
});

const nearestStopIcon = L.icon({
  iconUrl: '/icons/nearest-stop-icon.png',
  iconSize: [25, 25],
  iconAnchor: [12, 25], 
  popupAnchor: [1, -34],
});


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

const Map = ({ buses = [], nearestStop, userLocation, proximityAlerts, onBusClick }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]); 
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const fitBoundsTimeoutRef = useRef(null);

  const clearMarkers = useCallback(() => {
    if (markers.current.length > 0 && map.current) {
      markers.current.forEach(marker => {
        try {
          if (marker && map.current && map.current.hasLayer && map.current.hasLayer(marker)) {
            map.current.removeLayer(marker);
          }
        } catch (error) {
          console.warn('Error removing marker:', error);
        }
      });
    }
    markers.current = [];
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapInitialized) return;

    try {
      map.current = L.map(mapContainer.current, {
        center: userLocation ? [userLocation.lat, userLocation.lng] : [44.65, -63.57],
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
        fadeAnimation: false,
        zoomAnimation: false,
        markerZoomAnimation: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map.current);

      map.current.whenReady(() => {
        setIsMapReady(true);
        setMapInitialized(true);
        console.log('Map is ready');
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (fitBoundsTimeoutRef.current) {
        clearTimeout(fitBoundsTimeoutRef.current);
      }
      
      clearMarkers();
      
      if (map.current) {
        try {
          map.current.off(); 
          map.current.remove();
        } catch (error) {
          console.warn('Error during map cleanup:', error);
        }
      }
      
      map.current = null;
      setIsMapReady(false);
      setMapInitialized(false);
    };
  }, []);

  useEffect(() => {
    if (!map.current || !isMapReady || !mapInitialized) return;

    if (fitBoundsTimeoutRef.current) {
      clearTimeout(fitBoundsTimeoutRef.current);
    }

    try {
      clearMarkers();

      const bounds = L.latLngBounds();
      let hasValidBounds = false;

      if (userLocation && userLocation.lat && userLocation.lng) {
        try {
          const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
            .bindPopup('<div><strong>Your Location</strong></div>');
          
          userMarker.addTo(map.current);
          markers.current.push(userMarker);
          bounds.extend([userLocation.lat, userLocation.lng]);
          hasValidBounds = true;
        } catch (error) {
          console.warn('Error adding user marker:', error);
        }
      }

      if (buses && Array.isArray(buses)) {
        buses.forEach(bus => {
          if (!bus || !bus.lat || !bus.lng) return;
          
          try {
            const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, bus.lat, bus.lng) : null;
            const isNear = distance && distance <= 1;
            
            const marker = L.marker([bus.lat, bus.lng], { icon: busIcon })
              .on('click', () => {
                const popupContent = `<div>
                  <strong>Bus ID:</strong> ${bus.bus_id || 'N/A'}<br>
                  <strong>Route:</strong> ${bus.route || 'N/A'}<br>
                  <strong>Last Updated:</strong> ${bus.last_updated || 'N/A'}<br>
                  ${distance ? `<strong>Distance:</strong> ${distance.toFixed(2)} km<br>` : ''}
                  ${isNear ? `<strong>Alert:</strong> Bus is within 1 km! (~${Math.round(distance * 12)} min walk)<br>` : ''}
                  <strong>Status:</strong> Selected as nearest location
                </div>`;
                
                marker.setPopupContent(popupContent).openPopup();
                
                if (onBusClick) {
                  onBusClick(bus.bus_id);
                }
              });
            
            marker.addTo(map.current);
            markers.current.push(marker);
            bounds.extend([bus.lat, bus.lng]);
            hasValidBounds = true;
          } catch (error) {
            console.warn('Error adding bus marker:', error);
          }
        });
      }

      if (nearestStop && nearestStop.lat && nearestStop.lng) {
        try {
          const nearestMarker = L.marker([nearestStop.lat, nearestStop.lng], { icon: nearestStopIcon })
            .bindPopup(`<div><strong>Nearest Stop:</strong> ${nearestStop.name || 'Bus Stop'}</div>`);
          
          nearestMarker.addTo(map.current);
          markers.current.push(nearestMarker);
          bounds.extend([nearestStop.lat, nearestStop.lng]);
          hasValidBounds = true;
        } catch (error) {
          console.warn('Error adding nearest stop marker:', error);
        }
      }

      if (hasValidBounds && bounds.isValid()) {
        fitBoundsTimeoutRef.current = setTimeout(() => {
          try {
            if (map.current && bounds.isValid()) {
              map.current.fitBounds(bounds, { 
                padding: [20, 20], 
                maxZoom: 15,
                animate: false 
              });
            }
          } catch (error) {
            console.warn('Error fitting bounds:', error);
          }
        }, 100); 
      }

    } catch (error) {
      console.error('Error updating markers:', error);
    }
  }, [buses, nearestStop, userLocation, isMapReady, mapInitialized, clearMarkers, onBusClick]);

  return (
    <div 
      className="map-container"
      style={{ 
        width: '100%', 
        height: '600px', 
        border: '1px solid #ccc', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        position: 'relative' 
      }}
    >
      {!isMapReady && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '12px',
            borderRadius: '5px',
            color: '#000'
          }}
        >
          Loading map...
        </div>
      )}
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '8px'
        }} 
      />
    </div>
  );
};

export default Map;