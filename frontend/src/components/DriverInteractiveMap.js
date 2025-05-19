import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const DriverInteractiveMap = ({
  markers = [],
  directions = null,
  center,
  zoom = 15,
  autoFit = false,
  acceptedRide,
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const driverMarkerRef = useRef(null);

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center ? [center.lng, center.lat] : [-5.9301, 54.5973],
      zoom,
      pitch: 60,
      bearing: 0,
      antialias: true,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    return () => mapRef.current.remove();
  }, []);

  // Update Markers (distinct driver icon, improved passenger markers)
  useEffect(() => {
    // Remove the existing driver marker
    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }
    // Remove other markers (pickup and dropoff)
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    markers.forEach(markerData => {
      const el = document.createElement('div');
      el.style.width = '36px';
      el.style.height = '36px';
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';

      if (markerData.id === 'driver') {
        // Use the image from public folder
        el.style.backgroundImage = `url('${process.env.PUBLIC_URL}/images/car.jpg')`;
        driverMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([markerData.lng, markerData.lat])
          .addTo(mapRef.current);
      } else if (markerData.id === 'pickup') {
        el.style.backgroundImage = `url('https://cdn-icons-png.flaticon.com/512/854/854901.png')`;
        const marker = new mapboxgl.Marker(el)
          .setLngLat([markerData.lng, markerData.lat])
          .setPopup(new mapboxgl.Popup({ offset: 15 }).setText('Pickup'))
          .addTo(mapRef.current);
        markersRef.current.push(marker);
      } else if (markerData.id === 'dropoff') {
        el.style.backgroundImage = `url('https://cdn-icons-png.flaticon.com/512/2776/2776000.png')`;
        const marker = new mapboxgl.Marker(el)
          .setLngLat([markerData.lng, markerData.lat])
          .setPopup(new mapboxgl.Popup({ offset: 15 }).setText('Destination'))
          .addTo(mapRef.current);
        markersRef.current.push(marker);
      }
    });
  }, [markers]);

  // Directions
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    const addRouteLayer = () => {
      if (map.getSource('route')) {
        map.getSource('route').setData(directions);
      } else {
        map.addSource('route', {
          type: 'geojson',
          data: directions,
        });
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#1db7dd',
            'line-width': 6,
            'line-opacity': 0.8,
          },
        });
      }
    };

    if (directions) {
      const tryAddRoute = () => {
        if (!map.getSource('route')) {
          map.addSource('route', {
            type: 'geojson',
            data: directions,
          });
          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#1db7dd',
              'line-width': 6,
              'line-opacity': 0.8,
            },
          });
        } else {
          map.getSource('route').setData(directions);
        }
      };

      if (!map.isStyleLoaded()) {
        map.once('styledata', tryAddRoute);
      } else {
        tryAddRoute();
      }
    } else {
      // Remove the route if directions become null
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');
    }
  }, [directions]);

  // Auto-fit route and markers responsively
  useEffect(() => {
    if (!autoFit || !mapRef.current) return;

    const bounds = new mapboxgl.LngLatBounds();

    if (directions?.features) {
      directions.features.forEach(feature =>
        feature.geometry.coordinates.forEach(coord => bounds.extend(coord))
      );
    } else if (markers.length) {
      markers.forEach(marker => bounds.extend([marker.lng, marker.lat]));
    }

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 50, right: 50 },
        duration: 1000,
      });
    }
  }, [markers, directions, autoFit]);

  // Smooth Driver-Focused Camera
  useEffect(() => {
    if (!mapRef.current || !center || !acceptedRide) return;

    mapRef.current.easeTo({
      center: [center.lng, center.lat],
      bearing: 45, 
      pitch: 65,   
      zoom: 17.5,
      duration: 600,
      easing: t => t,
    });
  }, [center, acceptedRide]);

  return (
    <div
      ref={mapContainerRef}
      className="interactive-map-container"
      style={{
        borderRadius: '16px',
        height: '100%',
        width: '100%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    />
  );  
};

export default DriverInteractiveMap;
