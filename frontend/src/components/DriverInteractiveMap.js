import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const DriverInteractiveMap = ({
  markers = [],
  directions = null, // expecting GeoJSON format
  center,
  zoom = 12,
  autoFit = false,
  acceptedRide, // pass acceptedRide from parent if available
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Initialize Map
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: center ? [center.lng, center.lat] : [-5.9301, 54.5973],
      zoom,
      pitch: 60,
      bearing: 0,
      antialias: true,
    });

    // Cleanup map on unmount
    return () => mapRef.current.remove();
  }, [center, zoom]);

  // Render Markers
  useEffect(() => {
    // Clear previous markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    markers.forEach(markerData => {
      const marker = new mapboxgl.Marker({ color: markerData.color || 'red' })
        .setLngLat([markerData.lng, markerData.lat])
        .setPopup(new mapboxgl.Popup().setText(markerData.label || ''))
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    });
  }, [markers]);

  // Render Directions (GeoJSON format expected)
  useEffect(() => {
    if (!directions || !mapRef.current) return;
  
    const addRouteLayer = () => {
      if (mapRef.current.getSource('route')) {
        mapRef.current.removeLayer('route');
        mapRef.current.removeSource('route');
      }
      mapRef.current.addSource('route', {
        type: 'geojson',
        data: directions,
      });
      mapRef.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#1db7dd', 'line-width': 5 },
      });
    };
  
    if (!mapRef.current.isStyleLoaded()) {
      mapRef.current.once('load', addRouteLayer);
    } else {
      addRouteLayer();
    }
  }, [directions]);
  

  // Auto-fit bounds
  useEffect(() => {
    if (!autoFit || !mapRef.current) return;

    const bounds = new mapboxgl.LngLatBounds();

    if (directions && directions.features) {
      directions.features.forEach(feature => {
        feature.geometry.coordinates.forEach(coord => bounds.extend(coord));
      });
    } else if (markers.length > 0) {
      markers.forEach(marker => bounds.extend([marker.lng, marker.lat]));
    }

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 50 });
    }
  }, [markers, directions, autoFit]);

  // Dynamic driving camera update: push driver to bottom and show route
  useEffect(() => {
    if (!mapRef.current || !center || !acceptedRide) return;
    const dynamicBearing = 45; 
    mapRef.current.easeTo({
      center: [center.lng, center.lat],
      bearing: dynamicBearing,
      pitch: 60,
      zoom: 18,       
      offset: [0, 100], 
      duration: 1000
    });
  }, [center, acceptedRide]);
  

  return (
    <div
      ref={mapContainerRef}
      className="interactive-map-container"
      style={{ borderRadius: '12px' }}
    />
  );
  
};

export default DriverInteractiveMap;
