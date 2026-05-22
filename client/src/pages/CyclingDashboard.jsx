import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bike,
  Calendar,
  Clock,
  Flame,
  Gauge,
  HeartPulse,
  Medal,
  Mountain,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { PERIODS, fetchCyclingStats, syncCyclingData } from '../services/stravaCyclingApi';
import {
  formatCadence,
  formatCalories,
  formatDate,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHeartRate,
  formatPercentage,
  formatPower,
  formatPowerToWeight,
  formatSpeed,
  isNumber,
} from '../utils/cyclingFormatting';

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

const RIDE_TYPE_LABELS = {
  road: 'Route',
  gravel: 'Gravel',
  virtual: 'Virtuel',
  ebike: 'VAE',
  unknown: 'Non précisé',
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
        <h2 className="text-xl font-bold flex items-center gap-2">{icon}{title}</h2>
        {aside && <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{aside}</div>}
      </div>
      {children}
    </section>
  );
}

function EmptyBlock({ children }) {
  return <div className="min-h-36 flex items-center justify-center text-center text-sm px-4" style={{ color: 'var(--text-muted)' }}>{children}</div>;
}

function ChartBox({ children, empty, height = 280 }) {
  if (empty) return <EmptyBlock>{empty}</EmptyBlock>;
  return <div style={{ height }} className="w-full">{children}</div>;
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'rgba(0,85,255,0.06)', border: '1px solid rgba(0,85,255,0.12)' }}>
      <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function CyclingHeader({ status, activityCount, onSync, syncing, syncMessage }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
      <div>
        <h1 className="text-4xl sm:text-5xl font-black flex items-center gap-3">
          <Bike className="w-9 h-9" style={{ color: 'var(--accent-blue)' }} />
          Analyse Cyclisme Route
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Analyse de vos sorties vélo : volume, vitesse, dénivelé, cardio, puissance, charge et progression.
        </p>
      </div>
      <div className="glass-card p-4 min-w-[300px]">
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <MiniHeader label="Strava" value={status?.stravaConnected ? 'Connecté' : 'Non connecté'} color={status?.stravaConnected ? '#16a34a' : '#dc2626'} />
          <MiniHeader label="Sync" value={status?.dataSynced ? 'Synchronisé' : 'En attente'} />
          <MiniHeader label="Dernière sync" value={status?.lastSyncAt ? formatDate(status.lastSyncAt) : '-'} />
          <MiniHeader label="Sorties" value={`${activityCount} analysées`} />
        </div>
        <button type="button" onClick={onSync} disabled={syncing} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Synchronisation...' : 'Synchroniser'}
        </button>
        {syncMessage && <p className="text-xs mt-3" style={{ color: 'var(--accent-blue)' }}>{syncMessage}</p>}
      </div>
    </div>
  );
}

function MiniHeader({ label, value, color }) {
  return (
    <div>
      <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function PeriodFilter({ value, setValue }) {
  const update = (key, nextValue) => setValue(prev => ({ ...prev, [key]: nextValue }));
  return (
    <Section title="Filtres de période" icon={<Calendar className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />}>
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 lg:items-end">
        <div className="lg:col-span-2">
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
        {[
          ['includeGravel', 'Inclure gravel'],
          ['includeVirtual', 'Inclure virtuel'],
          ['includeEbike', 'Inclure VAE'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm" style={{ background: 'rgba(0,85,255,0.06)', border: '1px solid rgba(0,85,255,0.12)' }}>
            <input type="checkbox" checked={Boolean(value[key])} onChange={(event) => update(key, event.target.checked)} />
            {label}
          </label>
        ))}
      </div>
      <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
        Par défaut, les sorties virtuelles et VAE sont exclues des stats route. Le gravel est inclus comme route élargie, mais reste séparé dans les tableaux.
      </p>
    </Section>
  );
}

function KpiCard({ label, value, unit, delta, kind = 'neutral', icon }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <div className="p-2 rounded-lg" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>{icon}</div>
      </div>
      <p className="text-3xl font-black leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        {value}{unit && <span className="text-base ml-1 opacity-70">{unit}</span>}
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
  const power = stats.powerStats || {};
  const deltas = data?.comparison?.deltas || {};
  const available = data?.comparison?.available;
  const deltaText = (value) => available && isNumber(value) ? `${formatPercentage(value)} vs période précédente` : null;
  const hrDelta = available && isNumber(deltas.heartRate) ? `${deltas.heartRate > 0 ? '+' : ''}${deltas.heartRate} bpm vs période précédente` : null;
  const cadenceDelta = available && isNumber(deltas.cadence) ? `${deltas.cadence > 0 ? '+' : ''}${deltas.cadence} rpm vs période précédente` : null;
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard label="Distance totale" value={formatDistance(stats.totalDistanceKm || 0)} delta={deltaText(deltas.distance)} kind={deltaKind(deltas.distance)} icon={<Bike className="w-4 h-4" />} />
      <KpiCard label="Sorties" value={stats.activityCount || 0} delta={deltaText(deltas.activityCount)} kind={deltaKind(deltas.activityCount)} icon={<Activity className="w-4 h-4" />} />
      <KpiCard label="Temps total" value={formatDuration(stats.totalMovingTimeMinutes)} delta={deltaText(deltas.movingTime)} kind={deltaKind(deltas.movingTime)} icon={<Clock className="w-4 h-4" />} />
      <KpiCard label="Vitesse moyenne" value={formatSpeed(stats.averageSpeedKmh)} delta={deltaText(deltas.speed)} kind={deltaKind(deltas.speed)} icon={<Gauge className="w-4 h-4" />} />
      <KpiCard label="Vitesse max" value={formatSpeed(stats.maxSpeedKmh)} icon={<TrendingUp className="w-4 h-4" />} />
      <KpiCard label="D+ total" value={formatElevation(stats.totalElevationGain || 0)} delta={deltaText(deltas.elevation)} kind="neutral" icon={<Mountain className="w-4 h-4" />} />
      <KpiCard label="D+ moyen" value={formatElevation(stats.averageElevationGain || 0)} icon={<Mountain className="w-4 h-4" />} />
      <KpiCard label="D+ / 100 km" value={formatElevation(stats.elevationPer100Km)} delta={deltaText(deltas.elevationPer100Km)} kind="neutral" icon={<Mountain className="w-4 h-4" />} />
      <KpiCard label="FC moyenne" value={stats.averageHeartRate || '-'} unit={stats.averageHeartRate ? 'bpm' : ''} delta={hrDelta} kind={deltaKind(deltas.heartRate, true)} icon={<HeartPulse className="w-4 h-4" />} />
      <KpiCard label="Puissance moyenne" value={power.averageWatts ? Math.round(power.averageWatts) : '-'} unit={power.averageWatts ? 'W' : ''} delta={deltaText(deltas.averageWatts)} kind={deltaKind(deltas.averageWatts)} icon={<Zap className="w-4 h-4" />} />
      <KpiCard label="Weighted watts" value={power.weightedAverageWatts ? Math.round(power.weightedAverageWatts) : '-'} unit={power.weightedAverageWatts ? 'W' : ''} delta={deltaText(deltas.weightedWatts)} kind={deltaKind(deltas.weightedWatts)} icon={<Zap className="w-4 h-4" />} />
      <KpiCard label="W/kg moyen" value={power.averagePowerToWeight ? formatPowerToWeight(power.averagePowerToWeight) : 'Poids non renseigné'} icon={<Zap className="w-4 h-4" />} />
      <KpiCard label="Kilojoules" value={power.totalKilojoules?.toLocaleString('fr-FR') || '-'} unit={power.totalKilojoules ? 'kJ' : ''} delta={deltaText(deltas.kilojoules)} icon={<Flame className="w-4 h-4" />} />
      <KpiCard label="Calories" value={stats.totalCalories?.toLocaleString('fr-FR') || '-'} unit={stats.totalCalories ? 'kcal' : ''} delta={deltaText(deltas.calories)} icon={<Flame className="w-4 h-4" />} />
      <KpiCard label="Cadence moyenne" value={stats.averageCadence || '-'} unit={stats.averageCadence ? 'rpm' : ''} delta={cadenceDelta} icon={<Gauge className="w-4 h-4" />} />
      <KpiCard label="Plus longue sortie" value={stats.longestRide ? formatDistance(stats.longestRide.distanceKm) : '-'} delta={stats.longestRide ? formatDate(stats.longestRide.startDate) : null} icon={<Trophy className="w-4 h-4" />} />
      <KpiCard label="Plus gros D+" value={stats.highestElevationRide ? formatElevation(stats.highestElevationRide.elevationGain) : '-'} delta={stats.highestElevationRide ? formatDistance(stats.highestElevationRide.distanceKm) : null} icon={<Mountain className="w-4 h-4" />} />
      <KpiCard label="Charge estimée" value={stats.totalTrainingLoad?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) || '0'} delta={deltaText(deltas.load)} kind={deltaKind(deltas.load, true)} icon={<ShieldAlert className="w-4 h-4" />} />
      <KpiCard label="Sorties / semaine" value={stats.averageRidesPerWeek?.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) || '0'} delta={deltaText(deltas.ridesPerWeek)} kind={deltaKind(deltas.ridesPerWeek)} icon={<Calendar className="w-4 h-4" />} />
    </section>
  );
}

function VolumeSection({ weeklyStats }) {
  const last = weeklyStats.at(-1);
  const previous = weeklyStats.slice(-5, -1);
  const avg4 = previous.length ? previous.reduce((sum, week) => sum + week.totalDistanceKm, 0) / previous.length : null;
  const delta = last && avg4 ? (last.totalDistanceKm - avg4) / avg4 : null;
  const note = !weeklyStats.length
    ? 'Aucune donnée hebdomadaire disponible.'
    : delta === null ? 'Les comparaisons de volume nécessitent plusieurs semaines.'
      : Math.abs(delta) < 0.08 ? 'Votre volume vélo est stable sur la période.'
        : delta > 0.3 ? 'Votre volume augmente fortement cette semaine. Cette hausse doit être surveillée si elle se répète.'
          : delta > 0 ? `Votre volume hebdomadaire augmente de ${formatPercentage(delta)} vs moyenne 4 semaines.`
            : `Votre volume hebdomadaire baisse de ${formatPercentage(delta)}. Cela peut correspondre à une récupération.`;
  return (
    <Section title="Volume d’entraînement" icon={<BarChart3 className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={note}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartBox empty={!weeklyStats.length && 'Pas assez de données pour tracer le volume.'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" km" />
              <Tooltip {...chartTooltip} formatter={(value) => [formatDistance(value), 'Distance']} />
              <Bar dataKey="totalDistanceKm" fill="#0055ff" radius={[4, 4, 0, 0]} />
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
            <BarChart data={weeklyStats.map(w => ({ ...w, hours: Number((w.totalMovingTimeMinutes / 60).toFixed(2)) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" h" />
              <Tooltip {...chartTooltip} formatter={(value) => [`${value} h`, 'Durée']} />
              <Bar dataKey="hours" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
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
          <XAxis dataKey={xKey} name={xLabel} type="number" tickFormatter={xFormatter} />
          <YAxis dataKey={yKey} name={yLabel} type="number" tickFormatter={yFormatter} width={76} />
          <Tooltip {...chartTooltip} formatter={(value, name) => [name === yLabel ? yFormatter(value) : xFormatter(value), name]} />
          <Scatter data={data} fill={color} name={yLabel} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartBox>
  );
}

function SpeedSection({ activities, weeklyStats }) {
  const rides = activities.filter(a => a.averageSpeedKmh).map(a => ({ ...a, label: new Date(a.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }));
  return (
    <Section title="Vitesse" icon={<Gauge className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside="La vitesse doit être comparée sur des parcours similaires.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartBox empty={rides.length < 2 && 'Pas assez de sorties avec vitesse.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rides}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" km/h" />
              <Tooltip {...chartTooltip} formatter={(value) => [formatSpeed(value), 'Vitesse']} />
              <Line type="monotone" dataKey="averageSpeedKmh" stroke="#0055ff" strokeWidth={2} dot={{ r: 3 }} name="Vitesse sortie" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={weeklyStats.filter(w => w.averageSpeedKmh).length < 2 && 'Pas assez de semaines avec vitesse.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyStats.filter(w => w.averageSpeedKmh)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" km/h" />
              <Tooltip {...chartTooltip} formatter={(value) => [formatSpeed(value), 'Vitesse hebdo']} />
              <Line type="monotone" dataKey="averageSpeedKmh" stroke="#16a34a" strokeWidth={2} name="Vitesse hebdo" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ScatterPanel data={rides} xKey="distanceKm" yKey="averageSpeedKmh" xLabel="Distance" yLabel="Vitesse" xFormatter={formatDistance} yFormatter={formatSpeed} color="#0055ff" empty="Pas assez de points distance vs vitesse." />
        <ScatterPanel data={rides.filter(a => a.elevationPerKm)} xKey="elevationPerKm" yKey="averageSpeedKmh" xLabel="D+ / km" yLabel="Vitesse" xFormatter={(v) => `${Math.round(v)} m/km`} yFormatter={formatSpeed} color="#f97316" empty="Pas assez de points D+ vs vitesse." />
      </div>
    </Section>
  );
}

function ElevationSection({ data, weeklyStats, activities }) {
  const points = activities.filter(a => a.averageSpeedKmh);
  return (
    <Section title="Dénivelé" icon={<Mountain className="w-5 h-5" style={{ color: '#795548' }} />} aside={`Ratio moyen : ${formatElevation(data.stats?.elevationPer100Km)} / 100 km`}>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <MiniStat label="D+ total" value={formatElevation(data.stats?.totalElevationGain)} />
        <MiniStat label="D+ moyen" value={formatElevation(data.stats?.averageElevationGain)} />
        <MiniStat label="D+ / km" value={data.stats?.elevationPerKm ? `${data.stats.elevationPerKm} m/km` : '-'} />
        <MiniStat label="Plus gros D+" value={data.stats?.highestElevationRide ? `${formatElevation(data.stats.highestElevationRide.elevationGain)} · ${formatDistance(data.stats.highestElevationRide.distanceKm)}` : '-'} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartBox empty={!weeklyStats.length && 'Pas assez de données.'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" m" />
              <Tooltip {...chartTooltip} formatter={(value) => [formatElevation(value), 'D+']} />
              <Bar dataKey="elevationGain" fill="#795548" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ScatterPanel data={points.filter(a => a.elevationPerKm)} xKey="elevationPerKm" yKey="averageSpeedKmh" xLabel="D+ / km" yLabel="Vitesse" xFormatter={(v) => `${Math.round(v)} m/km`} yFormatter={formatSpeed} color="#795548" empty="Pas assez de points D+ / km vs vitesse." />
        <ScatterPanel data={points} xKey="elevationGain" yKey="averageSpeedKmh" xLabel="D+" yLabel="Vitesse" xFormatter={formatElevation} yFormatter={formatSpeed} color="#f97316" empty="Pas assez de points D+ total vs vitesse." />
      </div>
    </Section>
  );
}

function HeartRateSection({ data, activities, weeklyStats }) {
  const hrActivities = activities.filter(a => a.averageHeartRate);
  const coverage = Math.round((data.stats?.heartRateCoverage || 0) * 100);
  const note = coverage < 30 ? 'Les données cardio sont trop incomplètes pour une analyse fiable.' : `Cardio disponible sur ${coverage} % des sorties.`;
  return (
    <Section title="Cardio" icon={<HeartPulse className="w-5 h-5" style={{ color: '#dc2626' }} />} aside={note}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <MiniStat label="Couverture cardio" value={`${coverage} %`} />
        <MiniStat label="FC moyenne" value={formatHeartRate(data.stats?.averageHeartRate)} />
        <MiniStat label="Tendance vitesse/FC" value={data.speedHeartRateTrend?.available ? `${data.speedHeartRateTrend.speedDelta > 0 ? '+' : ''}${data.speedHeartRateTrend.speedDelta} km/h · ${data.speedHeartRateTrend.heartRateDelta > 0 ? '+' : ''}${data.speedHeartRateTrend.heartRateDelta} bpm` : 'Partielle'} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartBox empty={hrActivities.length < 2 && 'Pas assez de sorties avec cardio.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hrActivities.map(a => ({ ...a, label: new Date(a.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" bpm" />
              <Tooltip {...chartTooltip} formatter={(value) => [formatHeartRate(value), 'FC moyenne']} />
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
              <Tooltip {...chartTooltip} formatter={(value) => [formatHeartRate(value), 'FC hebdo']} />
              <Line type="monotone" dataKey="averageHeartRate" stroke="#f97316" strokeWidth={2} name="FC hebdo" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ScatterPanel data={hrActivities} xKey="averageSpeedKmh" yKey="averageHeartRate" xLabel="Vitesse" yLabel="FC" xFormatter={formatSpeed} yFormatter={formatHeartRate} color="#dc2626" empty="Pas assez de points vitesse vs FC." />
        <ScatterPanel data={hrActivities.filter(a => a.averageWatts)} xKey="averageWatts" yKey="averageHeartRate" xLabel="Puissance" yLabel="FC" xFormatter={formatPower} yFormatter={formatHeartRate} color="#0055ff" empty="Pas assez de points puissance vs FC." />
      </div>
    </Section>
  );
}

function PowerSection({ data, activities, weeklyStats }) {
  const power = data.stats?.powerStats || {};
  const powerActivities = activities.filter(a => a.averageWatts || a.weightedAverageWatts);
  const measuredPct = Math.round((power.measuredCoverage || 0) * 100);
  const estimatedPct = Math.round((power.estimatedCoverage || 0) * 100);
  const coveragePct = Math.round((power.coverage || 0) * 100);
  if (!powerActivities.length) {
    return (
      <Section title="Puissance" icon={<Zap className="w-5 h-5" style={{ color: '#f97316' }} />} aside="Données puissance indisponibles">
        <EmptyBlock>Les données de puissance ne sont pas disponibles pour ces sorties.</EmptyBlock>
      </Section>
    );
  }
  return (
    <Section title="Puissance" icon={<Zap className="w-5 h-5" style={{ color: '#f97316' }} />} aside={`${coveragePct} % avec puissance · ${measuredPct} % mesurée · ${estimatedPct} % estimée`}>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-5">
        <MiniStat label="Puissance moyenne" value={formatPower(power.averageWatts)} />
        <MiniStat label="Weighted watts" value={formatPower(power.weightedAverageWatts)} />
        <MiniStat label="Max observé" value={formatPower(power.maxWatts)} />
        <MiniStat label="W/kg" value={power.averagePowerToWeight ? formatPowerToWeight(power.averagePowerToWeight) : 'Poids non renseigné'} />
        <MiniStat label="FTP" value={power.ftp ? `${power.ftp} W · ${power.ftpConfidence || 'profil'}` : 'FTP non renseigné'} />
      </div>
      {!power.ftp && <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>FTP non renseigné : les zones de puissance ne peuvent pas être calculées précisément.</p>}
      {power.ftp && power.powerZones?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 mb-5">
          {power.powerZones.map(zone => (
            <div key={zone.key} className="rounded-lg p-2 text-xs" style={{ background: 'rgba(0,85,255,0.06)', border: '1px solid rgba(0,85,255,0.12)' }}>
              <p className="font-bold">{zone.zone} · {zone.name}</p>
              <p style={{ color: 'var(--text-muted)' }}>{zone.maxWatts ? `${zone.minWatts}-${zone.maxWatts} W` : `>${zone.minWatts || 0} W`}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartBox empty={powerActivities.length < 2 && 'Pas assez de sorties avec puissance.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={powerActivities.map(a => ({ ...a, label: new Date(a.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" W" />
              <Tooltip {...chartTooltip} formatter={(value) => [formatPower(value), 'Puissance']} />
              <Legend />
              <Line type="monotone" dataKey="averageWatts" stroke="#f97316" strokeWidth={2} name="Puissance moyenne" />
              <Line type="monotone" dataKey="weightedAverageWatts" stroke="#0055ff" strokeWidth={2} name="Weighted watts" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={weeklyStats.filter(w => w.averageWatts).length < 2 && 'Pas assez de semaines avec puissance.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyStats.filter(w => w.averageWatts)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" W" />
              <Tooltip {...chartTooltip} formatter={(value) => [formatPower(value), 'Puissance hebdo']} />
              <Line type="monotone" dataKey="averageWatts" stroke="#16a34a" strokeWidth={2} name="Puissance hebdo" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ScatterPanel data={powerActivities.filter(a => a.averageSpeedKmh)} xKey="averageWatts" yKey="averageSpeedKmh" xLabel="Puissance" yLabel="Vitesse" xFormatter={formatPower} yFormatter={formatSpeed} color="#f97316" empty="Pas assez de points puissance vs vitesse." />
        <ScatterPanel data={powerActivities.filter(a => a.averageHeartRate)} xKey="averageWatts" yKey="averageHeartRate" xLabel="Puissance" yLabel="FC" xFormatter={formatPower} yFormatter={formatHeartRate} color="#dc2626" empty="Pas assez de points puissance vs FC." />
      </div>
    </Section>
  );
}

function CadenceSection({ activities, weeklyStats }) {
  const cadenceActivities = activities.filter(a => a.averageCadence);
  if (!cadenceActivities.length) {
    return (
      <Section title="Cadence" icon={<Gauge className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside="Données cadence indisponibles">
        <EmptyBlock>Les données de cadence sont insuffisantes pour une analyse fiable.</EmptyBlock>
      </Section>
    );
  }
  return (
    <Section title="Cadence" icon={<Gauge className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside="La cadence dépend du terrain, du braquet, de la fatigue et du style.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartBox empty={cadenceActivities.length < 2 && 'Pas assez de sorties avec cadence.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cadenceActivities.map(a => ({ ...a, label: new Date(a.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" rpm" />
              <Tooltip {...chartTooltip} formatter={(value) => [formatCadence(value), 'Cadence']} />
              <Line type="monotone" dataKey="averageCadence" stroke="#0055ff" strokeWidth={2} name="Cadence" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={weeklyStats.filter(w => w.activityCount).length < 2 && 'Pas assez de semaines.'}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="averageCadence" name="Cadence" tickFormatter={formatCadence} type="number" />
              <YAxis dataKey="averageSpeedKmh" name="Vitesse" tickFormatter={formatSpeed} type="number" width={76} />
              <Tooltip {...chartTooltip} formatter={(value, name) => [name === 'Vitesse' ? formatSpeed(value) : formatCadence(value), name]} />
              <Scatter data={cadenceActivities.filter(a => a.averageSpeedKmh)} fill="#16a34a" name="Cadence vs vitesse" />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartBox>
        <ScatterPanel data={cadenceActivities.filter(a => a.averageWatts)} xKey="averageCadence" yKey="averageWatts" xLabel="Cadence" yLabel="Puissance" xFormatter={formatCadence} yFormatter={formatPower} color="#f97316" empty="Pas assez de points cadence vs puissance." />
      </div>
    </Section>
  );
}

function TrainingLoadSection({ weeklyStats, ratios, status }) {
  const latest = ratios.at(-1);
  const note = status?.trainingLoadPrecision === 'power_ftp_based'
    ? 'Charge estimée depuis puissance + FTP. Ce n’est pas un TSS officiel.'
    : status?.trainingLoadPrecision === 'heart_rate_based'
      ? 'Charge principalement estimée depuis la fréquence cardiaque.'
      : 'Charge estimée : précision limitée si puissance, FTP ou cardio sont absents.';
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
              <YAxis />
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

function LongRidesSection({ longRides }) {
  const latest = longRides.at(-1);
  return (
    <Section title="Endurance et sorties longues" icon={<Bike className="w-5 h-5" style={{ color: '#16a34a' }} />} aside={latest?.shareOfWeeklyVolume ? `Dernière part hebdo : ${Math.round(latest.shareOfWeeklyVolume * 100)} %` : 'Plus longue sortie par semaine'}>
      <ChartBox empty={!longRides.length && 'Pas assez de données pour détecter les sorties longues.'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={longRides}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis unit=" km" />
            <Tooltip {...chartTooltip} formatter={(value, name) => name === 'shareOfWeeklyVolume' ? [`${Math.round(value * 100)} %`, 'Part volume'] : [formatDistance(value), 'Sortie longue']} />
            <Legend />
            <Line type="monotone" dataKey="longRideDistanceKm" stroke="#16a34a" strokeWidth={2} name="Distance longue" />
            <Line type="monotone" dataKey="shareOfWeeklyVolume" stroke="#f97316" strokeWidth={2} name="Part volume" />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
        {longRides.slice(-4).map(ride => (
          <MiniStat key={ride.weekStart} label={`Semaine du ${formatDate(ride.weekStart)}`} value={ride.activity ? `${formatDistance(ride.activity.distanceKm)} · ${formatDuration(ride.activity.movingTimeMinutes)} · ${Math.round((ride.shareOfWeeklyVolume || 0) * 100)} % du volume` : 'Aucune sortie'} />
        ))}
      </div>
    </Section>
  );
}

function RegularitySection({ regularity, weeklyStats }) {
  return (
    <Section title="Régularité" icon={<Calendar className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={`Score : ${Math.round((regularity?.regularityScore || 0) * 100)} % · ${regularity?.interpretation || '-'}`}>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <MiniStat label="Jours entre sorties" value={regularity?.averageDaysBetweenRides ? `${regularity.averageDaysBetweenRides} j` : '-'} />
        <MiniStat label="Plus longue pause" value={regularity?.longestGapDays ? `${regularity.longestGapDays} j` : '-'} />
        <MiniStat label="Semaines actives" value={`${regularity?.activeWeeks || 0}/${regularity?.totalWeeks || 0}`} />
        <MiniStat label="Semaines >= 2 sorties" value={regularity?.weeksWithAtLeastTwoRides || 0} />
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

function RecordsSection({ personalBests }) {
  const records = [
    ['Plus longue distance', personalBests.longestDistance, (a) => `${formatDistance(a.distanceKm)} · ${formatDate(a.startDate)}`],
    ['Plus longue durée', personalBests.longestDuration, (a) => `${formatDuration(a.movingTimeMinutes)} · ${formatDate(a.startDate)}`],
    ['Meilleure vitesse moyenne', personalBests.bestAverageSpeed, (a) => `${formatSpeed(a.averageSpeedKmh)} · ${formatDistance(a.distanceKm)}`],
    ['Plus gros dénivelé', personalBests.highestElevation, (a) => `${formatElevation(a.elevationGain)} · ${formatDistance(a.distanceKm)}`],
    ['Plus gros D+ / 100 km', personalBests.highestElevationPer100Km, (a) => `${formatElevation(a.elevationPer100Km)} / 100 km`],
    ['Plus grosse semaine distance', personalBests.biggestDistanceWeek, (w) => `${formatDistance(w.totalDistanceKm)} · ${formatDate(w.weekStart)}`],
    ['Plus grosse semaine charge', personalBests.biggestLoadWeek, (w) => `${w.trainingLoad} · ${formatDate(w.weekStart)}`],
    ['Meilleure puissance moyenne', personalBests.bestAverageWatts, (a) => `${formatPower(a.averageWatts)} · ${formatDistance(a.distanceKm)}`],
    ['Meilleur weighted watts', personalBests.bestWeightedAverageWatts, (a) => `${formatPower(a.weightedAverageWatts)} · ${formatDistance(a.distanceKm)}`],
    ['Plus gros kJ', personalBests.biggestKilojoules, (a) => `${Math.round(a.kilojoules)} kJ · ${formatDate(a.startDate)}`],
    ['FC basse à vitesse élevée', personalBests.efficientHeartRateSpeedRide, (a) => `${formatSpeed(a.averageSpeedKmh)} · ${formatHeartRate(a.averageHeartRate)}`],
    ['FC basse à puissance élevée', personalBests.efficientHeartRatePowerRide, (a) => `${formatPower(a.averageWatts)} · ${formatHeartRate(a.averageHeartRate)}`],
  ];
  return (
    <Section title="Records calculables" icon={<Trophy className="w-5 h-5" style={{ color: '#f97316' }} />} aside="Records calculés uniquement depuis les données disponibles.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {records.map(([label, item, formatter]) => <MiniStat key={label} label={label} value={item ? formatter(item) : 'Indisponible'} />)}
      </div>
      {!personalBests.streamRecordsAvailable && (
        <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          Estimation indisponible avec les données actuelles pour les records 5 min, 20 min, 60 min ou FTP.
        </p>
      )}
    </Section>
  );
}

function CorrelationsSection({ correlations }) {
  const explain = (value) => {
    if (!isNumber(value)) return 'Données insuffisantes';
    const abs = Math.abs(value);
    const strength = abs > 0.6 ? 'relation marquée' : abs > 0.35 ? 'relation visible' : 'relation faible';
    return `${value > 0 ? '+' : ''}${value} · ${strength}`;
  };
  const rows = [
    ['Vitesse vs FC', correlations.speedVsHeartRate],
    ['Vitesse vs puissance', correlations.speedVsPower],
    ['Puissance vs FC', correlations.powerVsHeartRate],
    ['Distance vs vitesse', correlations.distanceVsSpeed],
    ['Dénivelé vs vitesse', correlations.elevationVsSpeed],
    ['Cadence vs puissance', correlations.cadenceVsPower],
  ];
  return (
    <Section title="Corrélations" icon={<Search className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside="Corrélations simples, utiles mais à ne pas surinterpréter.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {rows.map(([label, value]) => <MiniStat key={label} label={label} value={explain(value)} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ScatterPanel data={correlations.scatter?.speedHeartRate || []} xKey="averageSpeedKmh" yKey="averageHeartRate" xLabel="Vitesse" yLabel="FC" xFormatter={formatSpeed} yFormatter={formatHeartRate} color="#dc2626" empty="Pas assez de points vitesse vs FC." />
        <ScatterPanel data={correlations.scatter?.speedPower || []} xKey="averageWatts" yKey="averageSpeedKmh" xLabel="Puissance" yLabel="Vitesse" xFormatter={formatPower} yFormatter={formatSpeed} color="#f97316" empty="Pas assez de points puissance vs vitesse." />
        <ScatterPanel data={correlations.scatter?.elevationSpeed || []} xKey="elevationPerKm" yKey="averageSpeedKmh" xLabel="D+ / km" yLabel="Vitesse" xFormatter={(v) => `${Math.round(v)} m/km`} yFormatter={formatSpeed} color="#795548" empty="Pas assez de points D+ vs vitesse." />
        <ScatterPanel data={correlations.scatter?.cadencePower || []} xKey="averageCadence" yKey="averageWatts" xLabel="Cadence" yLabel="Puissance" xFormatter={formatCadence} yFormatter={formatPower} color="#0055ff" empty="Pas assez de points cadence vs puissance." />
      </div>
    </Section>
  );
}

function InsightsSection({ insights }) {
  return (
    <Section title="Insights automatiques" icon={<Sparkles className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />}>
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

function ActivitiesTable({ activities, weightAvailable }) {
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
      if (filters.mode === 'withPower' && !activity.averageWatts && !activity.weightedAverageWatts) return false;
      if (filters.mode === 'measuredPower' && activity.powerSource !== 'measured') return false;
      if (filters.mode === 'long' && activity.distanceKm < 60) return false;
      if (filters.mode === 'fast' && (!activity.averageSpeedKmh || activity.averageSpeedKmh < 28)) return false;
      if (filters.mode === 'elevation' && activity.elevationGain < 500) return false;
      if (['road', 'gravel', 'virtual', 'ebike'].includes(filters.mode) && activity.rideType !== filters.mode) return false;
      return true;
    });
  }, [activities, filters]);
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = sort.key === 'startDate' ? new Date(a.startDate).getTime() : Number(a[sort.key]) || 0;
    const bv = sort.key === 'startDate' ? new Date(b.startDate).getTime() : Number(b[sort.key]) || 0;
    return sort.dir === 'asc' ? av - bv : bv - av;
  }), [filtered, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const visible = sorted.slice((page - 1) * perPage, page * perPage);
  const setFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };
  const sortBy = (key) => setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));
  return (
    <Section title="Tableau détaillé des sorties" icon={<Activity className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={`${filtered.length} sortie(s) affichée(s)`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <input className="input-cyber" type="number" min="0" placeholder="Distance min (km)" value={filters.min} onChange={e => setFilter('min', e.target.value)} />
        <input className="input-cyber" type="number" min="0" placeholder="Distance max (km)" value={filters.max} onChange={e => setFilter('max', e.target.value)} />
        <select className="input-cyber" value={filters.mode} onChange={e => setFilter('mode', e.target.value)}>
          <option value="all">Toutes les sorties</option>
          <option value="withHr">Avec cardio uniquement</option>
          <option value="withPower">Avec puissance uniquement</option>
          <option value="measuredPower">Puissance mesurée uniquement</option>
          <option value="long">Sorties longues</option>
          <option value="fast">Sorties rapides</option>
          <option value="elevation">Sorties avec dénivelé</option>
          <option value="road">Route uniquement</option>
          <option value="gravel">Gravel uniquement</option>
          <option value="virtual">Virtuel uniquement</option>
          <option value="ebike">VAE uniquement</option>
        </select>
        <div className="flex items-center justify-end gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>Page {page}/{pages}</div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
              {[
                ['startDate', 'Date'], ['name', 'Nom'], ['rideType', 'Type'], ['distanceKm', 'Distance'], ['movingTimeMinutes', 'Durée'],
                ['averageSpeedKmh', 'Vit. moy'], ['maxSpeedKmh', 'Vit. max'], ['elevationGain', 'D+'], ['averageHeartRate', 'FC moy'],
                ['maxHeartRate', 'FC max'], ['averageWatts', 'Watts'], ['weightedAverageWatts', 'Weighted'], ['averagePowerToWeight', 'W/kg'],
                ['averageCadence', 'Cadence'], ['kilojoules', 'kJ'], ['calories', 'Calories'], ['trainingLoad', 'Charge'], ['deviceName', 'Appareil'],
              ].map(([key, label]) => (
                <th key={key} className={`py-3 px-3 ${key === 'name' || key === 'deviceName' ? 'text-left' : 'text-right'}`}>
                  <button type="button" onClick={() => !['name', 'deviceName', 'rideType'].includes(key) ? sortBy(key) : null} className="font-bold">{label}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(activity => (
              <tr key={activity.id} style={{ borderBottom: '1px solid rgba(0,85,255,0.08)' }}>
                <td className="py-3 px-3 text-right font-mono whitespace-nowrap">{formatDate(activity.startDate)}</td>
                <td className="py-3 px-3 font-bold min-w-[220px]">{activity.name}</td>
                <td className="py-3 px-3 text-right">{RIDE_TYPE_LABELS[activity.rideType] || activity.rideType}</td>
                <td className="py-3 px-3 text-right">{formatDistance(activity.distanceKm)}</td>
                <td className="py-3 px-3 text-right">{formatDuration(activity.movingTimeMinutes)}</td>
                <td className="py-3 px-3 text-right">{formatSpeed(activity.averageSpeedKmh)}</td>
                <td className="py-3 px-3 text-right">{formatSpeed(activity.maxSpeedKmh)}</td>
                <td className="py-3 px-3 text-right">{formatElevation(activity.elevationGain)}</td>
                <td className="py-3 px-3 text-right">{formatHeartRate(activity.averageHeartRate)}</td>
                <td className="py-3 px-3 text-right">{formatHeartRate(activity.maxHeartRate)}</td>
                <td className="py-3 px-3 text-right">{formatPower(activity.averageWatts)}</td>
                <td className="py-3 px-3 text-right">{formatPower(activity.weightedAverageWatts)}</td>
                <td className="py-3 px-3 text-right">{weightAvailable ? formatPowerToWeight(activity.averagePowerToWeight) : '-'}</td>
                <td className="py-3 px-3 text-right">{formatCadence(activity.averageCadence)}</td>
                <td className="py-3 px-3 text-right">{activity.kilojoules ? `${Math.round(activity.kilojoules)} kJ` : '-'}</td>
                <td className="py-3 px-3 text-right">{formatCalories(activity.calories)}</td>
                <td className="py-3 px-3 text-right">{activity.trainingLoad || 0}</td>
                <td className="py-3 px-3 text-left min-w-[150px]">{activity.deviceName || '-'}</td>
              </tr>
            ))}
            {!visible.length && <tr><td colSpan={18} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>Aucune sortie ne correspond aux filtres sélectionnés.</td></tr>}
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

export default function CyclingDashboard() {
  const [period, setPeriod] = useState({ period: '90D', from: '', to: '', includeGravel: true, includeVirtual: false, includeEbike: false });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetchCyclingStats(period);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de récupérer les activités pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.period, period.from, period.to, period.includeGravel, period.includeVirtual, period.includeEbike]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    setError('');
    try {
      await syncCyclingData();
      setSyncMessage('Synchronisation lancée. Les nouvelles sorties peuvent apparaître après quelques minutes.');
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
          <p style={{ color: 'var(--text-muted)' }}>Chargement de l’analyse cyclisme...</p>
        </div>
      </div>
    );
  }

  const notConnected = error.toLowerCase().includes('strava not connected');
  if (notConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="glass-panel p-8 text-center">
          <Bike className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-blue)' }} />
          <h1 className="text-4xl font-black mb-3">Analyse Cyclisme Route</h1>
          <p className="mb-5" style={{ color: 'var(--text-muted)' }}>Connectez Strava pour analyser vos sorties vélo.</p>
          <Link to="/strava-connect" className="btn-primary inline-flex">Connecter Strava</Link>
        </div>
      </div>
    );
  }

  const activities = data?.activities || [];
  const hasNoCyclingAtAll = data && data.allCyclingActivityCount === 0;
  const hasNoActivityInPeriod = data && data.allCyclingActivityCount > 0 && activities.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <CyclingHeader status={data?.status} activityCount={data?.status?.totalCyclingActivities || 0} onSync={handleSync} syncing={syncing} syncMessage={syncMessage} />
      {error && (
        <div className="glass-card p-4 flex gap-3" style={{ color: '#dc2626' }}>
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <PeriodFilter value={period} setValue={setPeriod} />

      {hasNoCyclingAtAll && (
        <div className="glass-panel p-8 text-center">
          <Bike className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--accent-blue)' }} />
          <p className="font-bold">Aucune activité de cyclisme trouvée.</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Course, natation, marche et autres sports sont exclus. Les sorties VAE sont exclues par défaut.</p>
        </div>
      )}

      {hasNoActivityInPeriod && (
        <div className="glass-panel p-8 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--accent-blue)' }} />
          <p className="font-bold">Aucune activité de cyclisme trouvée sur la période sélectionnée.</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Changez la période ou les options route/gravel/virtuel/VAE.</p>
        </div>
      )}

      {data && !hasNoCyclingAtAll && !hasNoActivityInPeriod && (
        <>
          <Section title="Résumé global" icon={<Sparkles className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={data.status?.partialAnalysis ? 'Analyse partielle : cardio ou puissance absents sur certaines sorties.' : 'Données complètes sur la période.'}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {data.stats.activityCount} sorties analysées, {formatDistance(data.stats.totalDistanceKm)}, {formatDuration(data.stats.totalMovingTimeMinutes)} de vélo,
              vitesse moyenne {formatSpeed(data.stats.averageSpeedKmh)} et {formatElevation(data.stats.totalElevationGain)} D+. Les comparaisons utilisent la période précédente équivalente quand elle existe.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              <MiniStat label="Route" value={data.stats.rideTypeCounts?.road || 0} />
              <MiniStat label="Gravel" value={data.stats.rideTypeCounts?.gravel || 0} />
              <MiniStat label="Virtuel" value={data.stats.rideTypeCounts?.virtual || 0} />
              <MiniStat label="VAE" value={data.stats.rideTypeCounts?.ebike || 0} />
              <MiniStat label="Puissance" value={`${Math.round((data.stats.powerStats?.coverage || 0) * 100)} %`} />
            </div>
          </Section>
          <KpiGrid data={data} />
          <VolumeSection weeklyStats={data.weeklyStats || []} />
          <SpeedSection activities={activities} weeklyStats={data.weeklyStats || []} />
          <ElevationSection data={data} weeklyStats={data.weeklyStats || []} activities={activities} />
          <HeartRateSection data={data} activities={activities} weeklyStats={data.weeklyStats || []} />
          <PowerSection data={data} activities={activities} weeklyStats={data.weeklyStats || []} />
          <CadenceSection activities={activities} weeklyStats={data.weeklyStats || []} />
          <TrainingLoadSection weeklyStats={data.weeklyStats || []} ratios={data.trainingLoadRatios || []} status={data.status} />
          <LongRidesSection longRides={data.longRides || []} />
          <RegularitySection regularity={data.regularity || {}} weeklyStats={data.weeklyStats || []} />
          <RecordsSection personalBests={data.personalBests || {}} />
          <CorrelationsSection correlations={data.correlations || { scatter: {} }} />
          <ActivitiesTable activities={activities} weightAvailable={data.status?.weightAvailable} />
          <InsightsSection insights={data.insights || []} />
        </>
      )}
    </div>
  );
}
