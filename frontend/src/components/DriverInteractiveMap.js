import React from 'react';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';

const DriverInteractiveMap = ({ markers = [], directions = null, center, zoom: mapZoom = 12, autoFit = false }) => {
  const defaultCenter = center || (markers.length > 0 ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: 54.5973, lng: -5.9301 });

  const handleMapLoad = (map) => {
    if (autoFit && directions) {
      const bounds = new window.google.maps.LatLngBounds();
      const legs = directions.routes[0]?.legs || [];
      legs.forEach((leg) => {
        bounds.extend(leg.start_location);
        bounds.extend(leg.end_location);
      });
      map.fitBounds(bounds);
    } else if (autoFit && markers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach((marker) => {
        bounds.extend(new window.google.maps.LatLng(marker.lat, marker.lng));
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
          <Marker key={marker.id || index} position={{ lat: marker.lat, lng: marker.lng }} label={marker.label || ''} />
        ))}
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </LoadScript>
  );
};

export default DriverInteractiveMap;
