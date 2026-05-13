import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { TemporalProvider, useTemporal } from '../context/TemporalContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  AreaChart, Area, ReferenceDot,
} from 'recharts';
import { Activity, Clock, MapPin, Zap, Heart, Gauge, Flame, Calendar, TrendingUp, Filter, LogOut, RefreshCw } from 'lucide-react';
import api from '../api';
import { darkTooltipProps } from '../components/ui/chartStyles';
import YearlyProgress from '../components/YearlyProgress';
import HeartRateZones from '../components/HeartRateZones';
import TrainingLoad from '../components/TrainingLoad';
import GearTracker from '../components/GearTracker';
import SportGoals from '../components/SportGoals';
import DataAnalysisHub from '../components/analytics/DataAnalysisHub';
import TemporalSelector from '../components/analytics/TemporalSelector';

const StravaStatsContent = () => {
  const { loadUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { queryParams, fromISO, toISO } = useTemporal();
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState([]);
  const [globalProgression, setGlobalProgression] = useState([]);
  const [sportProgression, setSportProgression] = useState({});
  const [selectedSport, setSelectedSport] = useState('All');
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [resyncMessage, setResyncMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromISO, toISO]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/strava/activities${queryParams}`);

      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      if (!Array.isArray(data)) {
        throw new Error('Invalid data format');
      }

      // Normalise les champs (DB camelCase ou Strava snake_case)
      const normalize = (a) => ({
        ...a,
        start_date: a.startDate || a.start_date,
        moving_time: a.movingTime ?? a.moving_time,
        total_elevation_gain: a.totalElevationGain ?? a.total_elevation_gain,
        average_heartrate: a.averageHeartrate ?? a.average_heartrate,
        has_heartrate: (a.averageHeartrate ?? a.average_heartrate) != null,
        average_watts: a.averageWatts ?? a.average_watts,
        device_watts: (a.averageWatts ?? a.average_watts) != null,
        suffer_score: a.sufferScore ?? a.suffer_score,
      });
      const sortedData = data.map(normalize).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      setActivities(sortedData);

      if (sortedData.length === 0) {
        setError(t('stravaStats.noActivities'));
      } else {
        processStats(sortedData);
      }
    } catch (err) {
      console.error('Error fetching Strava activities:', err);
      const errorMessage = err.response?.data?.error || err.message || t('stravaStats.fetchError');
      setError(errorMessage);

      if (err.response?.status === 400 && errorMessage.includes('not connected')) {
        navigate('/strava-connect');
      }
    } finally {
      setLoading(false);
    }
  };

  const processStats = (data) => {
    const sportStats = {};
    let totalDistance = 0;
    const globalProg = [];
    const sportProg = {};

    data.forEach(activity => {
      if (!activity.start_date) return;

      const type = activity.type || t('stravaStats.unknown');
      const dateObj = new Date(activity.start_date);
      if (isNaN(dateObj.getTime())) return; // Skip invalid dates

      const date = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

      totalDistance += (activity.distance || 0);
      globalProg.push({
        date: date,
        fullDate: activity.start_date,
        timestamp: dateObj.getTime(),
        name: activity.name,
        distance: Number(((activity.distance || 0) / 1000).toFixed(2)),
        cumulativeDistance: Number((totalDistance / 1000).toFixed(2)),
        type: type,
        bpm: activity.average_heartrate || 0
      });

      if (!sportStats[type]) {
        sportStats[type] = {
          name: type,
          count: 0,
          distance: 0,
          time: 0,
          elevation: 0,
          calories: 0,
          speedSum: 0,
          hrSum: 0,
          hrCount: 0,
          wattsSum: 0,
          wattsCount: 0
        };
        sportProg[type] = [];
      }

      const s = sportStats[type];
      s.count += 1;
      s.distance += (activity.distance || 0);
      s.time += (activity.moving_time || 0);
      s.elevation += (activity.total_elevation_gain || 0);

      const kCal = activity.calories || activity.kilojoules || 0;
      s.calories += kCal;

      s.speedSum += (activity.average_speed || 0);

      if (activity.has_heartrate && activity.average_heartrate) {
        s.hrSum += activity.average_heartrate;
        s.hrCount += 1;
      }

      if (activity.device_watts && activity.average_watts) {
        s.wattsSum += activity.average_watts;
        s.wattsCount += 1;
      }

      sportProg[type].push({
        date: date,
        fullDate: activity.start_date,
        name: activity.name,
        distance: ((activity.distance || 0) / 1000).toFixed(2),
        cumulativeDistance: (s.distance / 1000).toFixed(2)
      });
    });

    const formattedStats = Object.values(sportStats).map(stat => ({
      ...stat,
      distanceDisplay: (stat.distance / 1000).toFixed(1),
      timeDisplay: (stat.time / 3600).toFixed(1),
      elevationDisplay: stat.elevation.toFixed(0),
      caloriesDisplay: stat.calories.toFixed(0),
      avgSpeed: (stat.speedSum / stat.count * 3.6).toFixed(1),
      avgHR: stat.hrCount > 0 ? (stat.hrSum / stat.hrCount).toFixed(0) : '-',
      avgWatts: stat.wattsCount > 0 ? (stat.wattsSum / stat.wattsCount).toFixed(0) : '-'
    }));

    setStats(formattedStats);
    setGlobalProgression(globalProg);
    setSportProgression(sportProg);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const handleResync = async () => {
    if (resyncing) return;
    setResyncing(true);
    setResyncMessage('');
    setError('');
    try {
      await api.post('/strava/resync');
      setResyncMessage('Sync lancée. Revenez dans quelques minutes et rechargez la page.');
    } catch (err) {
      console.error('Strava resync error:', err);
      setError(err.response?.data?.error || 'Erreur lors du déclenchement de la resync');
    } finally {
      setResyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm(t('stravaStats.disconnectConfirm'))) {
      return;
    }

    setDisconnecting(true);
    setError('');
    try {
      await api.delete('/strava/disconnect');
      if (loadUser) {
        await loadUser();
      }
      navigate('/strava-connect');
    } catch (err) {
      console.error('Strava disconnect error:', err);
      setError(t('stravaStats.disconnectError'));
    } finally {
      setDisconnecting(false);
    }
  };

  const getSportChartData = () => {
    const chartData = [];
    const sportCurrentDist = {};

    Object.keys(sportProgression).forEach(sport => sportCurrentDist[sport] = 0);

    globalProgression.forEach(entry => {
      const point = { date: entry.date, fullDate: entry.fullDate };

      const sport = entry.type;
      if (Object.prototype.hasOwnProperty.call(sportCurrentDist, sport)) {
        sportCurrentDist[sport] = parseFloat(sportCurrentDist[sport]) + parseFloat(entry.distance);
      }

      Object.keys(sportCurrentDist).forEach(s => {
        point[s] = sportCurrentDist[s];
      });

      chartData.push(point);
    });
    return chartData;
  };

  const sportChartData = getSportChartData();
  const sportsList = Object.keys(sportProgression);
  const colors = ['#0055ff', '#00f3ff', '#a855f7', '#22c55e', '#eab308', '#ef4444'];

  // Recalcule le cumul à partir du sous-ensemble filtré pour avoir une vraie progression par sport.
  // `globalProgression[i].cumulativeDistance` est un cumul tous sports → faux quand on filtre.
  const filteredGlobalProgression = useMemo(() => {
    const base = selectedSport === 'All'
      ? globalProgression
      : globalProgression.filter(a => a.type === selectedSport);
    let cum = 0;
    return base.map(p => {
      cum += (p.distance || 0);
      return { ...p, cumulativeDistance: Number(cum.toFixed(2)) };
    });
  }, [globalProgression, selectedSport]);

  // Set default selected sport if not set or if current selection doesn't exist
  useEffect(() => {
    if (sportsList.length > 0 && (!selectedSport || !sportProgression[selectedSport])) {
      setSelectedSport(sportsList[0]);
    }
  }, [sportsList, sportProgression]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0055ff] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-muted)' }}>{t('stravaStats.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center p-8 max-w-md">
          <p className="mb-4 text-lg" style={{ color: '#dc2626' }}>{error}</p>
          <a
            href="/strava-connect"
            className="text-[#0055ff] hover:underline font-bold"
          >
            {t('stravaStats.connectAccount')}
          </a>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center p-8 max-w-md">
          <p className="mb-4 text-lg" style={{ color: 'var(--text-muted)' }}>{t('stravaStats.noActivities')}</p>
          <a
            href="/strava-connect"
            className="text-[#0055ff] hover:underline font-bold"
          >
            {t('stravaStats.connectAccount')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
            <span style={{ color: 'var(--accent-blue)' }}>STRAVA</span>
            <span style={{ color: 'var(--text-primary)' }}>{t('stravaStats.title')}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {activities.length} activités analysées
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button
            onClick={handleResync}
            disabled={resyncing}
            className="px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
            style={{ background: 'rgba(0,85,255,0.1)', border: '1px solid rgba(0,85,255,0.3)', color: 'var(--accent-blue)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,85,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,85,255,0.1)'}
          >
            <RefreshCw size={16} className={resyncing ? 'animate-spin' : ''} />
            {resyncing ? 'Lancement…' : 'Re-synchroniser tout'}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
            style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220,38,38,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220,38,38,0.1)'}
          >
            <LogOut size={16} />
            {disconnecting ? t('stravaStats.disconnecting') : t('stravaStats.disconnect')}
          </button>
        </div>
      </div>

      {resyncMessage && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(0,85,255,0.08)', border: '1px solid rgba(0,85,255,0.2)', color: 'var(--text-primary)' }}
        >
          {resyncMessage}
        </div>
      )}

      {/* Hub Data Analyse - 4 modales */}
      <DataAnalysisHub activities={activities} />

      {/* Sélecteur temporel global */}
      <TemporalSelector />

      {/* Filtres par type de sport */}
      {sportsList.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSport('All')}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={selectedSport === 'All'
              ? { background: 'var(--accent-blue)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', backdropFilter: 'blur(8px)' }
            }
          >
            Tous · {activities.length}
          </button>
          {sportsList.map((sport, i) => {
            const count = stats.find(s => s.name === sport)?.count || 0;
            return (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5"
                style={selectedSport === sport
                  ? { background: colors[i % colors.length], color: '#fff' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', backdropFilter: 'blur(8px)' }
                }
              >
                {sport} · {count}
              </button>
            );
          })}
        </div>
      )}

      <YearlyProgress />

      <div className="glass-panel p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <TrendingUp size={20} className="text-[#0055ff]" /> {t('stravaStats.globalProgression')}
          </h3>
          {filteredGlobalProgression.length > 0 && (
            <div className="flex items-baseline gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>
                <span className="opacity-70">Période :</span>{' '}
                <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(filteredGlobalProgression[0].fullDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                  {' → '}
                  {new Date(filteredGlobalProgression[filteredGlobalProgression.length - 1].fullDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                </span>
              </span>
              <span>
                <span className="opacity-70">Total :</span>{' '}
                <span className="font-bold text-[#0055ff]">
                  {filteredGlobalProgression[filteredGlobalProgression.length - 1].cumulativeDistance.toLocaleString('fr-FR')} km
                </span>
              </span>
              <span>
                <span className="opacity-70">Activités :</span>{' '}
                <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>
                  {filteredGlobalProgression.length}
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredGlobalProgression} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="cumulGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0055ff" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#0055ff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                stroke="#a8a29e"
                tickFormatter={(ts) => new Date(ts).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                minTickGap={60}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#a8a29e"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(1) + ' k' : v}`}
                unit=" km"
              />
              <Tooltip
                {...darkTooltipProps}
                labelFormatter={(ts) => new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                formatter={(value, name, payload) => {
                  if (name === 'cumulativeDistance') {
                    const activity = payload?.payload?.name || '';
                    const dailyDistance = payload?.payload?.distance;
                    return [
                      `${value.toLocaleString('fr-FR')} km cumulés${dailyDistance ? ` (+${dailyDistance} km ce jour)` : ''}`,
                      activity ? `Activité : ${activity}` : 'Distance cumulée',
                    ];
                  }
                  return [value, name];
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulativeDistance"
                stroke="#0055ff"
                strokeWidth={2.5}
                fill="url(#cumulGradient)"
                activeDot={{ r: 6, stroke: '#0055ff', strokeWidth: 2, fill: '#fff' }}
                name="Distance cumulée"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Distance totale parcourue depuis ta première activité Strava. Chaque marche correspond à une sortie.
          Survole la courbe pour voir le détail de chaque activité.
        </p>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Activity size={20} className="text-[#00f3ff]" /> {t('stravaStats.progressionBySport')}
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sportChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#a8a29e" />
              <YAxis stroke="#a8a29e" />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,85,255,0.2)', color: 'var(--text-primary)' }}
              />
              <Legend />
              {sportsList.map((sport, index) => (
                <Line
                  key={sport}
                  type="monotone"
                  dataKey={sport}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Heart size={20} className="text-[#ec4899]" /> {t('stravaStats.heartRateEvolution')}
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredGlobalProgression.filter(d => d.bpm > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                stroke="#a8a29e"
                tickFormatter={(ts) => new Date(ts).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                minTickGap={60}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#a8a29e"
                domain={['dataMin - 10', 'dataMax + 10']}
                unit=" bpm"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(19,16,20,0.97)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,85,255,0.2)', color: 'var(--text-primary)' }}
                itemStyle={{ color: '#ec4899' }}
                labelFormatter={(ts) => new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                formatter={(v, _n, p) => [`${v} bpm`, p?.payload?.name || 'FC moyenne']}
              />
              <Line type="monotone" dataKey="bpm" stroke="#ec4899" strokeWidth={2} dot={{ r: 3, fill: '#ec4899' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--text-secondary)' }}>{t('stravaStats.globalProgressionTable')}</h3>
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10" style={{ background: 'rgba(212,197,169,0.9)', backdropFilter: 'blur(8px)' }}>
              <tr className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                <th className="p-4 font-medium">{t('stravaStats.date')}</th>
                <th className="p-4 font-medium">{t('stravaStats.activity')}</th>
                <th className="p-4 font-medium">{t('stravaStats.type')}</th>
                <th className="p-4 font-medium text-right">{t('stravaStats.distance')}</th>
                <th className="p-4 font-medium text-right text-[#0055ff]">{t('stravaStats.cumulative')}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {globalProgression.slice().reverse().map((entry, index) => (
                <tr key={index} className="hover:bg-white/20 transition-colors" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td className="p-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDate(entry.fullDate)}</td>
                  <td className="p-4 font-bold" style={{ color: 'var(--text-primary)' }}>{entry.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--glass-white)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>{entry.distance}</td>
                  <td className="p-4 text-right font-mono text-[#0055ff] font-bold">{entry.cumulativeDistance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>{t('stravaStats.sportProgressionTable')}</h3>
          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="input-cyber rounded-lg px-3 py-1 text-sm focus:border-[#0055ff] outline-none"
            >
              {sportsList.map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10" style={{ background: 'rgba(212,197,169,0.9)', backdropFilter: 'blur(8px)' }}>
              <tr className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                <th className="p-4 font-medium">{t('stravaStats.date')}</th>
                <th className="p-4 font-medium">{t('stravaStats.activity')}</th>
                <th className="p-4 font-medium text-right">{t('stravaStats.distance')}</th>
                <th className="p-4 font-medium text-right" style={{ color: 'var(--accent-blue)' }}>{t('stravaStats.sportCumulative')}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {selectedSport && sportProgression[selectedSport] ? (
                sportProgression[selectedSport].map((entry, index) => (
                  <tr key={index} className="hover:bg-white/20 transition-colors" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td className="p-4 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDate(entry.fullDate)}</td>
                    <td className="p-4 font-bold" style={{ color: 'var(--text-primary)' }}>{entry.name}</td>
                    <td className="p-4 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>{entry.distance}</td>
                    <td className="p-4 text-right font-mono font-bold" style={{ color: 'var(--accent-blue)' }}>{entry.cumulativeDistance}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="p-4 text-center" style={{ color: 'var(--text-muted)' }}>{t('stravaStats.selectSport')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charge d'entraînement */}
      <TrainingLoad />

      {/* Zones de fréquence cardiaque */}
      <HeartRateZones />

      {/* Suivi équipement */}
      <GearTracker />

      {/* Objectifs sportifs */}
      <SportGoals />

      </div>
    </div>
  );
};

const StravaStats = () => (
  <TemporalProvider defaultPreset="12M">
    <StravaStatsContent />
  </TemporalProvider>
);

export default StravaStats;
