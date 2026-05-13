import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  Flame,
  Gauge,
  HeartPulse,
  Medal,
  Mountain,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PERIODS, fetchRunningStats, syncRunningData } from '../services/stravaRunningApi';
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
  formatPercent,
  formatSpeed,
  isNumber,
} from '../utils/runningFormatting';

const chartTooltip = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid rgba(0,85,255,0.18)',
    color: '#131014',
    borderRadius: 8,
    boxShadow: '0 12px 28px rgba(19,16,20,0.14)',
  },
  labelStyle: { color: '#131014', fontWeight: 700 },
};

const DISTANCE_TYPES = {
  short: 'Courtes < 6 km',
  medium: 'Moyennes 6-12 km',
  long: 'Longues >= 12 km',
};

function stateColor(kind) {
  if (kind === 'good') return '#16a34a';
  if (kind === 'bad') return '#ea580c';
  return 'var(--text-muted)';
}

function deltaKind(delta, lowerIsBetter = false) {
  if (!isNumber(delta) || Math.abs(Number(delta)) < 0.001) return 'neutral';
  const positive = lowerIsBetter ? Number(delta) < 0 : Number(delta) > 0;
  return positive ? 'good' : 'bad';
}

function Section({ title, icon, children, aside }) {
  return (
    <section className="glass-panel p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {aside && <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{aside}</div>}
      </div>
      {children}
    </section>
  );
}

function EmptyBlock({ children }) {
  return (
    <div className="min-h-36 flex items-center justify-center text-center text-sm px-4" style={{ color: 'var(--text-muted)' }}>
      {children}
    </div>
  );
}

function ChartBox({ children, empty, height = 280 }) {
  if (empty) return <EmptyBlock>{empty}</EmptyBlock>;
  return <div style={{ height }} className="w-full">{children}</div>;
}

function RunningHeader({ status, activityCount, onSync, syncing, syncMessage }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
      <div>
        <h1 className="text-4xl sm:text-5xl font-black flex items-center gap-3">
          <Route className="w-9 h-9" style={{ color: 'var(--accent-blue)' }} />
          Analyse Running
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Suivi de progression basé sur vos activités de course à pied.
        </p>
      </div>

      <div className="glass-card p-4 min-w-[280px]">
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>Strava</p>
            <p className="font-bold" style={{ color: status?.stravaConnected ? '#16a34a' : '#dc2626' }}>
              {status?.stravaConnected ? 'Connecté' : 'Non connecté'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>Sync</p>
            <p className="font-bold">{status?.dataSynced ? 'Données synchronisées' : 'En attente'}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>Dernière sync</p>
            <p className="font-bold">{status?.lastSyncAt ? formatDate(status.lastSyncAt) : '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>Running</p>
            <p className="font-bold">{activityCount} activités</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Synchronisation...' : 'Synchroniser les données'}
        </button>
        {syncMessage && (
          <p className="text-xs mt-3" style={{ color: 'var(--accent-blue)' }}>{syncMessage}</p>
        )}
      </div>
    </div>
  );
}

function PeriodFilter({ value, setValue }) {
  const update = (key, nextValue) => setValue(prev => ({ ...prev, [key]: nextValue }));
  return (
    <Section title="Filtres de période" icon={<Calendar className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />}>
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Période</label>
          <select value={value.period} onChange={(event) => update('period', event.target.value)} className="input-cyber">
            {PERIODS.map(period => <option key={period.value} value={period.value}>{period.label}</option>)}
          </select>
        </div>
        {value.period === 'CUSTOM' && (
          <>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Début</label>
              <input type="date" value={value.from} onChange={(event) => update('from', event.target.value)} className="input-cyber" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Fin</label>
              <input type="date" value={value.to} onChange={(event) => update('to', event.target.value)} className="input-cyber" />
            </div>
          </>
        )}
      </div>
    </Section>
  );
}

function KpiCard({ label, value, unit, delta, kind = 'neutral', icon }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <div className="p-2 rounded-lg" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-black leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        {value}
        {unit && <span className="text-base ml-1 opacity-70">{unit}</span>}
      </p>
      <p className="text-xs mt-3 flex items-center gap-1" style={{ color: stateColor(kind) }}>
        {kind === 'good' && <TrendingUp className="w-3.5 h-3.5" />}
        {kind === 'bad' && <TrendingDown className="w-3.5 h-3.5" />}
        {delta || 'Comparaison indisponible'}
      </p>
    </div>
  );
}

function KpiGrid({ data }) {
  const stats = data?.stats || {};
  const deltas = data?.comparison?.deltas || {};
  const comparisonAvailable = data?.comparison?.available;
  const deltaText = (value) => comparisonAvailable && isNumber(value) ? `${formatPercent(value)} vs période précédente` : null;
  const paceDelta = comparisonAvailable && isNumber(deltas.paceSeconds)
    ? `${deltas.paceSeconds > 0 ? '+' : ''}${deltas.paceSeconds} sec/km vs période précédente`
    : null;
  const heartDelta = comparisonAvailable && isNumber(deltas.heartRate)
    ? `${deltas.heartRate > 0 ? '+' : ''}${deltas.heartRate} bpm vs période précédente`
    : null;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard label="Distance totale" value={stats.totalDistanceKm?.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) || '0'} unit="km" delta={deltaText(deltas.distance)} kind={deltaKind(deltas.distance)} icon={<Route className="w-4 h-4" />} />
      <KpiCard label="Nombre de sorties" value={stats.activityCount || 0} delta={deltaText(deltas.activityCount)} kind={deltaKind(deltas.activityCount)} icon={<Activity className="w-4 h-4" />} />
      <KpiCard label="Temps total" value={formatDuration(stats.totalMovingTimeMinutes)} delta={deltaText(deltas.movingTime)} kind={deltaKind(deltas.movingTime)} icon={<Clock className="w-4 h-4" />} />
      <KpiCard label="Allure moyenne" value={formatPace(stats.averagePaceMinKm)} delta={paceDelta} kind={deltaKind(deltas.paceSeconds, true)} icon={<Gauge className="w-4 h-4" />} />
      <KpiCard label="Vitesse moyenne" value={stats.averageSpeedKmh?.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) || '-'} unit="km/h" delta={deltaText(deltas.speed)} kind={deltaKind(deltas.speed)} icon={<TrendingUp className="w-4 h-4" />} />
      <KpiCard label="FC moyenne" value={stats.averageHeartRate || '-'} unit={stats.averageHeartRate ? 'bpm' : ''} delta={heartDelta} kind={deltaKind(deltas.heartRate, true)} icon={<HeartPulse className="w-4 h-4" />} />
      <KpiCard label="Dénivelé positif" value={stats.totalElevationGain || 0} unit="m D+" delta={deltaText(deltas.elevation)} kind="neutral" icon={<Mountain className="w-4 h-4" />} />
      <KpiCard label="Calories" value={stats.totalCalories?.toLocaleString('fr-FR') || '-'} unit={stats.totalCalories ? 'kcal' : ''} delta={deltaText(deltas.calories)} kind="neutral" icon={<Flame className="w-4 h-4" />} />
      <KpiCard label="Plus longue sortie" value={stats.longestRun ? stats.longestRun.distanceKm.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '-'} unit={stats.longestRun ? 'km' : ''} delta={stats.longestRun ? formatDate(stats.longestRun.startDate) : null} icon={<Trophy className="w-4 h-4" />} />
      <KpiCard label="Meilleure allure" value={stats.bestPaceRun ? formatPace(stats.bestPaceRun.averagePaceMinKm) : '-'} delta={stats.bestPaceRun ? `${formatDistance(stats.bestPaceRun.distanceKm)} · ${formatDate(stats.bestPaceRun.startDate)}` : null} icon={<Medal className="w-4 h-4" />} />
      <KpiCard label="Charge estimée" value={stats.totalTrainingLoad?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) || '0'} delta={deltaText(deltas.load)} kind={deltaKind(deltas.load, true)} icon={<ShieldAlert className="w-4 h-4" />} />
      <KpiCard label="Sorties par semaine" value={stats.averageRunsPerWeek?.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) || '0'} delta={deltaText(deltas.runsPerWeek)} kind={deltaKind(deltas.runsPerWeek)} icon={<Calendar className="w-4 h-4" />} />
    </section>
  );
}

function VolumeSection({ weeklyStats }) {
  const last = weeklyStats.at(-1);
  const previous = weeklyStats.slice(-5, -1);
  const avg4 = previous.length ? previous.reduce((sum, week) => sum + week.totalDistanceKm, 0) / previous.length : null;
  const delta = last && avg4 ? (last.totalDistanceKm - avg4) / avg4 : null;
  const biggest = weeklyStats.reduce((best, w) => !best || w.totalDistanceKm > best.totalDistanceKm ? w : best, null);
  const smallest = weeklyStats.reduce((best, w) => !best || w.totalDistanceKm < best.totalDistanceKm ? w : best, null);
  const message = !weeklyStats.length
    ? 'Aucune activité de course à pied n’a été trouvée sur cette période.'
    : delta === null
      ? 'Les comparaisons de volume nécessitent plusieurs semaines de données.'
      : Math.abs(delta) < 0.08
        ? 'Votre volume est stable sur la période sélectionnée.'
        : delta > 0.3
          ? 'Votre volume a fortement augmenté cette semaine. Surveillez la fatigue si cette hausse se répète.'
          : delta > 0
            ? `Votre volume hebdomadaire est en hausse de ${formatPercent(delta)} par rapport à la moyenne des 4 dernières semaines.`
            : `Votre volume hebdomadaire est en baisse de ${formatPercent(delta)}. Cette baisse peut correspondre à une récupération.`;

  return (
    <Section title="Volume d’entraînement" icon={<BarChart3 className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={message}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartBox empty={!weeklyStats.length && 'Pas assez de données pour tracer le volume.'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" km" />
              <Tooltip {...chartTooltip} formatter={(value) => [`${value} km`, 'Distance']} />
              <Bar dataKey="totalDistanceKm" name="Distance hebdo" fill="#0055ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={!weeklyStats.length && 'Pas assez de données.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip {...chartTooltip} formatter={(value) => [value, 'Sorties']} />
              <Line type="monotone" dataKey="activityCount" stroke="#16a34a" strokeWidth={2} name="Sorties" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={!weeklyStats.length && 'Pas assez de données.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyStats.map(w => ({ ...w, hours: Number((w.totalMovingTimeMinutes / 60).toFixed(2)) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" h" />
              <Tooltip {...chartTooltip} formatter={(value) => [`${value} h`, 'Durée']} />
              <Line type="monotone" dataKey="hours" stroke="#f97316" strokeWidth={2} name="Durée" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 text-sm">
        <MiniStat label="Volume moyen hebdo" value={weeklyStats.length ? formatDistance(weeklyStats.reduce((s, w) => s + w.totalDistanceKm, 0) / weeklyStats.length) : '-'} />
        <MiniStat label="Plus grosse semaine" value={biggest ? `${formatDistance(biggest.totalDistanceKm)} · ${biggest.label}` : '-'} />
        <MiniStat label="Semaine la plus faible" value={smallest ? `${formatDistance(smallest.totalDistanceKm)} · ${smallest.label}` : '-'} />
      </div>
    </Section>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'rgba(0,85,255,0.06)', border: '1px solid rgba(0,85,255,0.12)' }}>
      <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function PaceSection({ activities, weeklyStats }) {
  const chartActivities = activities.filter(a => a.averagePaceMinKm).map(a => ({
    ...a,
    label: new Date(a.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    distanceType: a.distanceKm < 6 ? 'short' : a.distanceKm < 12 ? 'medium' : 'long',
  }));
  const averages = ['short', 'medium', 'long'].map(key => {
    const list = chartActivities.filter(a => a.distanceType === key);
    const distance = list.reduce((sum, a) => sum + a.distanceKm, 0);
    const time = list.reduce((sum, a) => sum + a.movingTimeMinutes, 0);
    return { type: DISTANCE_TYPES[key], pace: distance > 0 ? time / distance : null };
  }).filter(item => item.pace);

  return (
    <Section title="Allure et vitesse" icon={<Gauge className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside="Une allure min/km plus basse indique une sortie plus rapide.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartBox empty={chartActivities.length < 2 && 'Pas assez de sorties avec allure pour tracer l’évolution.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartActivities}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis reversed tickFormatter={formatPace} width={70} />
              <Tooltip {...chartTooltip} formatter={(value) => [formatPace(value), 'Allure']} />
              <Line type="monotone" dataKey="averagePaceMinKm" stroke="#0055ff" strokeWidth={2} dot={{ r: 3 }} name="Allure sortie" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={weeklyStats.filter(w => w.averagePaceMinKm).length < 2 && 'Pas assez de semaines pour tracer l’allure hebdomadaire.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyStats.filter(w => w.averagePaceMinKm)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis reversed tickFormatter={formatPace} width={70} />
              <Tooltip {...chartTooltip} formatter={(value) => [formatPace(value), 'Allure moyenne']} />
              <Line type="monotone" dataKey="averagePaceMinKm" stroke="#16a34a" strokeWidth={2} name="Allure hebdo" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={chartActivities.length < 2 && 'Pas assez de points pour comparer distance et allure.'}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="distanceKm" name="Distance" unit=" km" type="number" />
              <YAxis dataKey="averagePaceMinKm" name="Allure" tickFormatter={formatPace} reversed width={70} />
              <Tooltip {...chartTooltip} formatter={(value, name) => name === 'Allure' ? [formatPace(value), name] : [value, name]} />
              <Scatter data={chartActivities} fill="#0055ff" name="Sorties" />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={!averages.length && 'Pas assez de données par type de distance.'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={averages}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} />
              <YAxis reversed tickFormatter={formatPace} width={70} />
              <Tooltip {...chartTooltip} formatter={(value) => [formatPace(value), 'Allure']} />
              <Bar dataKey="pace" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
    </Section>
  );
}

function HeartRateSection({ data, activities, weeklyStats }) {
  const hrStats = data.heartRateStats || {};
  const hrActivities = activities.filter(a => a.averageHeartRate);
  const coverage = Math.round((hrStats.coverage || 0) * 100);
  const note = hrStats.count === 0
    ? 'Les données cardio ne sont pas disponibles pour ces activités.'
    : coverage < 30
      ? `Les données cardio sont disponibles sur seulement ${coverage} % des activités. Les conclusions physiologiques doivent rester prudentes.`
      : `Cardio disponible sur ${coverage} % des activités.`;

  return (
    <Section title="Cardio" icon={<HeartPulse className="w-5 h-5" style={{ color: '#dc2626' }} />} aside={note}>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <MiniStat label="Couverture cardio" value={`${coverage} %`} />
        <MiniStat label="FC moyenne" value={hrStats.averageHeartRate ? `${hrStats.averageHeartRate} bpm` : '-'} />
        <MiniStat label="FC max observée" value={hrStats.maxHeartRateObserved ? `${hrStats.maxHeartRateObserved} bpm` : '-'} />
        <MiniStat label="Tendance allure/FC" value={data.paceHeartRateTrend?.available ? `${data.paceHeartRateTrend.paceDeltaSeconds > 0 ? '+' : ''}${data.paceHeartRateTrend.paceDeltaSeconds} sec/km · ${data.paceHeartRateTrend.heartRateDelta > 0 ? '+' : ''}${data.paceHeartRateTrend.heartRateDelta} bpm` : 'Partielle'} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartBox empty={hrActivities.length < 2 && 'Pas assez de sorties avec cardio.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hrActivities.map(a => ({ ...a, label: new Date(a.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" bpm" />
              <Tooltip {...chartTooltip} formatter={(value) => [`${value} bpm`, 'FC moyenne']} />
              <Line type="monotone" dataKey="averageHeartRate" stroke="#dc2626" strokeWidth={2} name="FC sortie" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={weeklyStats.filter(w => w.averageHeartRate).length < 2 && 'Pas assez de semaines avec cardio.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyStats.filter(w => w.averageHeartRate)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" bpm" />
              <Tooltip {...chartTooltip} formatter={(value) => [`${value} bpm`, 'FC hebdo']} />
              <Line type="monotone" dataKey="averageHeartRate" stroke="#f97316" strokeWidth={2} name="FC hebdo" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ScatterPanel data={hrActivities.filter(a => a.averagePaceMinKm)} xKey="averagePaceMinKm" yKey="averageHeartRate" xLabel="Allure" yLabel="FC" xFormatter={formatPace} yFormatter={(v) => `${v} bpm`} color="#dc2626" empty="Pas assez de données pour allure vs FC." />
        <ScatterPanel data={hrActivities} xKey="distanceKm" yKey="averageHeartRate" xLabel="Distance" yLabel="FC" xFormatter={(v) => `${v} km`} yFormatter={(v) => `${v} bpm`} color="#0055ff" empty="Pas assez de données pour distance vs FC." />
      </div>
    </Section>
  );
}

function ScatterPanel({ data, xKey, yKey, xLabel, yLabel, xFormatter, yFormatter, color, empty }) {
  return (
    <ChartBox empty={data.length < 2 && empty}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
          <XAxis dataKey={xKey} name={xLabel} tickFormatter={xFormatter} type="number" />
          <YAxis dataKey={yKey} name={yLabel} tickFormatter={yFormatter} type="number" width={70} />
          <Tooltip {...chartTooltip} formatter={(value, name) => [name === yLabel ? yFormatter(value) : xFormatter(value), name]} />
          <Scatter data={data} fill={color} name={yLabel} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartBox>
  );
}

function TrainingLoadSection({ weeklyStats, ratios, status }) {
  const latest = ratios.at(-1);
  const note = status?.trainingLoadPrecision === 'heart_rate_based'
    ? 'Charge principalement basée sur la fréquence cardiaque.'
    : 'Charge estimée sans cardio complet : précision limitée.';
  return (
    <Section title="Charge d’entraînement" icon={<ShieldAlert className="w-5 h-5" style={{ color: '#f97316' }} />} aside={latest?.ratio ? `${latest.status} · ratio ${latest.ratio}` : note}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartBox empty={!weeklyStats.length && 'Pas assez de données de charge.'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip {...chartTooltip} formatter={(value) => [value, 'Charge']} />
              <Bar dataKey="trainingLoad" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={ratios.filter(r => r.ratio).length < 2 && 'Le ratio nécessite plusieurs semaines.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ratios.filter(r => r.ratio)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 'dataMax + 0.2']} />
              <Tooltip {...chartTooltip} formatter={(value) => [value, 'Ratio charge / 4 semaines']} />
              <Line type="monotone" dataKey="ratio" stroke="#0055ff" strokeWidth={2} name="Ratio" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
      <p className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>{note}</p>
    </Section>
  );
}

function RegularitySection({ regularity, weeklyStats }) {
  return (
    <Section title="Régularité" icon={<Calendar className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={`Score : ${Math.round((regularity?.regularityScore || 0) * 100)} % · ${regularity?.interpretation || '-'}`}>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <MiniStat label="Jours entre sorties" value={regularity?.averageDaysBetweenRuns ? `${regularity.averageDaysBetweenRuns} j` : '-'} />
        <MiniStat label="Plus longue pause" value={regularity?.longestGapDays ? `${regularity.longestGapDays} j` : '-'} />
        <MiniStat label="Semaines actives" value={`${regularity?.activeWeeks || 0}/${regularity?.totalWeeks || 0}`} />
        <MiniStat label="Semaines >= 2 sorties" value={regularity?.weeksWithAtLeastTwoRuns || 0} />
      </div>
      <ChartBox empty={!weeklyStats.length && 'Pas assez de semaines pour mesurer la régularité.'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip {...chartTooltip} formatter={(value) => [value, 'Sorties']} />
            <Bar dataKey="activityCount" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </Section>
  );
}

function LongRunsSection({ longRuns }) {
  const latest = longRuns.at(-1);
  return (
    <Section title="Sorties longues" icon={<Route className="w-5 h-5" style={{ color: '#16a34a' }} />} aside={latest?.shareOfWeeklyVolume ? `Dernière part hebdo : ${Math.round(latest.shareOfWeeklyVolume * 100)} %` : 'Plus longue sortie par semaine'}>
      <ChartBox empty={!longRuns.length && 'Pas assez de données pour détecter les sorties longues.'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={longRuns}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis unit=" km" />
            <Tooltip {...chartTooltip} formatter={(value, name) => name === 'shareOfWeeklyVolume' ? [`${Math.round(value * 100)} %`, 'Part volume'] : [`${value} km`, 'Sortie longue']} />
            <Legend />
            <Line type="monotone" dataKey="longRunDistanceKm" stroke="#16a34a" strokeWidth={2} name="Distance sortie longue" />
            <Line type="monotone" dataKey="shareOfWeeklyVolume" stroke="#f97316" strokeWidth={2} name="Part du volume" yAxisId={0} />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
        {longRuns.slice(-4).map(run => (
          <MiniStat
            key={run.weekStart}
            label={`Semaine du ${formatDate(run.weekStart)}`}
            value={run.activity ? `${formatDistance(run.activity.distanceKm)} · ${formatPace(run.activity.averagePaceMinKm)} · ${Math.round((run.shareOfWeeklyVolume || 0) * 100)} % du volume` : 'Aucune sortie'}
          />
        ))}
      </div>
    </Section>
  );
}

function ElevationSection({ data, weeklyStats, activities }) {
  const points = activities.filter(a => a.averagePaceMinKm).map(a => ({
    ...a,
    elevationRatio: a.distanceKm > 0 ? a.elevationGain / a.distanceKm : null,
  }));
  return (
    <Section title="Dénivelé" icon={<Mountain className="w-5 h-5" style={{ color: '#795548' }} />} aside={`Ratio moyen : ${data.elevationStats?.averageElevationRatio || 0} m/km`}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <MiniStat label="D+ total" value={`${data.elevationStats?.totalElevationGain || 0} m`} />
        <MiniStat label="D+ moyen" value={`${data.elevationStats?.averageElevationGain || 0} m/sortie`} />
        <MiniStat label="Plus gros D+" value={data.elevationStats?.highestElevationRun ? `${data.elevationStats.highestElevationRun.elevationGain} m · ${formatDistance(data.elevationStats.highestElevationRun.distanceKm)}` : '-'} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartBox empty={!weeklyStats.length && 'Pas assez de données.'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" m" />
              <Tooltip {...chartTooltip} formatter={(value) => [`${value} m`, 'D+']} />
              <Bar dataKey="totalElevationGain" fill="#795548" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ScatterPanel data={points} xKey="elevationGain" yKey="averagePaceMinKm" xLabel="D+" yLabel="Allure" xFormatter={(v) => `${v} m`} yFormatter={formatPace} color="#795548" empty="Pas assez de points D+ vs allure." />
        <ScatterPanel data={points.filter(p => p.elevationRatio !== null)} xKey="elevationRatio" yKey="averagePaceMinKm" xLabel="m/km" yLabel="Allure" xFormatter={(v) => `${Math.round(v)} m/km`} yFormatter={formatPace} color="#f97316" empty="Pas assez de points ratio D+ vs allure." />
      </div>
    </Section>
  );
}

function RecordsSection({ personalBests }) {
  const records = [
    ['Plus longue distance', personalBests.longestDistance, (a) => `${formatDistance(a.distanceKm)} · ${formatDate(a.startDate)}`],
    ['Plus longue durée', personalBests.longestDuration, (a) => `${formatDuration(a.movingTimeMinutes)} · ${formatDate(a.startDate)}`],
    ['Meilleure allure moyenne', personalBests.bestAveragePace, (a) => `${formatPace(a.averagePaceMinKm)} · ${formatDistance(a.distanceKm)}`],
    ['Plus gros dénivelé', personalBests.highestElevation, (a) => `${a.elevationGain} m D+ · ${formatDistance(a.distanceKm)}`],
    ['Plus grosse semaine distance', personalBests.biggestDistanceWeek, (w) => `${formatDistance(w.totalDistanceKm)} · ${formatDate(w.weekStart)}`],
    ['Plus grosse semaine charge', personalBests.biggestLoadWeek, (w) => `${w.trainingLoad} · ${formatDate(w.weekStart)}`],
    ['Meilleure sortie courte', personalBests.bestShortRun, (a) => `${formatPace(a.averagePaceMinKm)} · ${formatDistance(a.distanceKm)}`],
    ['Meilleure sortie moyenne', personalBests.bestMediumRun, (a) => `${formatPace(a.averagePaceMinKm)} · ${formatDistance(a.distanceKm)}`],
    ['Meilleure sortie longue', personalBests.bestLongRun, (a) => `${formatPace(a.averagePaceMinKm)} · ${formatDistance(a.distanceKm)}`],
    ['Allure élevée avec FC basse', personalBests.efficientHeartRateRun, (a) => `${formatPace(a.averagePaceMinKm)} · ${Math.round(a.averageHeartRate)} bpm`],
  ];

  return (
    <Section title="Meilleures performances" icon={<Trophy className="w-5 h-5" style={{ color: '#f97316' }} />} aside="Records calculés depuis les résumés Strava disponibles.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {records.map(([label, item, formatter]) => (
          <MiniStat key={label} label={label} value={item ? formatter(item) : 'Indisponible'} />
        ))}
      </div>
      {!personalBests.splitRecordsAvailable && (
        <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          Estimation indisponible avec les données résumées pour les records 1 km, 5 km, 10 km, semi-marathon et marathon.
        </p>
      )}
    </Section>
  );
}

function CorrelationsSection({ correlations }) {
  const rows = [
    ['Allure vs FC moyenne', correlations.paceVsHeartRate],
    ['Distance vs allure', correlations.distanceVsPace],
    ['Dénivelé vs allure', correlations.elevationVsPace],
    ['Charge vs allure', correlations.loadVsPace],
    ['Distance vs FC', correlations.distanceVsHeartRate],
    ['D+ par km vs allure', correlations.elevationRatioVsPace],
  ];
  const explain = (value) => {
    if (!isNumber(value)) return 'Données insuffisantes';
    const abs = Math.abs(value);
    const strength = abs > 0.6 ? 'relation marquée' : abs > 0.35 ? 'relation visible' : 'relation faible';
    return `${value > 0 ? '+' : ''}${value} · ${strength}`;
  };
  return (
    <Section title="Corrélations" icon={<Search className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside="Corrélations simples, à ne pas surinterpréter.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {rows.map(([label, value]) => <MiniStat key={label} label={label} value={explain(value)} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ScatterPanel data={correlations.scatter?.paceHeartRate || []} xKey="averagePaceMinKm" yKey="averageHeartRate" xLabel="Allure" yLabel="FC" xFormatter={formatPace} yFormatter={(v) => `${v} bpm`} color="#dc2626" empty="Pas assez de points allure vs FC." />
        <ScatterPanel data={correlations.scatter?.distancePace || []} xKey="distanceKm" yKey="averagePaceMinKm" xLabel="Distance" yLabel="Allure" xFormatter={(v) => `${v} km`} yFormatter={formatPace} color="#0055ff" empty="Pas assez de points distance vs allure." />
        <ScatterPanel data={correlations.scatter?.elevationPace || []} xKey="elevationGain" yKey="averagePaceMinKm" xLabel="D+" yLabel="Allure" xFormatter={(v) => `${v} m`} yFormatter={formatPace} color="#795548" empty="Pas assez de points dénivelé vs allure." />
        <ScatterPanel data={correlations.scatter?.loadPace || []} xKey="trainingLoad" yKey="averagePaceMinKm" xLabel="Charge" yLabel="Allure" xFormatter={(v) => `${v}`} yFormatter={formatPace} color="#f97316" empty="Pas assez de points charge vs allure." />
      </div>
    </Section>
  );
}

function InsightsSection({ insights }) {
  return (
    <Section title="Analyse automatique" icon={<Sparkles className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />}>
      <div className="space-y-3">
        {(insights || []).map((insight, index) => (
          <div key={`${insight}-${index}`} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono font-bold" style={{ color: 'var(--accent-blue)' }}>{String(index + 1).padStart(2, '0')}</span>
            <p>{insight}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ActivitiesTable({ activities }) {
  const [filters, setFilters] = useState({ min: '', max: '', mode: 'all' });
  const [sort, setSort] = useState({ key: 'startDate', dir: 'desc' });
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filtered = useMemo(() => {
    const min = filters.min ? Number(filters.min) : null;
    const max = filters.max ? Number(filters.max) : null;
    return activities.filter(activity => {
      if (min !== null && activity.distanceKm < min) return false;
      if (max !== null && activity.distanceKm > max) return false;
      if (filters.mode === 'withHr' && !activity.averageHeartRate) return false;
      if (filters.mode === 'withoutHr' && activity.averageHeartRate) return false;
      if (filters.mode === 'long' && activity.distanceKm < 12) return false;
      if (filters.mode === 'fast' && (!activity.averagePaceMinKm || activity.averagePaceMinKm > 5.5)) return false;
      if (filters.mode === 'elevation' && activity.elevationGain < 100) return false;
      return true;
    });
  }, [activities, filters]);

  const sorted = useMemo(() => {
    const sortedActivities = [...filtered].sort((a, b) => {
      const av = sort.key === 'startDate' ? new Date(a.startDate).getTime() : Number(a[sort.key]) || 0;
      const bv = sort.key === 'startDate' ? new Date(b.startDate).getTime() : Number(b[sort.key]) || 0;
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
    return sortedActivities;
  }, [filtered, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const visible = sorted.slice((page - 1) * perPage, page * perPage);
  const setFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };
  const sortBy = (key) => setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));

  return (
    <Section title="Tableau détaillé des activités" icon={<Activity className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={`${filtered.length} activité(s) affichée(s)`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <input className="input-cyber" type="number" min="0" placeholder="Distance min (km)" value={filters.min} onChange={e => setFilter('min', e.target.value)} />
        <input className="input-cyber" type="number" min="0" placeholder="Distance max (km)" value={filters.max} onChange={e => setFilter('max', e.target.value)} />
        <select className="input-cyber" value={filters.mode} onChange={e => setFilter('mode', e.target.value)}>
          <option value="all">Toutes les sorties</option>
          <option value="withHr">Avec cardio uniquement</option>
          <option value="withoutHr">Sans cardio</option>
          <option value="long">Sorties longues</option>
          <option value="fast">Sorties rapides</option>
          <option value="elevation">Sorties avec dénivelé</option>
        </select>
        <div className="flex items-center justify-end gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Page {page}/{pages}
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
              {[
                ['startDate', 'Date'],
                ['name', 'Nom'],
                ['distanceKm', 'Distance'],
                ['movingTimeMinutes', 'Durée'],
                ['averagePaceMinKm', 'Allure'],
                ['averageSpeedKmh', 'Vitesse'],
                ['averageHeartRate', 'FC moy'],
                ['maxHeartRate', 'FC max'],
                ['elevationGain', 'D+'],
                ['calories', 'Calories'],
                ['trainingLoad', 'Charge'],
                ['rawType', 'Type'],
                ['deviceName', 'Appareil'],
              ].map(([key, label]) => (
                <th key={key} className={`py-3 px-3 ${key === 'name' || key === 'deviceName' ? 'text-left' : 'text-right'}`}>
                  <button type="button" onClick={() => key !== 'name' && key !== 'deviceName' && key !== 'rawType' ? sortBy(key) : null} className="font-bold">
                    {label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(activity => (
              <tr key={activity.id} style={{ borderBottom: '1px solid rgba(0,85,255,0.08)' }}>
                <td className="py-3 px-3 text-right font-mono whitespace-nowrap">{formatDate(activity.startDate)}</td>
                <td className="py-3 px-3 font-bold min-w-[220px]">{activity.name}</td>
                <td className="py-3 px-3 text-right">{formatDistance(activity.distanceKm)}</td>
                <td className="py-3 px-3 text-right">{formatDuration(activity.movingTimeMinutes)}</td>
                <td className="py-3 px-3 text-right">{formatPace(activity.averagePaceMinKm)}</td>
                <td className="py-3 px-3 text-right">{formatSpeed(activity.averageSpeedKmh)}</td>
                <td className="py-3 px-3 text-right">{activity.averageHeartRate ? `${Math.round(activity.averageHeartRate)} bpm` : '-'}</td>
                <td className="py-3 px-3 text-right">{activity.maxHeartRate ? `${Math.round(activity.maxHeartRate)} bpm` : '-'}</td>
                <td className="py-3 px-3 text-right">{activity.elevationGain || 0} m</td>
                <td className="py-3 px-3 text-right">{activity.calories || '-'}</td>
                <td className="py-3 px-3 text-right">{activity.trainingLoad || 0}</td>
                <td className="py-3 px-3 text-right">{activity.sportType || activity.rawType || 'Run'}</td>
                <td className="py-3 px-3 text-left min-w-[150px]">{activity.deviceName || '-'}</td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={13} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  Aucune activité ne correspond aux filtres sélectionnés.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn-ghost py-2 px-4" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Précédent</button>
        <button className="btn-ghost py-2 px-4" disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))}>Suivant</button>
      </div>
    </Section>
  );
}

export default function RunningDashboard() {
  const [period, setPeriod] = useState({ period: '90D', from: '', to: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetchRunningStats(period);
      setData(response.data);
    } catch (err) {
      const message = err.response?.data?.error || 'Impossible de récupérer les activités pour le moment.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.period, period.from, period.to]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    setError('');
    try {
      await syncRunningData();
      setSyncMessage('Synchronisation lancée. Les nouvelles activités peuvent apparaître après quelques minutes.');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de synchroniser les données pour le moment.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0055ff] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-muted)' }}>Chargement de l’analyse running...</p>
        </div>
      </div>
    );
  }

  const notConnected = error.toLowerCase().includes('strava not connected');

  if (notConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="glass-panel p-8 text-center">
          <Route className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-blue)' }} />
          <h1 className="text-4xl font-black mb-3">Analyse Running</h1>
          <p className="mb-5" style={{ color: 'var(--text-muted)' }}>
            Connectez Strava pour analyser vos activités de course à pied.
          </p>
          <Link to="/strava-connect" className="btn-primary inline-flex">Connecter Strava</Link>
        </div>
      </div>
    );
  }

  const activities = data?.activities || [];
  const hasNoRunningAtAll = data && data.allRunningActivityCount === 0;
  const hasNoActivityInPeriod = data && data.allRunningActivityCount > 0 && activities.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <RunningHeader
        status={data?.status}
        activityCount={data?.status?.totalRunningActivities || 0}
        onSync={handleSync}
        syncing={syncing}
        syncMessage={syncMessage}
      />

      {error && (
        <div className="glass-card p-4 flex gap-3" style={{ color: '#dc2626' }}>
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <PeriodFilter value={period} setValue={setPeriod} />

      {hasNoRunningAtAll && (
        <div className="glass-panel p-8 text-center">
          <Activity className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--accent-blue)' }} />
          <p className="font-bold">Aucune activité de course à pied n’a été trouvée.</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Les activités Ride, Walk, Hike, Swim, Workout et autres sports non-running sont exclues de cette page.
          </p>
        </div>
      )}

      {hasNoActivityInPeriod && (
        <div className="glass-panel p-8 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--accent-blue)' }} />
          <p className="font-bold">Aucune activité de course à pied n’a été trouvée sur cette période.</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Changez la période pour afficher les sorties disponibles.
          </p>
        </div>
      )}

      {data && !hasNoRunningAtAll && !hasNoActivityInPeriod && (
        <>
          <Section title="Résumé global" icon={<Sparkles className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={data.status?.partialAnalysis ? 'Certaines analyses sont limitées car toutes les activités ne contiennent pas les mêmes données.' : 'Données complètes sur la période.'}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {data.stats.activityCount} sorties analysées, {formatDistance(data.stats.totalDistanceKm)}, {formatDuration(data.stats.totalMovingTimeMinutes)} d’entraînement,
              allure moyenne {formatPace(data.stats.averagePaceMinKm)}. Les comparaisons utilisent la période précédente de même durée quand elle existe.
            </p>
          </Section>

          <KpiGrid data={data} />

          <VolumeSection weeklyStats={data.weeklyStats || []} />
          <PaceSection activities={activities} weeklyStats={data.weeklyStats || []} />
          <HeartRateSection data={data} activities={activities} weeklyStats={data.weeklyStats || []} />
          <TrainingLoadSection weeklyStats={data.weeklyStats || []} ratios={data.trainingLoadRatios || []} status={data.status} />
          <RegularitySection regularity={data.regularity || {}} weeklyStats={data.weeklyStats || []} />
          <LongRunsSection longRuns={data.longRuns || []} />
          <ElevationSection data={data} weeklyStats={data.weeklyStats || []} activities={activities} />
          <RecordsSection personalBests={data.personalBests || {}} />
          <CorrelationsSection correlations={data.correlations || { scatter: {} }} />
          <ActivitiesTable activities={activities} />
          <InsightsSection insights={data.insights || []} />
        </>
      )}
    </div>
  );
}
