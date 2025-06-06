import React, { useRef, useEffect } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';

const InteractiveMap = ({
  markers = [],
  route = [],
  center,
  zoom: mapZoom = 12,
  autoFit = false
}) => {
  const mapRef = useRef(null);

  const isValidRoute = Array.isArray(route) && route.length > 0;

  const defaultCenter =
    center || (isValidRoute ? route[0] : { lat: 54.5973, lng: -5.9301 });

  const handleMapLoad = (map) => {
    mapRef.current = map;
  };

  useEffect(() => {
    console.log("InteractiveMap rendering with route:", route);
  }, [route]);

  useEffect(() => {
    if (autoFit && mapRef.current && isValidRoute) {
      const bounds = new window.google.maps.LatLngBounds();
      route.forEach((point) => {
        bounds.extend(new window.google.maps.LatLng(point.lat, point.lng));
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [route, autoFit, isValidRoute]);

  useEffect(() => {
    if (mapRef.current && isValidRoute) {
      mapRef.current.setCenter(route[0]);
    }
  }, [route, isValidRoute]);

  return (
    <GoogleMap
      mapContainerClassName="interactive-map-container"
      center={defaultCenter}
      zoom={mapZoom}
      onLoad={handleMapLoad}
    >
      {markers.map((marker, index) => {
  let iconUrl;
  let label;

  if (marker.id === 'pickup') {
    iconUrl = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
  } else if (marker.id === 'dropoff') {
    iconUrl = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
  } else if (marker.id === 'driver') {
    iconUrl = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    label = {
      text: 'Driver',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold'
    };
  }

  return (
    <Marker
      key={marker.id || index}
      position={{ lat: marker.lat, lng: marker.lng }}
      icon={iconUrl ? { url: iconUrl, scaledSize: new window.google.maps.Size(40, 40) } : undefined}
      label={label}
    />
  );
})}

      {isValidRoute && (
        <Polyline
          key={JSON.stringify(route)}
          path={route}
          options={{
            strokeColor: '#1E90FF',
            strokeOpacity: 0.9,
            strokeWeight: 4
          }}
        />
      )}
    </GoogleMap>
  );
};

export default InteractiveMap;
