import React from 'react';
import '../styles/cyclist-loader.css';

const CyclistLoader = () => (
  <div className="cyclist-loader">
    <div className="cyclist-canvas">
      <div className="cyclist-pixel" />
    </div>
    <p className="cyclist-label">Chargement...</p>
  </div>
);

export default CyclistLoader;
