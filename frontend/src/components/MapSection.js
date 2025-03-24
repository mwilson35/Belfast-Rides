import React from 'react';
import InteractiveMap from './InteractiveMap';

const MapSection = ({ markers, route, zoom }) => (
  <section className="map-section">
    <h2>Live Map</h2>
    <InteractiveMap markers={markers} route={route} zoom={zoom} />
  </section>
);

export default MapSection;
