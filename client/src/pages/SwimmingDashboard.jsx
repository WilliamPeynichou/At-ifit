import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  Droplets,
  Flame,
  Gauge,
  HeartPulse,
  Medal,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Waves,
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
import { PERIODS, fetchSwimmingStats, syncSwimmingData } from '../services/stravaSwimmingApi';
import {
  formatCalories,
  formatDate,
  formatDistanceMeters,
  formatDuration,
  formatHeartRate,
  formatPercentage,
  formatSpeed,
  formatSwimPace,
  isNumber,
} from '../utils/swimmingFormatting';

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

const SWIM_TYPE_LABELS = {
  pool: 'Piscine',
  open_water: 'Eau libre',
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

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'rgba(0,85,255,0.06)', border: '1px solid rgba(0,85,255,0.12)' }}>
      <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function EmptyBlock({ children }) {
  return <div className="min-h-36 flex items-center justify-center text-center text-sm px-4" style={{ color: 'var(--text-muted)' }}>{children}</div>;
}

function ChartBox({ children, empty, height = 280 }) {
  if (empty) return <EmptyBlock>{empty}</EmptyBlock>;
  return <div style={{ height }} className="w-full">{children}</div>;
}

function SwimmingHeader({ status, activityCount, onSync, syncing, syncMessage }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
      <div>
        <h1 className="text-4xl sm:text-5xl font-black flex items-center gap-3">
          <Waves className="w-9 h-9" style={{ color: 'var(--accent-blue)' }} />
          Analyse Natation
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Analyse de vos séances de natation : volume, allure, endurance, régularité, cardio et progression.
        </p>
      </div>
      <div className="glass-card p-4 min-w-[280px]">
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <MiniHeader label="Strava" value={status?.stravaConnected ? 'Connecté' : 'Non connecté'} color={status?.stravaConnected ? '#16a34a' : '#dc2626'} />
          <MiniHeader label="Sync" value={status?.dataSynced ? 'Synchronisé' : 'En attente'} />
          <MiniHeader label="Dernière sync" value={status?.lastSyncAt ? formatDate(status.lastSyncAt) : '-'} />
          <MiniHeader label="Natation" value={`${activityCount} séances`} />
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
  const deltas = data?.comparison?.deltas || {};
  const available = data?.comparison?.available;
  const deltaText = (value) => available && isNumber(value) ? `${formatPercentage(value)} vs période précédente` : null;
  const paceDelta = available && isNumber(deltas.paceSeconds)
    ? `${deltas.paceSeconds > 0 ? '+' : ''}${deltas.paceSeconds} sec/100m vs période précédente`
    : null;
  const hrDelta = available && isNumber(deltas.heartRate)
    ? `${deltas.heartRate > 0 ? '+' : ''}${deltas.heartRate} bpm vs période précédente`
    : null;
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard label="Distance totale" value={formatDistanceMeters(stats.totalDistanceMeters || 0)} delta={deltaText(deltas.distance)} kind={deltaKind(deltas.distance)} icon={<Droplets className="w-4 h-4" />} />
      <KpiCard label="Séances" value={stats.activityCount || 0} delta={deltaText(deltas.activityCount)} kind={deltaKind(deltas.activityCount)} icon={<Activity className="w-4 h-4" />} />
      <KpiCard label="Temps total" value={formatDuration(stats.totalMovingTimeMinutes)} delta={deltaText(deltas.movingTime)} kind={deltaKind(deltas.movingTime)} icon={<Clock className="w-4 h-4" />} />
      <KpiCard label="Allure moyenne" value={formatSwimPace(stats.averagePaceMinPer100m)} delta={paceDelta} kind={deltaKind(deltas.paceSeconds, true)} icon={<Gauge className="w-4 h-4" />} />
      <KpiCard label="Vitesse moyenne" value={stats.averageSpeedKmh?.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) || '-'} unit="km/h" delta={deltaText(deltas.speed)} kind={deltaKind(deltas.speed)} icon={<TrendingUp className="w-4 h-4" />} />
      <KpiCard label="Distance moyenne" value={formatDistanceMeters(stats.averageDistanceMeters || 0)} delta={null} icon={<Droplets className="w-4 h-4" />} />
      <KpiCard label="Durée moyenne" value={formatDuration(stats.averageDurationMinutes)} delta={null} icon={<Clock className="w-4 h-4" />} />
      <KpiCard label="FC moyenne" value={stats.averageHeartRate || '-'} unit={stats.averageHeartRate ? 'bpm' : ''} delta={hrDelta} kind={deltaKind(deltas.heartRate, true)} icon={<HeartPulse className="w-4 h-4" />} />
      <KpiCard label="Calories" value={stats.totalCalories?.toLocaleString('fr-FR') || '-'} unit={stats.totalCalories ? 'kcal' : ''} delta={deltaText(deltas.calories)} icon={<Flame className="w-4 h-4" />} />
      <KpiCard label="Plus longue séance" value={stats.longestSwim ? formatDistanceMeters(stats.longestSwim.distanceMeters) : '-'} delta={stats.longestSwim ? formatDate(stats.longestSwim.startDate) : null} icon={<Trophy className="w-4 h-4" />} />
      <KpiCard label="Meilleure allure" value={stats.bestPaceSwim ? formatSwimPace(stats.bestPaceSwim.averagePaceMinPer100m) : '-'} delta={stats.bestPaceSwim ? `${formatDistanceMeters(stats.bestPaceSwim.distanceMeters)} · ${formatDate(stats.bestPaceSwim.startDate)}` : null} icon={<Medal className="w-4 h-4" />} />
      <KpiCard label="Charge estimée" value={stats.totalTrainingLoad?.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) || '0'} delta={deltaText(deltas.load)} kind={deltaKind(deltas.load, true)} icon={<ShieldAlert className="w-4 h-4" />} />
      <KpiCard label="Séances / semaine" value={stats.averageSwimsPerWeek?.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) || '0'} delta={deltaText(deltas.swimsPerWeek)} kind={deltaKind(deltas.swimsPerWeek)} icon={<Calendar className="w-4 h-4" />} />
      <KpiCard label="Piscine" value={stats.poolSessionCount || 0} unit="séances" delta={stats.poolDistanceMeters ? formatDistanceMeters(stats.poolDistanceMeters) : null} icon={<Waves className="w-4 h-4" />} />
      <KpiCard label="Eau libre" value={stats.openWaterSessionCount || 0} unit="séances" delta={stats.openWaterDistanceMeters ? formatDistanceMeters(stats.openWaterDistanceMeters) : null} icon={<Droplets className="w-4 h-4" />} />
    </section>
  );
}

function VolumeSection({ weeklyStats }) {
  const last = weeklyStats.at(-1);
  const previous = weeklyStats.slice(-5, -1);
  const avg4 = previous.length ? previous.reduce((sum, week) => sum + week.totalDistanceMeters, 0) / previous.length : null;
  const delta = last && avg4 ? (last.totalDistanceMeters - avg4) / avg4 : null;
  const note = !weeklyStats.length
    ? 'Aucune donnée hebdomadaire disponible.'
    : delta === null
      ? 'Les comparaisons de volume nécessitent plusieurs semaines.'
      : Math.abs(delta) < 0.08
        ? 'Votre volume de nage est stable sur la période.'
        : delta > 0.3
          ? 'Votre volume augmente fortement cette semaine. Cette hausse doit être interprétée avec prudence.'
          : delta > 0
            ? `Votre volume hebdomadaire augmente de ${formatPercentage(delta)} vs moyenne 4 semaines.`
            : `Votre volume hebdomadaire baisse de ${formatPercentage(delta)}. Cela peut correspondre à une récupération.`;
  return (
    <Section title="Volume d’entraînement" icon={<BarChart3 className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={note}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartBox empty={!weeklyStats.length && 'Pas assez de données pour tracer le volume.'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip {...chartTooltip} formatter={(value) => [formatDistanceMeters(value), 'Distance']} />
              <Bar dataKey="totalDistanceMeters" fill="#0055ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={!weeklyStats.length && 'Pas assez de données.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip {...chartTooltip} formatter={(value) => [value, 'Séances']} />
              <Line type="monotone" dataKey="activityCount" stroke="#16a34a" strokeWidth={2} name="Séances" />
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
          <YAxis dataKey={yKey} name={yLabel} type="number" tickFormatter={yFormatter} width={76} reversed={yKey.includes('Pace')} />
          <Tooltip {...chartTooltip} formatter={(value, name) => [name === yLabel ? yFormatter(value) : xFormatter(value), name]} />
          <Scatter data={data} fill={color} name={yLabel} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartBox>
  );
}

function PaceSection({ activities, weeklyStats }) {
  const sessions = activities.filter(a => a.averagePaceMinPer100m).map(a => ({ ...a, label: new Date(a.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }));
  return (
    <Section title="Allure de nage" icon={<Gauge className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside="Une allure au 100 m plus basse indique une séance plus rapide.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartBox empty={sessions.length < 2 && 'Pas assez de séances avec allure.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis reversed tickFormatter={formatSwimPace} width={76} />
              <Tooltip {...chartTooltip} formatter={(value) => [formatSwimPace(value), 'Allure']} />
              <Line type="monotone" dataKey="averagePaceMinPer100m" stroke="#0055ff" strokeWidth={2} dot={{ r: 3 }} name="Allure séance" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={weeklyStats.filter(w => w.averagePaceMinPer100m).length < 2 && 'Pas assez de semaines avec allure.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyStats.filter(w => w.averagePaceMinPer100m)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis reversed tickFormatter={formatSwimPace} width={76} />
              <Tooltip {...chartTooltip} formatter={(value) => [formatSwimPace(value), 'Allure hebdo']} />
              <Line type="monotone" dataKey="averagePaceMinPer100m" stroke="#16a34a" strokeWidth={2} name="Allure hebdo" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ScatterPanel data={sessions} xKey="distanceMeters" yKey="averagePaceMinPer100m" xLabel="Distance" yLabel="Allure" xFormatter={formatDistanceMeters} yFormatter={formatSwimPace} color="#0055ff" empty="Pas assez de points distance vs allure." />
        <ScatterPanel data={sessions} xKey="movingTimeMinutes" yKey="averagePaceMinPer100m" xLabel="Durée" yLabel="Allure" xFormatter={formatDuration} yFormatter={formatSwimPace} color="#06b6d4" empty="Pas assez de points durée vs allure." />
      </div>
    </Section>
  );
}

function EnduranceSection({ stats, longSwims, activities }) {
  const lastFive = activities.slice(-5);
  const avgLastFive = lastFive.length ? lastFive.reduce((sum, a) => sum + a.distanceMeters, 0) / lastFive.length : 0;
  return (
    <Section title="Endurance" icon={<Droplets className="w-5 h-5" style={{ color: '#06b6d4' }} />} aside="Séances longues définies avec un seuil relatif à votre distance moyenne.">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <MiniStat label="Distance max" value={stats.longestSwim ? formatDistanceMeters(stats.longestSwim.distanceMeters) : '-'} />
        <MiniStat label="Durée max" value={stats.longestDurationSwim ? formatDuration(stats.longestDurationSwim.movingTimeMinutes) : '-'} />
        <MiniStat label="Moyenne 5 dernières" value={avgLastFive ? formatDistanceMeters(avgLastFive) : '-'} />
        <MiniStat label="Dernier seuil long" value={longSwims.at(-1)?.thresholdMeters ? formatDistanceMeters(longSwims.at(-1).thresholdMeters) : '-'} />
      </div>
      <ChartBox empty={!longSwims.length && 'Pas assez de données pour suivre les séances longues.'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={longSwims}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${Math.round(v)} m`} />
            <Tooltip {...chartTooltip} formatter={(value, name) => name === 'shareOfWeeklyVolume' ? [`${Math.round(value * 100)} %`, 'Part volume'] : [formatDistanceMeters(value), 'Distance longue']} />
            <Legend />
            <Line type="monotone" dataKey="longSwimDistanceMeters" stroke="#06b6d4" strokeWidth={2} name="Distance longues" />
            <Line type="monotone" dataKey="shareOfWeeklyVolume" stroke="#f97316" strokeWidth={2} name="Part volume" />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>
    </Section>
  );
}

function HeartRateSection({ data, activities, weeklyStats }) {
  const hrActivities = activities.filter(a => a.averageHeartRate);
  const coverage = Math.round((data.stats?.heartRateCoverage || 0) * 100);
  const note = coverage < 30
    ? 'Les données cardio sont trop incomplètes pour une analyse fiable.'
    : `Cardio disponible sur ${coverage} % des séances.`;
  return (
    <Section title="Cardio" icon={<HeartPulse className="w-5 h-5" style={{ color: '#dc2626' }} />} aside={note}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <MiniStat label="Couverture cardio" value={`${coverage} %`} />
        <MiniStat label="FC moyenne" value={formatHeartRate(data.stats?.averageHeartRate)} />
        <MiniStat label="Tendance allure/FC" value={data.paceHeartRateTrend?.available ? `${data.paceHeartRateTrend.paceDeltaSeconds > 0 ? '+' : ''}${data.paceHeartRateTrend.paceDeltaSeconds} sec/100m · ${data.paceHeartRateTrend.heartRateDelta > 0 ? '+' : ''}${data.paceHeartRateTrend.heartRateDelta} bpm` : 'Partielle'} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartBox empty={hrActivities.length < 2 && 'Pas assez de séances avec cardio.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hrActivities.map(a => ({ ...a, label: new Date(a.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit=" bpm" />
              <Tooltip {...chartTooltip} formatter={(value) => [`${value} bpm`, 'FC moyenne']} />
              <Line type="monotone" dataKey="averageHeartRate" stroke="#dc2626" strokeWidth={2} name="FC séance" />
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
        <ScatterPanel data={hrActivities.filter(a => a.averagePaceMinPer100m)} xKey="averagePaceMinPer100m" yKey="averageHeartRate" xLabel="Allure" yLabel="FC" xFormatter={formatSwimPace} yFormatter={formatHeartRate} color="#dc2626" empty="Pas assez de points allure vs FC." />
        <ScatterPanel data={hrActivities} xKey="distanceMeters" yKey="averageHeartRate" xLabel="Distance" yLabel="FC" xFormatter={formatDistanceMeters} yFormatter={formatHeartRate} color="#0055ff" empty="Pas assez de points distance vs FC." />
      </div>
    </Section>
  );
}

function TrainingLoadSection({ weeklyStats, ratios, status }) {
  const latest = ratios.at(-1);
  const note = status?.trainingLoadPrecision === 'heart_rate_based'
    ? 'Charge principalement basée sur la fréquence cardiaque.'
    : 'Charge estimée : précision limitée si les données cardio sont absentes ou incomplètes.';
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

function RegularitySection({ regularity, weeklyStats }) {
  return (
    <Section title="Régularité" icon={<Calendar className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={`Score : ${Math.round((regularity?.regularityScore || 0) * 100)} % · ${regularity?.interpretation || '-'}`}>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <MiniStat label="Jours entre séances" value={regularity?.averageDaysBetweenSwims ? `${regularity.averageDaysBetweenSwims} j` : '-'} />
        <MiniStat label="Plus longue pause" value={regularity?.longestGapDays ? `${regularity.longestGapDays} j` : '-'} />
        <MiniStat label="Semaines actives" value={`${regularity?.activeWeeks || 0}/${regularity?.totalWeeks || 0}`} />
        <MiniStat label="Semaines >= 2 séances" value={regularity?.weeksWithAtLeastTwoSwims || 0} />
      </div>
      <ChartBox empty={!weeklyStats.length && 'Pas assez de semaines pour mesurer la régularité.'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip {...chartTooltip} formatter={(value) => [value, 'Séances']} />
            <Bar dataKey="activityCount" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </Section>
  );
}

function PoolVsOpenWaterSection({ groups }) {
  return (
    <Section title="Piscine vs eau libre" icon={<Waves className="w-5 h-5" style={{ color: '#06b6d4' }} />} aside="Les comparaisons piscine/eau libre doivent être interprétées avec prudence.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {groups.map(group => (
          <MiniStat
            key={group.type}
            label={SWIM_TYPE_LABELS[group.type] || group.type}
            value={`${group.count} séances · ${formatDistanceMeters(group.distanceMeters)} · ${group.averagePaceMinPer100m ? formatSwimPace(group.averagePaceMinPer100m) : 'allure indisponible'}`}
          />
        ))}
      </div>
      <ChartBox empty={!groups.some(g => g.count) && 'Type de natation indisponible.'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={groups}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
            <XAxis dataKey="type" tickFormatter={(v) => SWIM_TYPE_LABELS[v] || v} />
            <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip {...chartTooltip} formatter={(value) => [formatDistanceMeters(value), 'Distance']} labelFormatter={(v) => SWIM_TYPE_LABELS[v] || v} />
            <Bar dataKey="distanceMeters" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </Section>
  );
}

function EfficiencySection({ efficiencyStats }) {
  if (!efficiencyStats?.available) {
    return (
      <Section title="Efficacité de nage" icon={<Sparkles className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside="Données techniques indisponibles">
        <EmptyBlock>Les données d’efficacité de nage ne sont pas disponibles pour ces activités.</EmptyBlock>
      </Section>
    );
  }
  return (
    <Section title="Efficacité de nage" icon={<Sparkles className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside="SWOLF et cadence dépendent du bassin, du style de nage et de la distance.">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <MiniStat label="SWOLF moyen" value={efficiencyStats.averageSwolf || '-'} />
        <MiniStat label="Couverture SWOLF" value={`${Math.round((efficiencyStats.swolfCoverage || 0) * 100)} %`} />
        <MiniStat label="Cadence moyenne" value={efficiencyStats.averageStrokeRate ? `${efficiencyStats.averageStrokeRate}` : '-'} />
        <MiniStat label="Couverture cadence" value={`${Math.round((efficiencyStats.strokeRateCoverage || 0) * 100)} %`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartBox empty={(efficiencyStats.swolfSeries || []).length < 2 && 'Pas assez de points SWOLF.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={(efficiencyStats.swolfSeries || []).map(a => ({ ...a, label: new Date(a.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip {...chartTooltip} />
              <Line type="monotone" dataKey="swolf" stroke="#0055ff" strokeWidth={2} name="SWOLF" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox empty={(efficiencyStats.strokeRateSeries || []).length < 2 && 'Pas assez de points cadence.'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={(efficiencyStats.strokeRateSeries || []).map(a => ({ ...a, label: new Date(a.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,16,20,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip {...chartTooltip} />
              <Line type="monotone" dataKey="strokeRate" stroke="#06b6d4" strokeWidth={2} name="Cadence" />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
    </Section>
  );
}

function RecordsSection({ personalBests }) {
  const records = [
    ['Plus longue distance', personalBests.longestDistance, (a) => `${formatDistanceMeters(a.distanceMeters)} · ${formatDate(a.startDate)}`],
    ['Plus longue durée', personalBests.longestDuration, (a) => `${formatDuration(a.movingTimeMinutes)} · ${formatDate(a.startDate)}`],
    ['Meilleure allure moyenne', personalBests.bestAveragePace, (a) => `${formatSwimPace(a.averagePaceMinPer100m)} · ${formatDistanceMeters(a.distanceMeters)}`],
    ['Plus gros volume hebdo', personalBests.biggestDistanceWeek, (w) => `${formatDistanceMeters(w.totalDistanceMeters)} · ${formatDate(w.weekStart)}`],
    ['Plus grosse semaine charge', personalBests.biggestLoadWeek, (w) => `${w.trainingLoad} · ${formatDate(w.weekStart)}`],
    ['Plus grande distance eau libre', personalBests.biggestOpenWaterDistance, (a) => `${formatDistanceMeters(a.distanceMeters)} · ${formatDate(a.startDate)}`],
    ['Plus grande distance piscine', personalBests.biggestPoolDistance, (a) => `${formatDistanceMeters(a.distanceMeters)} · ${formatDate(a.startDate)}`],
    ['FC basse à allure élevée', personalBests.efficientHeartRateSwim, (a) => `${formatSwimPace(a.averagePaceMinPer100m)} · ${formatHeartRate(a.averageHeartRate)}`],
  ];
  return (
    <Section title="Records calculables" icon={<Trophy className="w-5 h-5" style={{ color: '#f97316' }} />} aside="Records calculés uniquement depuis les données disponibles.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {records.map(([label, item, formatter]) => <MiniStat key={label} label={label} value={item ? formatter(item) : 'Indisponible'} />)}
      </div>
      {!personalBests.splitRecordsAvailable && (
        <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          Estimation indisponible avec les données actuelles pour les records 100 m, 400 m, 750 m, 1000 m ou 1500 m.
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
    ['Allure vs FC', correlations.paceVsHeartRate],
    ['Distance vs allure', correlations.distanceVsPace],
    ['Durée vs allure', correlations.durationVsPace],
    ['Charge vs allure', correlations.loadVsPace],
    ['SWOLF vs allure', correlations.swolfVsPace],
    ['Cadence vs allure', correlations.cadenceVsPace],
  ];
  return (
    <Section title="Corrélations" icon={<Search className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside="Corrélations simples, utiles mais à ne pas surinterpréter.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {rows.map(([label, value]) => <MiniStat key={label} label={label} value={explain(value)} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ScatterPanel data={correlations.scatter?.paceHeartRate || []} xKey="averagePaceMinPer100m" yKey="averageHeartRate" xLabel="Allure" yLabel="FC" xFormatter={formatSwimPace} yFormatter={formatHeartRate} color="#dc2626" empty="Pas assez de points allure vs FC." />
        <ScatterPanel data={correlations.scatter?.distancePace || []} xKey="distanceMeters" yKey="averagePaceMinPer100m" xLabel="Distance" yLabel="Allure" xFormatter={formatDistanceMeters} yFormatter={formatSwimPace} color="#0055ff" empty="Pas assez de points distance vs allure." />
        <ScatterPanel data={correlations.scatter?.loadPace || []} xKey="trainingLoad" yKey="averagePaceMinPer100m" xLabel="Charge" yLabel="Allure" xFormatter={(v) => `${v}`} yFormatter={formatSwimPace} color="#f97316" empty="Pas assez de points charge vs allure." />
        <ScatterPanel data={correlations.scatter?.swolfPace || []} xKey="swolf" yKey="averagePaceMinPer100m" xLabel="SWOLF" yLabel="Allure" xFormatter={(v) => `${v}`} yFormatter={formatSwimPace} color="#06b6d4" empty="SWOLF indisponible." />
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

function ActivitiesTable({ activities }) {
  const [filters, setFilters] = useState({ min: '', max: '', mode: 'all' });
  const [sort, setSort] = useState({ key: 'startDate', dir: 'desc' });
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filtered = useMemo(() => {
    const min = filters.min ? Number(filters.min) : null;
    const max = filters.max ? Number(filters.max) : null;
    return activities.filter(activity => {
      if (min !== null && activity.distanceMeters < min) return false;
      if (max !== null && activity.distanceMeters > max) return false;
      if (filters.mode === 'withHr' && !activity.averageHeartRate) return false;
      if (filters.mode === 'pool' && activity.swimType !== 'pool') return false;
      if (filters.mode === 'open_water' && activity.swimType !== 'open_water') return false;
      if (filters.mode === 'long' && activity.distanceMeters < 1500) return false;
      if (filters.mode === 'fast' && (!activity.averagePaceMinPer100m || activity.averagePaceMinPer100m > 2)) return false;
      if (filters.mode === 'technical' && !activity.swolf && !activity.strokeRate) return false;
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
    <Section title="Tableau détaillé des séances" icon={<Activity className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={`${filtered.length} séance(s) affichée(s)`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <input className="input-cyber" type="number" min="0" placeholder="Distance min (m)" value={filters.min} onChange={e => setFilter('min', e.target.value)} />
        <input className="input-cyber" type="number" min="0" placeholder="Distance max (m)" value={filters.max} onChange={e => setFilter('max', e.target.value)} />
        <select className="input-cyber" value={filters.mode} onChange={e => setFilter('mode', e.target.value)}>
          <option value="all">Toutes les séances</option>
          <option value="withHr">Avec cardio uniquement</option>
          <option value="pool">Piscine uniquement</option>
          <option value="open_water">Eau libre uniquement</option>
          <option value="long">Séances longues</option>
          <option value="fast">Séances rapides</option>
          <option value="technical">Données techniques disponibles</option>
        </select>
        <div className="flex items-center justify-end gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>Page {page}/{pages}</div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
              {[
                ['startDate', 'Date'],
                ['name', 'Nom'],
                ['swimType', 'Type'],
                ['distanceMeters', 'Distance'],
                ['movingTimeMinutes', 'Durée'],
                ['averagePaceMinPer100m', 'Allure 100 m'],
                ['averageSpeedKmh', 'Vitesse'],
                ['averageHeartRate', 'FC moy'],
                ['maxHeartRate', 'FC max'],
                ['calories', 'Calories'],
                ['trainingLoad', 'Charge'],
                ['swolf', 'SWOLF'],
                ['strokeRate', 'Cadence'],
                ['deviceName', 'Appareil'],
              ].map(([key, label]) => (
                <th key={key} className={`py-3 px-3 ${key === 'name' || key === 'deviceName' ? 'text-left' : 'text-right'}`}>
                  <button type="button" onClick={() => !['name', 'deviceName', 'swimType'].includes(key) ? sortBy(key) : null} className="font-bold">{label}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(activity => (
              <tr key={activity.id} style={{ borderBottom: '1px solid rgba(0,85,255,0.08)' }}>
                <td className="py-3 px-3 text-right font-mono whitespace-nowrap">{formatDate(activity.startDate)}</td>
                <td className="py-3 px-3 font-bold min-w-[220px]">{activity.name}</td>
                <td className="py-3 px-3 text-right">{SWIM_TYPE_LABELS[activity.swimType] || activity.swimType}</td>
                <td className="py-3 px-3 text-right">{formatDistanceMeters(activity.distanceMeters)}</td>
                <td className="py-3 px-3 text-right">{formatDuration(activity.movingTimeMinutes)}</td>
                <td className="py-3 px-3 text-right">{formatSwimPace(activity.averagePaceMinPer100m)}</td>
                <td className="py-3 px-3 text-right">{formatSpeed(activity.averageSpeedKmh)}</td>
                <td className="py-3 px-3 text-right">{formatHeartRate(activity.averageHeartRate)}</td>
                <td className="py-3 px-3 text-right">{formatHeartRate(activity.maxHeartRate)}</td>
                <td className="py-3 px-3 text-right">{formatCalories(activity.calories)}</td>
                <td className="py-3 px-3 text-right">{activity.trainingLoad || 0}</td>
                <td className="py-3 px-3 text-right">{activity.swolf || '-'}</td>
                <td className="py-3 px-3 text-right">{activity.strokeRate || '-'}</td>
                <td className="py-3 px-3 text-left min-w-[150px]">{activity.deviceName || '-'}</td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan={14} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>Aucune séance ne correspond aux filtres sélectionnés.</td></tr>
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

export default function SwimmingDashboard() {
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
      const response = await fetchSwimmingStats(period);
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
  }, [period.period, period.from, period.to]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    setError('');
    try {
      await syncSwimmingData();
      setSyncMessage('Synchronisation lancée. Les nouvelles séances peuvent apparaître après quelques minutes.');
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
          <p style={{ color: 'var(--text-muted)' }}>Chargement de l’analyse natation...</p>
        </div>
      </div>
    );
  }

  const notConnected = error.toLowerCase().includes('strava not connected');
  if (notConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="glass-panel p-8 text-center">
          <Waves className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-blue)' }} />
          <h1 className="text-4xl font-black mb-3">Analyse Natation</h1>
          <p className="mb-5" style={{ color: 'var(--text-muted)' }}>Connectez Strava pour analyser vos séances de natation.</p>
          <Link to="/strava-connect" className="btn-primary inline-flex">Connecter Strava</Link>
        </div>
      </div>
    );
  }

  const activities = data?.activities || [];
  const hasNoSwimmingAtAll = data && data.allSwimmingActivityCount === 0;
  const hasNoActivityInPeriod = data && data.allSwimmingActivityCount > 0 && activities.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <SwimmingHeader status={data?.status} activityCount={data?.status?.totalSwimmingActivities || 0} onSync={handleSync} syncing={syncing} syncMessage={syncMessage} />
      {error && (
        <div className="glass-card p-4 flex gap-3" style={{ color: '#dc2626' }}>
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <PeriodFilter value={period} setValue={setPeriod} />

      {hasNoSwimmingAtAll && (
        <div className="glass-panel p-8 text-center">
          <Waves className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--accent-blue)' }} />
          <p className="font-bold">Aucune activité de natation trouvée.</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Les activités course, vélo, marche et autres sports sont exclues de cette page.</p>
        </div>
      )}

      {hasNoActivityInPeriod && (
        <div className="glass-panel p-8 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--accent-blue)' }} />
          <p className="font-bold">Aucune activité de natation trouvée sur la période sélectionnée.</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Changez la période pour afficher les séances disponibles.</p>
        </div>
      )}

      {data && !hasNoSwimmingAtAll && !hasNoActivityInPeriod && (
        <>
          <Section title="Résumé global" icon={<Sparkles className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />} aside={data.status?.partialAnalysis ? 'Analyse partielle : cardio ou données techniques absentes sur certaines séances.' : 'Données complètes sur la période.'}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {data.stats.activityCount} séances analysées, {formatDistanceMeters(data.stats.totalDistanceMeters)}, {formatDuration(data.stats.totalMovingTimeMinutes)} de nage,
              allure moyenne {formatSwimPace(data.stats.averagePaceMinPer100m)}. Les comparaisons utilisent la période précédente équivalente quand elle existe.
            </p>
          </Section>
          <KpiGrid data={data} />
          <VolumeSection weeklyStats={data.weeklyStats || []} />
          <PaceSection activities={activities} weeklyStats={data.weeklyStats || []} />
          <EnduranceSection stats={data.stats || {}} longSwims={data.longSwims || []} activities={activities} />
          <HeartRateSection data={data} activities={activities} weeklyStats={data.weeklyStats || []} />
          <TrainingLoadSection weeklyStats={data.weeklyStats || []} ratios={data.trainingLoadRatios || []} status={data.status} />
          <RegularitySection regularity={data.regularity || {}} weeklyStats={data.weeklyStats || []} />
          <PoolVsOpenWaterSection groups={data.poolVsOpenWaterStats || []} />
          <EfficiencySection efficiencyStats={data.efficiencyStats || {}} />
          <RecordsSection personalBests={data.personalBests || {}} />
          <CorrelationsSection correlations={data.correlations || { scatter: {} }} />
          <ActivitiesTable activities={activities} />
          <InsightsSection insights={data.insights || []} />
        </>
      )}
    </div>
  );
}
