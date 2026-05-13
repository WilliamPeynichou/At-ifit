import React, { useEffect, useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  ComposedChart, Bar, Legend, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { Bike, HeartPulse, TrendingUp, Mountain } from 'lucide-react';
import api from '../../../api';
import { useTemporal } from '../../../context/TemporalContext';
import { darkTooltipProps } from '../../ui/chartStyles';

const RIDE_TYPES = ['Ride', 'VirtualRide', 'EBikeRide', 'GravelRide'];

const FTP_SOURCE_LABELS = {
  power_curve_20min: '95 % du best 20 min',
  max_recent_average_watts: 'Max watts moyens × 1.05 (10 dernières sorties)',
  median_recent_5_average_watts: 'Médiane des watts moyens',
  best_ride_average_watts: 'Watts moyens sortie',
  missing_power_data: 'Données puissance manquantes',
};

const CyclingPerf = ({ activities }) => {
  const { queryParams, fromISO, toISO } = useTemporal();
  const [profile, setProfile] = useState(null);
  const [rides, setRides] = useState([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  useEffect(() => {
    setLoadingExtra(true);
    Promise.all([
      api.get('/cycling/profile'),
      api.get('/cycling/rides?limit=20'),
    ])
      .then(([profileRes, ridesRes]) => {
        setProfile(profileRes.data || null);
        setRides(ridesRes.data || []);
      })
      .catch(() => {
        setProfile(null);
        setRides([]);
      })
      .finally(() => setLoadingExtra(false));
  }, [fromISO, toISO]);

  const data = useMemo(() => {
    if (!activities?.length) return null;
    const rides = activities.filter(a => RIDE_TYPES.includes(a.type));
    if (!rides.length) return null;

    const withPower = rides.filter(a => a.average_watts || a.averageWatts);

    // FTP issue du service centralisé /api/cycling/profile (best 20 min ou max_recent_average_watts × 1.05).
    const ftpEstimated = profile?.ftp || null;

    // TSS / IF par sortie
    const sessions = withPower.map(a => {
      const watts = a.weightedAverageWatts || a.weighted_average_watts || a.average_watts || a.averageWatts;
      const dur = a.moving_time || a.movingTime || 0;
      const if_ = ftpEstimated ? watts / ftpEstimated : null;
      const tss = ftpEstimated ? (dur * watts * (if_ || 0)) / (ftpEstimated * 3600) * 100 : null;
      return {
        date: new Date(a.start_date || a.startDate),
        name: a.name,
        watts: Math.round(watts),
        weightedWatts: Math.round(a.weightedAverageWatts || a.weighted_average_watts || 0) || null,
        if_: if_ ? Math.round(if_ * 100) / 100 : null,
        tss: tss ? Math.round(tss) : null,
        duration: dur,
        distance: (a.distance || 0) / 1000,
        kj: a.kilojoules,
      };
    }).sort((a, b) => a.date - b.date);

    const totalDistance = rides.reduce((s, a) => s + (a.distance || 0), 0);
    const totalTime = rides.reduce((s, a) => s + (a.moving_time || a.movingTime || 0), 0);
    const totalKj = rides.reduce((s, a) => s + (a.kilojoules || 0), 0);

    return { rides, withPower, ftpEstimated, sessions, totalDistance, totalTime, totalKj };
  }, [activities, profile]);

  // Données pour les graphes "comparaison sorties" et "vitesse vs dénivelé" — basées sur les rides
  // enrichis du backend (qui contiennent minHeartrate calculé depuis le stream HR).
  const ridesChartData = useMemo(() => {
    if (!rides?.length) return [];
    return [...rides]
      .reverse()
      .map(ride => ({
        date: ride.date,
        dateLabel: new Date(ride.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        name: ride.name,
        distanceKm: ride.distanceKm || 0,
        elevationMeters: ride.elevationMeters || 0,
        averageSpeedKmh: ride.averageSpeedKmh || 0,
        averageHeartrate: ride.averageHeartrate || null,
        maxHeartrate: ride.maxHeartrate || null,
        minHeartrate: ride.minHeartrate || null,
      }))
      .filter(r => r.distanceKm > 0);
  }, [rides]);

  if (!data) {
    return (
      <div className="text-center py-20">
        <Bike size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Pas d'activités vélo détectées.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>Distance vélo</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {(data.totalDistance / 1000).toFixed(0)}<span className="text-base opacity-70 ml-1">km</span>
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(168,85,247,0.08)', border: '1.5px solid #a855f740' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>FTP plaine</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {data.ftpEstimated || '—'}<span className="text-base opacity-70 ml-1">W</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {FTP_SOURCE_LABELS[profile?.ftpSource] || (profile?.ftpSource ?? '95 % du best 20 min')}
            {profile?.ftpConfidence === 'low' && <span style={{ color: '#f97316' }}> · basse confiance</span>}
            {profile?.ftpConfidence === 'medium' && <span style={{ color: '#0055ff' }}> · confiance moyenne</span>}
            {profile?.ftpConfidence === 'high' && <span style={{ color: '#22c55e' }}> · haute confiance</span>}
          </p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(34,197,94,0.08)', border: '1.5px solid #22c55e40' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#22c55e' }}>FTP col</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {profile?.ftpRelative || '—'}<span className="text-base opacity-70 ml-1">W/kg</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Puissance par kg — capacité grimpe</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(234,179,8,0.08)', border: '1.5px solid #eab30840' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#eab308' }}>FTP sprint</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {profile?.sprintPower || '—'}<span className="text-base opacity-70 ml-1">W</span>
            {profile?.sprintPowerRelative && (
              <span className="text-sm font-bold ml-2 opacity-80">· {profile.sprintPowerRelative} W/kg</span>
            )}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {profile?.sprintPowerSource === 'peak_30s_power_curve' && 'Pic 30 s (streams watts)'}
            {profile?.sprintPowerSource === 'observed_max_watts' && 'Pic instantané (maxWatts Strava)'}
            {!profile?.sprintPowerSource && 'Puissance explosive — capacité sprint'}
          </p>
        </div>
      </div>

      {/* Profil cycliste complémentaire */}
      {profile && (profile.level || profile.vo2max || profile.maxHeartrate) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {profile.level && profile.level !== 'Untrained' && profile.level !== 'Indéterminé' && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--glass-border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Niveau Coggan</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile.level}</p>
            </div>
          )}
          {profile.vo2max && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--glass-border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>VO2max estimée</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {profile.vo2max}<span className="text-sm opacity-70 ml-1">ml/kg/min</span>
              </p>
              {profile.vo2maxConfidence === 'low' && <p className="text-[10px] mt-1" style={{ color: '#f97316' }}>hors plage de validité</p>}
              {profile.vo2maxConfidence === 'medium' && <p className="text-[10px] mt-1" style={{ color: '#0055ff' }}>confiance moyenne</p>}
            </div>
          )}
          {profile.maxHeartrate && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--glass-border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>FC max</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {profile.maxHeartrate}<span className="text-sm opacity-70 ml-1">bpm</span>
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {profile.maxHeartrateSource === 'observed_max' && 'observé sur tes sorties'}
                {profile.maxHeartrateSource === 'tanaka_formula' && 'formule Tanaka (âge)'}
                {profile.maxHeartrateSource === 'default_floor' && 'plancher par défaut'}
              </p>
            </div>
          )}
          {profile.weight && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--glass-border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Poids</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {profile.weight}<span className="text-sm opacity-70 ml-1">kg</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Avertissement si FTP/VO2max basse confiance */}
      {(profile?.ftpNote || profile?.vo2maxNote) && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.25)' }}>
          {profile.ftpNote && (
            <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-bold" style={{ color: '#f97316' }}>FTP — </span>{profile.ftpNote}
            </p>
          )}
          {profile.vo2maxNote && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-bold" style={{ color: '#f97316' }}>VO2max — </span>{profile.vo2maxNote}
            </p>
          )}
        </div>
      )}

      {/* Comparaison sorties : distance + vitesse + BPM (min/avg/max) */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <HeartPulse size={20} style={{ color: '#ef4444' }} /> Comparaison sorties — distance, vitesse, BPM
        </h3>
        {loadingExtra ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : ridesChartData.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pas encore de sorties vélo avec données de comparaison.</p>
        ) : (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={ridesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="dateLabel" stroke="#a8a29e" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#a855f7" unit=" km" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ef4444" unit=" bpm" tick={{ fontSize: 11 }} domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip {...darkTooltipProps} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#ffffff' }} />
                  <Bar yAxisId="left" dataKey="distanceKm" fill="#a855f7" fillOpacity={0.55} name="Distance (km)" />
                  <Line yAxisId="left" type="monotone" dataKey="averageSpeedKmh" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Vitesse moy. (km/h)" />
                  <Line yAxisId="right" type="monotone" dataKey="maxHeartrate" stroke="#ef4444" strokeWidth={2} dot={false} name="BPM max" />
                  <Line yAxisId="right" type="monotone" dataKey="averageHeartrate" stroke="#f97316" strokeWidth={2} dot={false} name="BPM moy." />
                  <Line yAxisId="right" type="monotone" dataKey="minHeartrate" stroke="#0055ff" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="BPM min" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              BPM min calculé depuis les streams Strava enrichis. Vitesse moyenne convertie en km/h. Axe gauche : km / km/h. Axe droit : bpm.
            </p>
          </>
        )}
      </div>

      {/* Vitesse vs Dénivelé — corrélation */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Mountain size={20} style={{ color: '#84cc16' }} /> Vitesse moyenne vs dénivelé
        </h3>
        {loadingExtra ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-[#84cc16] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : ridesChartData.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune donnée à corréler.</p>
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" dataKey="elevationMeters" name="Dénivelé" unit=" m" stroke="#84cc16" tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="averageSpeedKmh" name="Vitesse moy." unit=" km/h" stroke="#22c55e" tick={{ fontSize: 11 }} />
                  <ZAxis type="number" dataKey="distanceKm" range={[40, 240]} name="Distance" unit=" km" />
                  <Tooltip {...darkTooltipProps} cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => [value, name]} />
                  <Scatter data={ridesChartData} fill="#84cc16" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              Chaque point = une sortie. La taille du point reflète la distance. Une corrélation négative est attendue : plus de D+ → vitesse moyenne plus basse.
            </p>
          </>
        )}
      </div>

      {/* TSS evolution */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <TrendingUp size={20} style={{ color: '#0055ff' }} /> Évolution TSS / IF
        </h3>
        {data.ftpEstimated ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.sessions.filter(s => s.tss).map(s => ({
                ...s,
                dateLabel: s.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="dateLabel" stroke="#a8a29e" interval="preserveStartEnd" />
                <YAxis yAxisId="left" stroke="#fc4c02" />
                <YAxis yAxisId="right" orientation="right" stroke="#0055ff" domain={[0, 2]} />
                <Tooltip {...darkTooltipProps} />
                <Line yAxisId="left" type="monotone" dataKey="tss" stroke="#fc4c02" strokeWidth={2} dot={{ r: 3 }} name="TSS" />
                <Line yAxisId="right" type="monotone" dataKey="if_" stroke="#0055ff" strokeWidth={1.5} dot={false} name="IF" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>FTP requise pour calculer TSS/IF.</p>
        )}
      </div>
    </div>
  );
};

export default CyclingPerf;
