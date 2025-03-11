// src/components/MapSection.js
import React from 'react';
import InteractiveMap from './InteractiveMap';

const MapSection = ({ markers, route }) => (
  <section className="map-section">
    <h2>Live Map</h2>
    <InteractiveMap markers={markers} route={route} />
  </section>
);

export default MapSection;
