import React from 'react';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';

const InteractiveMap = ({ markers, route }) => {
  const defaultCenter = route && route.length > 0 ? route[0] : { lat: 54.5973, lng: -5.9301 };

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerClassName="interactive-map-container"
        center={defaultCenter}
        zoom={12}
      >
        {markers.map((marker) => (
          <Marker key={marker.id} position={{ lat: marker.lat, lng: marker.lng }} />
        ))}
        {route && (
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
