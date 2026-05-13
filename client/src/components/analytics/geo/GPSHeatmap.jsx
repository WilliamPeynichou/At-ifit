import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import polyline from '@mapbox/polyline';
import 'leaflet/dist/leaflet.css';
import api from '../../../api';
import { useTemporal } from '../../../context/TemporalContext';

const TYPE_COLORS = {
  Run: '#fc4c02',
  TrailRun: '#fb923c',
  Ride: '#a855f7',
  VirtualRide: '#8b5cf6',
  GravelRide: '#7c3aed',
  EBikeRide: '#6d28d9',
  Hike: '#22c55e',
  Walk: '#84cc16',
  Swim: '#06b6d4',
  default: '#0055ff',
};

const FitBounds = ({ paths }) => {
  const map = useMap();
  useEffect(() => {
    if (!paths.length) return;
    const allPoints = paths.flatMap(p => p.coords);
    if (allPoints.length === 0) return;
    map.fitBounds(allPoints);
  }, [paths, map]);
  return null;
};

const GPSHeatmap = () => {
  const { queryParams, fromISO, toISO } = useTemporal();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    api.get(`/strava/analytics/gps-heatmap${queryParams}`)
      .then(res => setActivities(res.data || []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [fromISO, toISO]);

  const paths = useMemo(() => {
    return activities
      .filter(a => !!a.polyline)
      .filter(a => filter === 'all' || a.type === filter)
      .map(a => {
        try {
          return {
            id: a.id,
            type: a.type,
            distance: a.distance,
            coords: polyline.decode(a.polyline),
          };
        } catch {
          return null;
        }
      })
      .filter(p => p && p.coords.length > 1);
  }, [activities, filter]);

  const types = useMemo(() => {
    const set = new Set(activities.map(a => a.type));
    return Array.from(set);
  }, [activities]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin mx-auto" />
        <p style={{ color: 'var(--text-muted)' }} className="mt-4">Chargement des traces GPS...</p>
      </div>
    );
  }

  if (!paths.length) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--text-muted)' }}>
          Pas de traces GPS disponibles.<br/>
          <span className="text-xs">L'enrichissement Strava doit avoir récupéré les polylines.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
          style={filter === 'all' ? {
            background: '#22c55e', color: '#fff',
          } : {
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)',
          }}
        >Tous · {activities.length}</button>
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
            style={filter === t ? {
              background: TYPE_COLORS[t] || TYPE_COLORS.default, color: '#fff',
            } : {
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)',
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[t] || TYPE_COLORS.default }} />
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--glass-border)', height: '600px' }}>
        <MapContainer
          center={[48.8566, 2.3522]}
          zoom={10}
          style={{ height: '100%', width: '100%', background: '#1a1a1f' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          {paths.map(p => (
            <Polyline
              key={p.id}
              positions={p.coords}
              pathOptions={{
                color: TYPE_COLORS[p.type] || TYPE_COLORS.default,
                weight: 2,
                opacity: 0.7,
              }}
            />
          ))}
          <FitBounds paths={paths} />
        </MapContainer>
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        {paths.length} traces affichées · Toutes vos activités GPS superposées
      </p>
    </div>
  );
};

export default GPSHeatmap;
