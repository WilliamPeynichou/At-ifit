import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area
} from 'recharts';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import StatsCard from './StatsCard';
import WeightForm from './WeightForm';
import UserProfile from './UserProfile';
import { Activity, Scale, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { t } = useLanguage();
  const [weights, setWeights] = useState([]);
  const [stravaActivities, setStravaActivities] = useState([]);
  const [combinedData, setCombinedData] = useState([]);
  const [intensityData, setIntensityData] = useState([]);
  const [metric, setMetric] = useState('distance');
  const [activityTypes, setActivityTypes] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const ACTIVITY_COLORS = {
    'Run': '#fc4c02',
    'Ride': '#0055ff',
    'Swim': '#a855f7',
    'Walk': '#22c55e',
    'Workout': '#eab308',
    'WeightTraining': '#ef4444',
    'Default': '#94a3b8'
  };

  const fetchData = async () => {
    try {
      const [weightsRes, userRes, stravaRes] = await Promise.allSettled([
        api.get('/weight'),
        api.get('/user'),
        api.get('/strava/activities')
      ]);

      if (weightsRes.status === 'fulfilled') setWeights(weightsRes.value.data);
      if (userRes.status === 'fulfilled') setUser(userRes.value.data);

      let activities = [];
      if (stravaRes.status === 'fulfilled') {
        activities = stravaRes.value.data;
        setStravaActivities(activities);
      }

      if (weightsRes.status === 'fulfilled') {
        processCombinedData(weightsRes.value.data, activities);
        processIntensityData(weightsRes.value.data, activities);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processCombinedData = (weightData, activityData) => {
    const dateMap = new Set();
    weightData.forEach(w => dateMap.add(new Date(w.date).toDateString()));
    activityData.forEach(a => dateMap.add(new Date(a.start_date).toDateString()));

    const sortedDates = Array.from(dateMap)
      .map(d => new Date(d))
      .sort((a, b) => a - b);

    const types = new Set();
    activityData.forEach(a => {
      if (a.type) types.add(a.type);
    });
    setActivityTypes(Array.from(types));

    let lastKnownWeight = null;
    const merged = sortedDates.map(date => {
      const dateStr = date.toDateString();

      const weightEntry = weightData.find(w => new Date(w.date).toDateString() === dateStr);
      if (weightEntry) lastKnownWeight = weightEntry.weight;

      const dayActivities = activityData.filter(a => new Date(a.start_date).toDateString() === dateStr);

      const totalDistance = dayActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
      const totalCalories = dayActivities.reduce((sum, a) => sum + (a.calories || a.kilojoules || 0), 0);

      const activitiesWithHR = dayActivities.filter(a => a.has_heartrate && a.average_heartrate);
      const avgBpm = activitiesWithHR.length > 0
        ? (activitiesWithHR.reduce((sum, a) => sum + a.average_heartrate, 0) / activitiesWithHR.length).toFixed(0)
        : null;

      const entry = {
        date: date.toISOString(),
        displayDate: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: lastKnownWeight,
        actualWeight: weightEntry ? weightEntry.weight : null,
        distance: totalDistance > 0 ? (totalDistance / 1000).toFixed(2) : null,
        calories: totalCalories > 0 ? totalCalories.toFixed(0) : null,
        bpm: avgBpm
      };

      dayActivities.forEach(a => {
        const type = a.type || 'Unknown';
        const dist = (a.distance || 0) / 1000;
        if (dist > 0) {
          entry[type] = (entry[type] || 0) + dist;
          entry[type] = parseFloat(entry[type].toFixed(2));
        }
      });

      return entry;
    });

    setCombinedData(merged);
  };

  const processIntensityData = (weightData, activityData) => {
    const dateMap = new Set();
    weightData.forEach(w => dateMap.add(new Date(w.date).toDateString()));
    activityData.forEach(a => dateMap.add(new Date(a.start_date).toDateString()));

    const sortedDates = Array.from(dateMap)
      .map(d => new Date(d))
      .sort((a, b) => a - b);

    let lastKnownWeight = null;
    const merged = sortedDates.map(date => {
      const dateStr = date.toDateString();

      const weightEntry = weightData.find(w => new Date(w.date).toDateString() === dateStr);
      if (weightEntry) lastKnownWeight = weightEntry.weight;

      const dayActivities = activityData.filter(a => new Date(a.start_date).toDateString() === dateStr);

      const entry = {
        date: date.toISOString(),
        displayDate: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: lastKnownWeight,
        actualWeight: weightEntry ? weightEntry.weight : null,
      };

      dayActivities.forEach(a => {
        const type = a.type || 'Unknown';
        if (a.suffer_score !== null && a.suffer_score !== undefined) {
          const effortKey = `${type}_effort`;
          entry[effortKey] = (entry[effortKey] || 0) + a.suffer_score;
          entry[effortKey] = parseFloat(entry[effortKey].toFixed(1));
        }
      });

      return entry;
    });

    setIntensityData(merged);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentWeight = weights.length > 0 ? weights[weights.length - 1].weight : 0;
  const startWeight = weights.length > 0 ? weights[0].weight : 0;
  const startDate = weights.length > 0 ? new Date(weights[0].date) : new Date();
  const daysPassed = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));

  const highestWeight = weights.length > 0 ? Math.max(...weights.map(w => w.weight)) : 0;
  const lowestWeight = weights.length > 0 ? Math.min(...weights.map(w => w.weight)) : 0;

  const calculateBMI = () => {
    if (!user || !user.height || !currentWeight) return { value: 0, category: 'Unknown' };
    const heightM = user.height / 100;
    const bmi = currentWeight / (heightM * heightM);
    let category = 'Normal';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi >= 25 && bmi < 30) category = 'Overweight';
    else if (bmi >= 30) category = 'Obese';
    return { value: bmi.toFixed(1), category };
  };

  const bmi = calculateBMI();

  const totalMeasurements = weights.length;

  const getWeightChange = (days) => {
    if (weights.length < 2) return 0;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);

    const pastWeight = weights.find(w => new Date(w.date) >= targetDate);

    if (!pastWeight) return 0;
    return (currentWeight - pastWeight.weight).toFixed(1);
  };

  const change7Days = getWeightChange(7);
  const change30Days = getWeightChange(30);

  const totalChange = currentWeight - startWeight;
  const avgDailyChange = daysPassed > 0 ? totalChange / daysPassed : 0;
  const avgWeeklyChange = (avgDailyChange * 7).toFixed(2);
  const avgMonthlyChange = (avgDailyChange * 30).toFixed(2);

  const targetWeight = user?.targetWeight;
  let daysToGoalDisplay = 'N/A';
  let goalStatusText = '';

  if (targetWeight && weights.length >= 3) {
    const weightDifference = currentWeight - targetWeight;
    const isGoalToLoseWeight = weightDifference > 0;
    const isGoalToGainWeight = weightDifference < 0;

    const isProgressingCorrectly =
      (isGoalToLoseWeight && avgDailyChange < 0) ||
      (isGoalToGainWeight && avgDailyChange > 0);

    if (isProgressingCorrectly && avgDailyChange !== 0) {
      const daysNeeded = Math.abs(weightDifference / avgDailyChange);
      daysToGoalDisplay = Math.ceil(daysNeeded);
      goalStatusText = t('dashboard.basedOnVelocity') || 'Basé sur la vitesse actuelle';
    } else if (Math.abs(weightDifference) < 0.5) {
      daysToGoalDisplay = '✓';
      goalStatusText = t('dashboard.goalReached') || 'Objectif atteint !';
    } else {
      daysToGoalDisplay = '—';
      goalStatusText = t('dashboard.wrongDirection') || 'Ajustez votre progression';
    }
  } else if (targetWeight && weights.length < 3) {
    goalStatusText = t('dashboard.gatheringData') || 'Collecte de données...';
  }

  const tooltipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    border: '1.5px solid var(--glass-border)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.15)',
    padding: '12px'
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-neon-cyan animate-pulse tracking-widest font-bold">INITIALIZING SYSTEM...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Help Link */}
      <div className="mb-6 flex justify-end">
        <Link
          to="/stats-explanation"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={{ background: 'rgba(0,85,255,0.1)', border: '1.5px solid rgba(0,85,255,0.25)', color: 'var(--accent-blue)' }}
        >
          <Info className="w-4 h-4" />
          {t('stats.pageTitle') || 'STATISTICS GUIDE'}
        </Link>
      </div>

      {/* Profile Section */}
      <div className="mb-8">
        <UserProfile onUpdate={fetchData} />
      </div>

      {/* BMI Status and Log Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* BMI Card */}
        <div className="flex">
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden w-full flex flex-col">
            <div className="absolute top-0 right-0 w-20 h-20 blur-3xl rounded-full" style={{ background: 'rgba(0,85,255,0.15)' }}></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(0,85,255,0.1)', border: '1.5px solid rgba(0,85,255,0.25)' }}>
                <Scale className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
              </div>
              <h2 className="text-lg font-bold tracking-wider flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                {t('dashboard.bmiStatus')}
                <Link
                  to="/stats-explanation#bmi"
                  className="p-1 rounded-full transition-all group"
                  style={{ background: 'rgba(0,85,255,0.1)', border: '1px solid rgba(0,85,255,0.25)', color: 'var(--accent-blue)' }}
                  title={t('stats.bmi.title') || 'En savoir plus sur l\'IMC'}
                >
                  <Info className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                </Link>
              </h2>
            </div>
            <div className="relative z-10">
              {user && user.height && currentWeight > 0 ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl font-black mb-2" style={{ color: 'var(--accent-blue)' }}>
                      {bmi.value}
                    </div>
                    <div className={`text-sm font-bold uppercase tracking-widest ${
                      bmi.category === 'Underweight' ? 'text-blue-500' :
                      bmi.category === 'Normal' ? 'text-green-600' :
                      bmi.category === 'Overweight' ? 'text-amber-600' :
                      'text-rose-600'
                    }`}>
                      {bmi.category}
                    </div>
                  </div>
                  <div className="pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div style={{ color: 'var(--text-muted)' }} className="mb-1">{t('dashboard.height')}</div>
                        <div className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{user.height} cm</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }} className="mb-1">{t('dashboard.weight')}</div>
                        <div className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{currentWeight} kg</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{t('dashboard.completeProfile')}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('dashboard.heightWeightRequired')}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weight Form */}
        <div className="flex">
          <WeightForm onUpdate={fetchData} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Combined Chart Section */}
          <div className="glass-panel rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: 'linear-gradient(to right, transparent, var(--accent-orange), transparent)', opacity: 0.4 }}></div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold tracking-widest flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-blue)', boxShadow: '0 0 10px var(--accent-blue)' }}></span>
                {t('dashboard.correlation')}
              </h2>

              {/* Metric Toggle */}
              <div className="flex items-center gap-2 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid var(--glass-border)' }}>
                <button
                  onClick={() => setMetric('distance')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${metric === 'distance' ? 'bg-[#fc4c02] text-white shadow-lg' : 'hover:opacity-80'}`}
                  style={metric !== 'distance' ? { color: 'var(--text-secondary)' } : {}}
                >
                  {t('dashboard.distance')}
                </button>
                <button
                  onClick={() => setMetric('calories')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${metric === 'calories' ? 'bg-[#ef4444] text-white shadow-lg' : 'hover:opacity-80'}`}
                  style={metric !== 'calories' ? { color: 'var(--text-secondary)' } : {}}
                >
                  {t('dashboard.calories')}
                  <Link
                    to="/stats-explanation#calories"
                    onClick={(e) => e.stopPropagation()}
                    className="p-0.5 rounded-full transition-all group"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                    title={t('stats.calories.title') || 'En savoir plus sur les Calories'}
                  >
                    <Info className="w-3 h-3 group-hover:scale-110 transition-transform" />
                  </Link>
                </button>
                <button
                  onClick={() => setMetric('bpm')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${metric === 'bpm' ? 'bg-[#ec4899] text-white shadow-lg' : 'hover:opacity-80'}`}
                  style={metric !== 'bpm' ? { color: 'var(--text-secondary)' } : {}}
                >
                  {t('dashboard.bpm')}
                </button>
              </div>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combinedData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#a8a29e"
                    tick={{ fill: '#78716c', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    dy={15}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#a8a29e"
                    tick={{ fill: '#78716c', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    dx={-10}
                    label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#78716c', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#a8a29e"
                    tick={{ fill: '#78716c', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    dx={10}
                    label={{
                      value: metric === 'distance' ? 'km' : metric === 'calories' ? 'kcal' : 'bpm',
                      angle: 90,
                      position: 'insideRight',
                      fill: '#78716c',
                      fontSize: 10
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  />

                  {metric === 'distance' ? (
                    activityTypes.map((type, index) => (
                      <Bar
                        key={type}
                        yAxisId="right"
                        dataKey={type}
                        name={type}
                        stackId="a"
                        fill={ACTIVITY_COLORS[type] || ACTIVITY_COLORS.Default}
                        opacity={0.8}
                        barSize={20}
                        radius={index === activityTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))
                  ) : (
                    <Bar
                      yAxisId="right"
                      dataKey={metric}
                      name={metric === 'calories' ? 'Calories' : 'Avg BPM'}
                      fill={metric === 'calories' ? '#ef4444' : '#ec4899'}
                      opacity={0.6}
                      barSize={20}
                      radius={[4, 4, 0, 0]}
                    />
                  )}

                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="weight"
                    name="Weight"
                    stroke="#0055ff"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#0055ff', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls={true}
                  />

                  {targetWeight && (
                     <Line yAxisId="left" type="monotone" dataKey={() => targetWeight} name="Target" stroke="var(--accent-orange)" strokeDasharray="6 6" dot={false} strokeWidth={2} opacity={0.6} />
                  )}

                  {metric === 'distance' && <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Second Graph: Weight vs Intensity */}
          <div className="glass-panel rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: 'linear-gradient(to right, transparent, var(--accent-orange), transparent)', opacity: 0.4 }}></div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold tracking-widest flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-blue)', boxShadow: '0 0 10px var(--accent-blue)' }}></span>
                {t('dashboard.correlation')}: {t('dashboard.relativeEffort') || 'EFFORT RELATIF'}
                <Link
                  to="/stats-explanation#relative-effort"
                  className="ml-2 p-1.5 rounded-full transition-all group"
                  style={{ background: 'rgba(0,85,255,0.1)', border: '1px solid rgba(0,85,255,0.25)', color: 'var(--accent-blue)' }}
                  title={t('stats.relativeEffort.title') || 'En savoir plus sur l\'Effort Relatif'}
                >
                  <Info className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </Link>
              </h2>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={intensityData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#a8a29e"
                    tick={{ fill: '#78716c', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    dy={15}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#a8a29e"
                    tick={{ fill: '#78716c', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    dx={-10}
                    label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#78716c', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#a8a29e"
                    tick={{ fill: '#78716c', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    dx={10}
                    domain={['auto', 'auto']}
                    label={{
                      value: t('dashboard.relativeEffort') || 'Effort relatif',
                      angle: 90,
                      position: 'insideRight',
                      fill: '#78716c',
                      fontSize: 10
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  />

                  {activityTypes.map((type, index) => {
                    const effortKey = `${type}_effort`;
                    return (
                      <Bar
                        key={type}
                        yAxisId="right"
                        dataKey={effortKey}
                        name={type}
                        stackId="effort"
                        fill={ACTIVITY_COLORS[type] || ACTIVITY_COLORS.Default}
                        opacity={0.8}
                        barSize={20}
                        radius={index === activityTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    );
                  })}

                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="weight"
                    name="Weight"
                    stroke="#0055ff"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#0055ff', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls={true}
                  />

                  {targetWeight && (
                     <Line yAxisId="left" type="monotone" dataKey={() => targetWeight} name="Target" stroke="var(--accent-orange)" strokeDasharray="6 6" dot={false} strokeWidth={2} opacity={0.6} />
                  )}

                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <StatsCard
              title={t('dashboard.startDate')}
              value={weights.length > 0 ? new Date(weights[0].date).toLocaleDateString() : '-'}
              subtext={t('dashboard.initiation')}
              color="green"
            />
            <StatsCard
              title={t('dashboard.daysActive')}
              value={daysPassed}
              subtext={t('dashboard.duration')}
              color="green"
            />
            <StatsCard
              title={t('dashboard.peakWeight')}
              value={`${highestWeight} kg`}
              color="green"
            />
            <StatsCard
              title={t('dashboard.lowestWeight')}
              value={`${lowestWeight} kg`}
              color="green"
            />
          </div>

           {/* Performance Metrics */}
           <div className="space-y-4">
             <h3 className="text-xs font-bold uppercase tracking-[0.2em] pl-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
               <span className="w-8 h-[1px]" style={{ background: 'var(--glass-border)' }}></span>
               {t('dashboard.performanceMetrics')}
             </h3>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <StatsCard
                title={t('dashboard.totalLogs')}
                value={totalMeasurements}
                color="orange"
              />
              <StatsCard
                title={t('dashboard.dayDelta')}
                value={`${change7Days > 0 ? '+' : ''}${change7Days} kg`}
                color="orange"
              />
              <StatsCard
                title={t('dashboard.dayDelta30')}
                value={`${change30Days > 0 ? '+' : ''}${change30Days} kg`}
                color="orange"
              />
              <StatsCard
                title={t('dashboard.weeklyAvg')}
                value={`${avgWeeklyChange > 0 ? '+' : ''}${avgWeeklyChange} kg`}
                color="orange"
              />
              <StatsCard
                title={t('dashboard.monthlyAvg')}
                value={`${avgMonthlyChange > 0 ? '+' : ''}${avgMonthlyChange} kg`}
                color="orange"
              />
             </div>
           </div>

           {/* Goal Estimation */}
           {targetWeight && (
             <div className="space-y-4">
               <h3 className="text-xs font-bold uppercase tracking-[0.2em] pl-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                 <span className="w-8 h-[1px]" style={{ background: 'var(--glass-border)' }}></span>
                 {t('dashboard.missionObjective')}
               </h3>
               <div className="grid grid-cols-1 gap-5">
                 <StatsCard
                  title={t('dashboard.estDaysToTarget')}
                  value={daysToGoalDisplay === 'N/A' ? 'N/A' : daysToGoalDisplay === '✓' ? '✓' : daysToGoalDisplay === '—' ? '—' : `${daysToGoalDisplay} jours`}
                  subtext={goalStatusText}
                  color="red"
                />
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Dashboard);
