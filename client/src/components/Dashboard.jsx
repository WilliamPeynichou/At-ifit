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
  const [metric, setMetric] = useState('distance'); // 'distance' | 'calories' | 'bpm'
  const [activityTypes, setActivityTypes] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const ACTIVITY_COLORS = {
    'Run': '#fc4c02',
    'Ride': '#00f3ff',
    'Swim': '#a855f7',
    'Walk': '#22c55e',
    'Workout': '#eab308',
    'WeightTraining': '#ef4444',
    'Default': '#94a3b8'
  };

  const fetchData = async () => {
    try {
      // Fetch Weight, User, and Strava Activities in parallel
      // We handle Strava failure gracefully (e.g. if not connected)
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

      // Process combined data if we have weights
      if (weightsRes.status === 'fulfilled') {
        processCombinedData(weightsRes.value.data, activities);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processCombinedData = (weightData, activityData) => {
    // 1. Create a map of all unique dates
    const dateMap = new Set();
    weightData.forEach(w => dateMap.add(new Date(w.date).toDateString()));
    activityData.forEach(a => dateMap.add(new Date(a.start_date).toDateString()));

    // 2. Convert to array and sort
    const sortedDates = Array.from(dateMap)
      .map(d => new Date(d))
      .sort((a, b) => a - b);

    // 3. Identify all unique activity types for stacking
    const types = new Set();
    activityData.forEach(a => {
      if (a.type) types.add(a.type);
    });
    setActivityTypes(Array.from(types));

    // 4. Build the combined dataset
    let lastKnownWeight = null;
    const merged = sortedDates.map(date => {
      const dateStr = date.toDateString();
      
      // Find weight for this day
      const weightEntry = weightData.find(w => new Date(w.date).toDateString() === dateStr);
      if (weightEntry) lastKnownWeight = weightEntry.weight;

      // Aggregate activities for this day
      const dayActivities = activityData.filter(a => new Date(a.start_date).toDateString() === dateStr);
      
      const totalDistance = dayActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
      const totalCalories = dayActivities.reduce((sum, a) => sum + (a.calories || a.kilojoules || 0), 0);
      
      // Calculate Avg BPM for the day (only for activities with HR)
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

      // Add distance per type for stacked bars
      dayActivities.forEach(a => {
        const type = a.type || 'Unknown';
        const dist = (a.distance || 0) / 1000; // km
        if (dist > 0) {
          entry[type] = (entry[type] || 0) + dist;
          // Format to 2 decimals
          entry[type] = parseFloat(entry[type].toFixed(2));
        }
      });

      return entry;
    });

    setCombinedData(merged);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Basic Calculations
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

  // Advanced Calculations
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

  // Goal Estimation
  const targetWeight = user?.targetWeight;
  let daysToGoal = 'N/A';
  if (targetWeight && weights.length >= 3 && avgDailyChange !== 0) {
    const remainingWeight = currentWeight - targetWeight;
    if ((remainingWeight > 0 && avgDailyChange < 0) || (remainingWeight < 0 && avgDailyChange > 0)) {
      daysToGoal = Math.ceil(remainingWeight / avgDailyChange);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-neon-cyan animate-pulse tracking-widest font-bold">INITIALIZING SYSTEM...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Help Link */}
      <div className="mb-6 flex justify-end">
        <Link
          to="/stats-explanation"
          className="inline-flex items-center gap-2 px-4 py-2 bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/30 rounded-lg text-neon-cyan text-sm font-bold transition-all"
        >
          <Info className="w-4 h-4" />
          {t('stats.pageTitle') || 'STATISTICS GUIDE'}
        </Link>
      </div>

      {/* Profile Section - Full Width */}
      <div className="mb-8">
        <UserProfile onUpdate={fetchData} />
      </div>

      {/* BMI Status and Log Data - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* BMI Card */}
        <div className="flex">
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/5 bg-black/40 w-full flex flex-col">
            <div className="absolute top-0 right-0 w-20 h-20 bg-neon-cyan/20 blur-3xl rounded-full"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                <Scale className="w-5 h-5 text-neon-cyan" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-wider">{t('dashboard.bmiStatus')}</h2>
            </div>
            <div className="relative z-10">
              {user && user.height && currentWeight > 0 ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl font-black text-neon-cyan mb-2 drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                      {bmi.value}
                    </div>
                    <div className={`text-sm font-bold uppercase tracking-widest ${
                      bmi.category === 'Underweight' ? 'text-blue-400' :
                      bmi.category === 'Normal' ? 'text-green-400' :
                      bmi.category === 'Overweight' ? 'text-amber-400' :
                      'text-rose-400'
                    }`}>
                      {bmi.category}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-slate-400 mb-1">{t('dashboard.height')}</div>
                        <div className="text-white font-mono">{user.height} cm</div>
                      </div>
                      <div>
                        <div className="text-slate-400 mb-1">{t('dashboard.weight')}</div>
                        <div className="text-white font-mono">{currentWeight} kg</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-slate-500 text-sm mb-2">{t('dashboard.completeProfile')}</div>
                  <div className="text-xs text-slate-600">{t('dashboard.heightWeightRequired')}</div>
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
          <div className="glass-panel rounded-3xl p-8 relative overflow-hidden group border border-white/5 bg-black/40">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-30"></div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white tracking-widest flex items-center gap-3">
                <span className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse shadow-[0_0_10px_#00f3ff]"></span>
                {t('dashboard.correlation')}
              </h2>
              
              {/* Metric Toggle */}
              <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1 border border-white/10">
                <button 
                  onClick={() => setMetric('distance')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${metric === 'distance' ? 'bg-[#fc4c02] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  {t('dashboard.distance')}
                </button>
                <button 
                  onClick={() => setMetric('calories')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${metric === 'calories' ? 'bg-[#ef4444] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  {t('dashboard.calories')}
                </button>
                <button 
                  onClick={() => setMetric('bpm')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${metric === 'bpm' ? 'bg-[#ec4899] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  {t('dashboard.bpm')}
                </button>
              </div>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combinedData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    dy={15}
                  />
                  {/* Left Axis: Weight */}
                  <YAxis 
                    yAxisId="left"
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']} 
                    dx={-10}
                    label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                  />
                  {/* Right Axis: Activity (Distance, Calories, or BPM) */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    dx={10}
                    label={{ 
                      value: metric === 'distance' ? 'km' : metric === 'calories' ? 'kcal' : 'bpm', 
                      angle: 90, 
                      position: 'insideRight', 
                      fill: '#64748b', 
                      fontSize: 10 
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
                      padding: '12px'
                    }}
                    itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                  
                  {/* Activity Bars */}
                  {metric === 'distance' ? (
                    // Stacked Bars for Distance by Type
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
                    // Single Bar for Calories or BPM
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

                  {/* Weight Line (Foreground) */}
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="weight" 
                    name="Weight"
                    stroke="var(--neon-cyan)" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: 'var(--neon-cyan)', stroke: '#fff', strokeWidth: 2 }} 
                    connectNulls={true}
                  />
                  
                  {targetWeight && (
                     <Line yAxisId="left" type="monotone" dataKey={() => targetWeight} name="Target" stroke="var(--neon-purple)" strokeDasharray="6 6" dot={false} strokeWidth={2} opacity={0.6} />
                  )}
                  
                  {metric === 'distance' && <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Grid - Green Priority */}
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
          
           {/* Stats Grid - Orange Priority */}
           <div className="space-y-4">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
               <span className="w-8 h-[1px] bg-slate-800"></span>
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

           {/* Goal Estimation - Red Priority */}
           {targetWeight && (
             <div className="space-y-4">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                 <span className="w-8 h-[1px] bg-slate-800"></span>
                 {t('dashboard.missionObjective')}
               </h3>
               <div className="grid grid-cols-1 gap-5">
                 <StatsCard 
                  title={t('dashboard.estDaysToTarget')} 
                  value={daysToGoal} 
                  subtext={weights.length < 3 ? t('dashboard.gatheringData') : t('dashboard.basedOnVelocity')}
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

export default Dashboard;
