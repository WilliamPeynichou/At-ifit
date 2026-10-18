import React from 'react';
import { useTheme } from '../context/ThemeContext';
import logoLight from '../assets/brand/atifit-horizontal-light.svg';
import logoDark from '../assets/brand/atifit-horizontal-dark.svg';
import '../styles/cyclist-loader.css';

const CyclistLoader = () => {
  const { isDark } = useTheme();
  return (
    <div className="cyclist-loader" role="status" aria-live="polite">
      <img
        src={isDark ? logoDark : logoLight}
        alt="Atifit"
        width="162"
        height="60"
        className="cyclist-brand"
      />
      <p className="cyclist-label">Chargement...</p>
    </div>
  );
};

export default CyclistLoader;
