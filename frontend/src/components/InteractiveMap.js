import React from 'react';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';

const InteractiveMap = ({ markers = [], route = [], center, zoom: mapZoom = 12, autoFit = false }) => {
  // Use center prop if provided; otherwise, use the first route point or a default.
  const defaultCenter = center || (route && route.length > 0 ? route[0] : { lat: 54.5973, lng: -5.9301 });

  // On map load, if autoFit is enabled, adjust the bounds to include all points in the route.
  const handleMapLoad = (map) => {
    if (autoFit && route && route.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      route.forEach(point => {
        bounds.extend(new window.google.maps.LatLng(point.lat, point.lng));
      });
      map.fitBounds(bounds);
    }
  };

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerClassName="interactive-map-container"
        center={defaultCenter}
        zoom={mapZoom}
        onLoad={handleMapLoad}
      >
        {markers.map((marker, index) => (
          <Marker key={marker.id || index} position={{ lat: marker.lat, lng: marker.lng }} />
        ))}
        {route && route.length > 0 && (
          <>
            <Polyline
              path={route}
              options={{
                strokeColor: '#1E90FF',
                strokeOpacity: 0.9,
                strokeWeight: 4,
              }}
            />
            <Marker 
              position={route[0]} 
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }} 
            />
            <Marker 
              position={route[route.length - 1]} 
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }} 
            />
          </>
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default InteractiveMap;
