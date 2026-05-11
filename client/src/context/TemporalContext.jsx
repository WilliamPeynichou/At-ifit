import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

const TemporalContext = createContext(null);

const PRESETS = {
  '3M': () => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 3);
    return { from, to, preset: '3M' };
  },
  '6M': () => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 6);
    return { from, to, preset: '6M' };
  },
  '12M': () => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 12);
    return { from, to, preset: '12M' };
  },
  ALL: () => ({ from: null, to: null, preset: 'ALL' }),
};

export const TemporalProvider = ({ children, defaultPreset = '12M' }) => {
  const [range, setRange] = useState(() => PRESETS[defaultPreset]());

  const setPreset = useCallback((preset) => {
    if (PRESETS[preset]) {
      setRange(PRESETS[preset]());
    }
  }, []);

  const setCustom = useCallback((from, to) => {
    setRange({
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : null,
      preset: 'CUSTOM',
    });
  }, []);

  // Format ISO date pour query string
  const fromISO = useMemo(() => range.from ? range.from.toISOString() : null, [range.from]);
  const toISO = useMemo(() => range.to ? range.to.toISOString() : null, [range.to]);

  // Query string fragment réutilisable
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (fromISO) params.append('from', fromISO);
    if (toISO) params.append('to', toISO);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [fromISO, toISO]);

  const value = useMemo(() => ({
    from: range.from,
    to: range.to,
    fromISO,
    toISO,
    preset: range.preset,
    queryParams,
    setPreset,
    setCustom,
  }), [range, fromISO, toISO, queryParams, setPreset, setCustom]);

  return <TemporalContext.Provider value={value}>{children}</TemporalContext.Provider>;
};

export const useTemporal = () => {
  const ctx = useContext(TemporalContext);
  if (!ctx) {
    // Fallback : retourne des valeurs neutres pour permettre l'utilisation hors provider
    return { from: null, to: null, fromISO: null, toISO: null, preset: 'ALL', queryParams: '', setPreset: () => {}, setCustom: () => {} };
  }
  return ctx;
};

export default TemporalContext;
