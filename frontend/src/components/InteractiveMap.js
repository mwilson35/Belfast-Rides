// src/components/InteractiveMap.js
import React from 'react';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: 54.5973, // Belfast City Centre
  lng: -5.9301
};

const InteractiveMap = ({ markers, route }) => {
  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={12}
      >
        {markers && markers.map(marker => (
          <Marker key={marker.id} position={{ lat: marker.lat, lng: marker.lng }} />
        ))}
        {route && (
          <Polyline
            path={route} // route is an array of {lat, lng} objects
            options={{
              strokeColor: '#FF0000',
              strokeOpacity: 1,
              strokeWeight: 2,
            }}
          />
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default InteractiveMap;
