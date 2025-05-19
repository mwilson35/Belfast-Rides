import React from 'react';
import InteractiveMap from './InteractiveMap';

const DriverMapSection = ({ markers, route, center, zoom }) => (
  <section className="map-section">
    <h2>Live Map</h2>
    <InteractiveMap 
      markers={markers} 
      route={route} 
      center={center} 
      zoom={zoom} 
      autoFit={true}  
    />
  </section>
);

export default DriverMapSection;
