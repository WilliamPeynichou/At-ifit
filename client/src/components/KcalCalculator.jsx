import React, { useState, useEffect } from 'react';
import { Calculator, Activity, Target, Flame } from 'lucide-react';
import api from '../api';

const KcalCalculator = () => {
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    gender: 'male',
    goal: 'loss'
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/user');
      setUser(response.data);
      if (response.data.gender) {
        setFormData(prev => ({ ...prev, gender: response.data.gender }));
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCalculating(true);
    setError(null);
    
    try {
      const response = await api.post('/user/calculate-calories', formData);
      setResult(response.data);
      // Update local user state with new consoKcal
      if (user) {
        setUser({ ...user, consoKcal: response.data.targetCalories });
      }
    } catch (err) {
      console.error('Calculation error:', err);
      setError('Failed to calculate calories. Ensure you have weight data recorded.');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Calculator className="w-8 h-8 text-blue-500" />
          Calorie Calculator
        </h1>
        <p className="text-gray-400 mt-2">
          Calculate your daily calorie needs based on your BMR and Strava activity history.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Configuration
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Gender</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'male' })}
                  className={`p-3 rounded-xl border transition-all ${
                    formData.gender === 'male'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'female' })}
                  className={`p-3 rounded-xl border transition-all ${
                    formData.gender === 'female'
                      ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                      : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Goal</label>
              <select
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="w-full bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="loss">Lose Weight (-300 to -500 kcal)</option>
                <option value="maintain">Maintain Weight</option>
                <option value="gain">Build Muscle (+300 kcal)</option>
              </select>
            </div>

            {user && (
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                <p className="text-sm text-blue-300">
                  Based on your profile: 
                  <span className="font-semibold ml-1">{user.age || '?'} years, {user.height || '?'} cm</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={calculating}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
            >
              {calculating ? 'Calculating...' : 'Calculate My Calories'}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {result ? (
            <>
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl p-6 border border-green-500/20 shadow-xl">
                <h3 className="text-lg font-medium text-green-400 mb-1">Daily Target</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">{result.targetCalories}</span>
                  <span className="text-xl text-gray-400">kcal</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Recommended daily intake to reach your goal.
                </p>
                {result.delta > 0 && (
                  <div className="mt-4 pt-4 border-t border-green-500/20 space-y-2">
                    <p className="text-sm text-green-300">
                      <span className="font-semibold">{result.delta} kg</span> remaining to reach target.
                    </p>
                    {result.weeksToGoal && (
                      <p className="text-sm text-blue-300 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Estimated time: <span className="font-semibold">{result.weeksToGoal} weeks</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700 shadow-xl space-y-4">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Breakdown
                </h3>
                
                <div className="flex justify-between items-center p-3 bg-gray-900/30 rounded-xl">
                  <span className="text-gray-400">Basal Metabolic Rate (BMR)</span>
                  <span className="text-white font-mono">{result.bmr} kcal</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-900/30 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-gray-400">Activity Factor</span>
                    <span className="text-xs text-gray-500">Based on ~{result.avgHoursPerWeek}h/week (Strava)</span>
                  </div>
                  <span className="text-white font-mono">x {result.activityFactor}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-900/30 rounded-xl border-t border-gray-700">
                  <span className="text-gray-300 font-medium">TDEE (Maintenance)</span>
                  <span className="text-white font-bold font-mono">{result.tdee} kcal</span>
                </div>

                {result.adjustmentReason && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-2">
                    <p className="text-xs text-blue-300 font-medium mb-1">Adjustment Strategy</p>
                    <p className="text-sm text-blue-100">{result.adjustmentReason}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800/30 rounded-2xl border border-gray-700/50 p-8 text-center">
              <Flame className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">Ready to Calculate</h3>
              <p className="text-gray-500 max-w-xs">
                Select your parameters and click calculate to see your personalized nutrition plan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KcalCalculator;
