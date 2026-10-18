import React from 'react';
import { useTheme } from '../context/ThemeContext';
import symbolTile from '../assets/brand/atifit-symbol-tile.svg';
import wordmarkLight from '../assets/brand/atifit-wordmark-light.svg';
import wordmarkDark from '../assets/brand/atifit-wordmark-dark.svg';

/** En-tête de marque des écrans d'authentification : symbole Delta A sur aplat bleu + wordmark. */
const AuthBrand = () => {
  const { isDark } = useTheme();
  return (
    <>
      <div className="rounded-2xl p-3" style={{ background: '#0055ff' }}>
        <img src={symbolTile} alt="" width="40" height="40" className="w-10 h-10" />
      </div>
      <h1 className="m-0">
        <img src={isDark ? wordmarkDark : wordmarkLight} alt="Atifit" width="87" height="36" className="h-9 w-auto" />
      </h1>
    </>
  );
};

export default AuthBrand;
