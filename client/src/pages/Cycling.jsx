import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, Legend,
} from 'recharts';
import { Bike, HeartPulse, RefreshCw, TrendingUp, Zap, Gauge, Activity, ListChecks, Save } from 'lucide-react';
import api from '../api';

const zoneColors = ['#60a5fa', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#a855f7'];

const BIKE_TYPE_LABELS = {
  road: 'Route',
  gravel: 'Gravel',
  indoor: 'Home trainer',
  commute: 'Velotaf',
  mixed: 'Mixte',
};

const CYCLING_GOAL_LABELS = {
  endurance: 'Endurance',
  ftp: 'Augmenter la FTP',
  climb: 'Grimpe',
  race: 'Course',
  health: 'Santé',
};

const FTP_SOURCE_LABELS = {
  power_curve_20min: 'Best 20 min',
  best_ride_average_watts: 'Watts moyens sortie',
  max_recent_average_watts: 'Max watts moyens (10 dernières sorties)',
  missing_power_data: 'Données puissance manquantes',
};

const formatDuration = (seconds) => {
  if (!seconds) return '0h00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h${String(m).padStart(2, '0')}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const metric = (label, value, unit, icon) => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between gap-3 mb-3">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="p-2 rounded-lg" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
        {icon}
      </div>
    </div>
    <p className="text-3xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
      {value ?? '-'}{unit && <span className="text-base ml-1 opacity-70">{unit}</span>}
    </p>
  </div>
);

const Cycling = () => {
  const [data, setData] = useState({
    profile: null,
    rides: [],
    progress: [],
    recovery: null,
    insights: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileForm, setProfileForm] = useState({
    restHeartrate: '',
    bikeType: '',
    cyclingGoal: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const fetchCycling = async () => {
    try {
      setLoading(true);
      setError('');
      const [profile, rides, progress, recovery, insights] = await Promise.all([
        api.get('/cycling/profile'),
        api.get('/cycling/rides?limit=30'),
        api.get('/cycling/progress'),
        api.get('/cycling/recovery'),
        api.get('/cycling/insights'),
      ]);

      setData({
        profile: profile.data,
        rides: rides.data || [],
        progress: progress.data || [],
        recovery: recovery.data,
        insights: insights.data || [],
      });
      setProfileForm({
        restHeartrate: profile.data?.restHeartrate || '',
        bikeType: profile.data?.bikeType || '',
        cyclingGoal: profile.data?.cyclingGoal || '',
      });
    } catch (err) {
      console.error('Error fetching cycling data:', err);
      setError(err.response?.data?.error || 'Impossible de charger la section cyclisme.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycling();
  }, []);

  const handleProfileFormChange = (event) => {
    const { name, value } = event.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');

    try {
      await api.patch('/user', {
        restHeartrate: profileForm.restHeartrate,
        bikeType: profileForm.bikeType,
        cyclingGoal: profileForm.cyclingGoal,
      });

      setProfileMessage('Profil cycliste enregistré.');
      await fetchCycling();
    } catch (err) {
      console.error('Error saving cycling profile:', err);
      setProfileMessage(err.response?.data?.error || 'Impossible d’enregistrer le profil cycliste.');
    } finally {
      setSavingProfile(false);
    }
  };

  const latestRide = data.rides[0];
  const zonesChart = useMemo(() => (
    data.profile?.powerZones?.map((zone, index) => ({
      ...zone,
      color: zoneColors[index],
      range: zone.maxWatts ? `${zone.minWatts}-${zone.maxWatts} W` : `>${zone.minWatts || 0} W`,
    })) || []
  ), [data.profile]);

  const progressChart = useMemo(() => (
    data.progress.map(point => ({
      ...point,
      dateLabel: formatDate(point.date),
    }))
  ), [data.progress]);

  const wattsChart = useMemo(() => {
    const ordered = [...(data.rides || [])]
      .filter(r => r.averageWatts)
      .reverse();
    const ROLLING = 4;
    return ordered.map((ride, i) => {
      const window = ordered.slice(Math.max(0, i - ROLLING + 1), i + 1);
      const rollingMax = Math.max(...window.map(r => r.averageWatts));
      return {
        date: ride.date,
        dateLabel: formatDate(ride.date),
        averageWatts: ride.averageWatts,
        weighted: ride.weightedAverageWatts || null,
        rollingMax,
        name: ride.name,
      };
    });
  }, [data.rides]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0055ff] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-muted)' }}>Chargement cyclisme...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-panel p-8 max-w-md text-center">
          <Bike className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--accent-blue)' }} />
          <p style={{ color: '#dc2626' }}>{error}</p>
        </div>
      </div>
    );
  }

  const { profile, recovery, insights, rides } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <Bike className="w-9 h-9" style={{ color: 'var(--accent-blue)' }} />
            Cyclisme
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Profil, zones de puissance, sorties, progression et récupération.
          </p>
        </div>
        <div className="glass-card p-4 min-w-[220px]">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Dernière sortie</p>
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{latestRide ? formatDate(latestRide.date) : '-'}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{latestRide ? `${latestRide.distanceKm} km · ${formatDuration(latestRide.durationSeconds)}` : 'Aucune sortie vélo'}</p>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metric('Poids', profile?.weight, 'kg', <Gauge className="w-4 h-4" />)}
        {metric('FTP plaine', profile?.ftp, 'W', <Zap className="w-4 h-4" />)}
        {metric('FTP col', profile?.ftpRelative, 'W/kg', <TrendingUp className="w-4 h-4" />)}
        {metric('FTP sprint', profile?.sprintPower, 'W', <Activity className="w-4 h-4" />)}
        {metric('FC max', profile?.maxHeartrate, 'bpm', <HeartPulse className="w-4 h-4" />)}
        {metric('FC repos', profile?.restHeartrate, 'bpm', <HeartPulse className="w-4 h-4" />)}
        {metric('VO2max', profile?.vo2max, '', <Gauge className="w-4 h-4" />)}
        {metric('Objectif', CYCLING_GOAL_LABELS[profile?.cyclingGoal] || profile?.cyclingGoal || '-', '', <ListChecks className="w-4 h-4" />)}
      </section>

      {profile?.ftpSource && (
        <div className="glass-card p-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Source FTP</p>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {FTP_SOURCE_LABELS[profile.ftpSource] || profile.ftpSource}
                {profile.peakAverageWatts && <span> · pic {profile.peakAverageWatts} W</span>}
                {profile.ftpConfidence === 'low' && <span style={{ color: '#f97316' }}> · estimation basse confiance</span>}
                {profile.ftpConfidence === 'medium' && <span style={{ color: '#0055ff' }}> · estimation stable</span>}
              </p>
            </div>
            {profile.ftpSourceRide ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Référence : {profile.ftpSourceRide.name || 'Sortie vélo'} · {formatDate(profile.ftpSourceRide.date)} · {profile.ftpSourceRide.averageWatts} W moyens
              </p>
            ) : profile.ftpSourceRides?.length > 0 && (
              <div className="text-sm md:text-right" style={{ color: 'var(--text-secondary)' }}>
                <p>{profile.ftpSourceRides.length} sorties prises en compte</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {profile.ftpSourceRides.map(ride => `${formatDate(ride.date)} · ${ride.averageWatts} W`).join(' | ')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <section className="glass-panel p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Bike className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
              Mes infos cycliste
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              FC repos et objectif sont saisis manuellement. FTP, W/kg, VO2max et zones sont recalculés automatiquement depuis ton poids et tes données Strava de puissance.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>Pratique actuelle</p>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{BIKE_TYPE_LABELS[profile?.bikeType] || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>Mise à jour auto</p>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Poids + FTP + VO2max</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">FC repos</label>
              <input
                type="number"
                name="restHeartrate"
                value={profileForm.restHeartrate}
                onChange={handleProfileFormChange}
                min="25"
                max="120"
                className="input-cyber"
                placeholder="55"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Pratique</label>
              <select name="bikeType" value={profileForm.bikeType} onChange={handleProfileFormChange} className="input-cyber">
                <option value="" style={{ background: 'var(--bg-secondary)' }}>Non renseigné</option>
                <option value="road" style={{ background: 'var(--bg-secondary)' }}>Route</option>
                <option value="gravel" style={{ background: 'var(--bg-secondary)' }}>Gravel</option>
                <option value="indoor" style={{ background: 'var(--bg-secondary)' }}>Home trainer</option>
                <option value="commute" style={{ background: 'var(--bg-secondary)' }}>Velotaf</option>
                <option value="mixed" style={{ background: 'var(--bg-secondary)' }}>Mixte</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Objectif</label>
              <select name="cyclingGoal" value={profileForm.cyclingGoal} onChange={handleProfileFormChange} className="input-cyber">
                <option value="" style={{ background: 'var(--bg-secondary)' }}>Non renseigné</option>
                <option value="endurance" style={{ background: 'var(--bg-secondary)' }}>Endurance</option>
                <option value="ftp" style={{ background: 'var(--bg-secondary)' }}>Augmenter la FTP</option>
                <option value="climb" style={{ background: 'var(--bg-secondary)' }}>Grimpe</option>
                <option value="race" style={{ background: 'var(--bg-secondary)' }}>Course</option>
                <option value="health" style={{ background: 'var(--bg-secondary)' }}>Santé</option>
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <button type="submit" disabled={savingProfile} className="btn-cyber h-[50px] flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {savingProfile ? '...' : 'Enregistrer'}
              </button>
              {profileMessage && (
                <p className="text-xs mt-2" style={{ color: profileMessage.includes('Impossible') ? '#dc2626' : 'var(--accent-blue)' }}>
                  {profileMessage}
                </p>
              )}
            </div>
          </form>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="glass-panel p-6 lg:col-span-2">
          <h2 className="text-xl font-bold mb-5">Zones de puissance</h2>
          <div className="space-y-3">
            {zonesChart.map((zone, index) => (
              <div key={zone.key} className="flex items-center gap-3">
                <div className="w-3 h-8 rounded-sm" style={{ background: zone.color }}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{zone.zone} · {zone.name}</p>
                    <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{zone.range}</p>
                  </div>
                  <div className="h-1.5 mt-1 rounded-full" style={{ background: 'rgba(19,16,20,0.08)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, 22 + index * 11)}%`, background: zone.color }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 lg:col-span-3">
          <h2 className="text-xl font-bold mb-5">Progression</h2>
          {progressChart.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
                  <XAxis dataKey="dateLabel" stroke="rgba(19,16,20,0.45)" />
                  <YAxis yAxisId="left" stroke="#0055ff" />
                  <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
                  <Tooltip contentStyle={{ background: '#131014', border: '1px solid rgba(0,85,255,0.25)', color: '#e8e8e8' }} />
                  <Line yAxisId="left" type="monotone" dataKey="ftp" stroke="#0055ff" strokeWidth={3} dot={false} name="FTP" />
                  <Line yAxisId="right" type="monotone" dataKey="ftpRelative" stroke="#22c55e" strokeWidth={2} dot={false} name="W/kg" />
                  <Line yAxisId="right" type="monotone" dataKey="weight" stroke="#a855f7" strokeWidth={2} dot={false} name="Poids" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pas encore assez de données de puissance pour tracer la progression.</p>
          )}
        </div>
      </section>

      <section className="glass-panel p-6 mb-8">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-xl font-bold">Watts moyens par sortie</h2>
          {profile?.ftp && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Ligne pointillée : FTP estimée ({profile.ftp} W)
            </p>
          )}
        </div>
        {wattsChart.length > 1 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wattsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="dateLabel" stroke="rgba(232,232,232,0.45)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(232,232,232,0.45)" tick={{ fontSize: 11 }} unit=" W" />
                <Tooltip
                  contentStyle={{ background: 'rgba(19,16,20,0.97)', border: '1px solid rgba(0,85,255,0.2)', color: '#e8e8e8' }}
                  labelStyle={{ color: '#e8e8e8' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {profile?.ftp && (
                  <ReferenceLine y={profile.ftp} stroke="#0055ff" strokeDasharray="4 4" label={{ value: 'FTP', position: 'right', fill: '#0055ff', fontSize: 11 }} />
                )}
                <Line type="monotone" dataKey="averageWatts" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Watts moyens" />
                <Line type="monotone" dataKey="rollingMax" stroke="#f97316" strokeWidth={2} strokeDasharray="2 4" dot={false} name="Pic glissant (4 sorties)" />
                {wattsChart.some(p => p.weighted) && (
                  <Line type="monotone" dataKey="weighted" stroke="#a855f7" strokeWidth={1.5} dot={false} name="Watts pondérés (NP)" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pas encore assez de sorties avec donnée de puissance pour tracer le graphique.</p>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
            <RefreshCw className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
            Récupération
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>TSB actuel</p>
              <p className="text-4xl font-black" style={{ color: 'var(--accent-blue)', fontFamily: 'var(--font-display)' }}>{recovery?.currentTsb ?? '-'}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p style={{ color: 'var(--text-muted)' }}>ATL</p><p className="font-bold">{recovery?.atl ?? '-'}</p></div>
              <div><p style={{ color: 'var(--text-muted)' }}>CTL</p><p className="font-bold">{recovery?.ctl ?? '-'}</p></div>
              <div><p style={{ color: 'var(--text-muted)' }}>Off</p><p className="font-bold">{recovery?.daysOff ?? '-'} j</p></div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{recovery?.recommendation}</p>
          </div>
        </div>

        <div className="glass-panel p-6 lg:col-span-2">
          <h2 className="text-xl font-bold mb-5">Analyse automatique</h2>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className="flex gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-mono font-bold" style={{ color: 'var(--accent-blue)' }}>{String(index + 1).padStart(2, '0')}</span>
                <p>{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-panel p-6 mb-8">
        <h2 className="text-xl font-bold mb-5">Analyse des sorties</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                <th className="text-left py-3 pr-4">Date</th>
                <th className="text-left py-3 pr-4">Sortie</th>
                <th className="text-right py-3 px-3">Km</th>
                <th className="text-right py-3 px-3">Durée</th>
                <th className="text-right py-3 px-3">Watts</th>
                <th className="text-right py-3 px-3">IF</th>
                <th className="text-right py-3 pl-3">TSS</th>
              </tr>
            </thead>
            <tbody>
              {rides.map(ride => (
                <tr key={ride.id} style={{ borderBottom: '1px solid rgba(0,85,255,0.08)' }}>
                  <td className="py-3 pr-4 font-mono" style={{ color: 'var(--text-secondary)' }}>{formatDate(ride.date)}</td>
                  <td className="py-3 pr-4 font-bold" style={{ color: 'var(--text-primary)' }}>{ride.name}</td>
                  <td className="py-3 px-3 text-right">{ride.distanceKm}</td>
                  <td className="py-3 px-3 text-right">{formatDuration(ride.durationSeconds)}</td>
                  <td className="py-3 px-3 text-right">{ride.watts ?? '-'}</td>
                  <td className="py-3 px-3 text-right">{ride.intensityFactor ?? '-'}</td>
                  <td className="py-3 pl-3 text-right">{ride.tss ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {rides[0]?.zoneDurations?.some(zone => zone.seconds > 0) && (
        <section className="glass-panel p-6">
          <h2 className="text-xl font-bold mb-5">Répartition zones · dernière sortie</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rides[0].zoneDurations.map((zone, index) => ({ ...zone, name: `Z${index + 1}` }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
                <XAxis dataKey="name" />
                <YAxis unit="%" />
                <Tooltip contentStyle={{ background: '#131014', border: '1px solid rgba(0,85,255,0.25)', color: '#e8e8e8' }} />
                <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
                  {rides[0].zoneDurations.map((_, index) => <Cell key={index} fill={zoneColors[index]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
};

export default Cycling;
