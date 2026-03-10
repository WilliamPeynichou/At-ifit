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
      setError('Échec du chargement des données utilisateur');
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
      if (user) {
        setUser({ ...user, consoKcal: response.data.targetCalories });
      }
    } catch (err) {
      console.error('Calculation error:', err);
      setError('Échec du calcul des calories. Assurez-vous d\'avoir enregistré des données de poids.');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-primary)' }}>Chargement...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          <Calculator className="w-8 h-8" style={{ color: 'var(--accent-blue)' }} />
          Calculateur de Calories
        </h1>
        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
          Calculez vos besoins caloriques quotidiens basés sur votre métabolisme de base et votre historique d'activités Strava.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="glass-panel p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Target className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
            Configuration
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Genre</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'male' })}
                  className="p-3 rounded-xl transition-all"
                  style={
                    formData.gender === 'male'
                      ? { background: 'rgba(0, 85, 255, 0.15)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)' }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }
                  }
                >
                  Homme
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'female' })}
                  className="p-3 rounded-xl transition-all"
                  style={
                    formData.gender === 'female'
                      ? { background: 'rgba(0, 85, 255, 0.15)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)' }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }
                  }
                >
                  Femme
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Objectif</label>
              <select
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="input-cyber w-full rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                style={{ color: 'var(--text-primary)' }}
              >
                <option value="loss">Perdre du poids (-300 à -500 kcal)</option>
                <option value="maintain">Maintenir le poids</option>
                <option value="gain">Prendre du muscle (+300 kcal)</option>
              </select>
            </div>

            {user && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(0, 85, 255, 0.08)', border: '1px solid rgba(0, 85, 255, 0.2)' }}>
                <p className="text-sm" style={{ color: 'var(--accent-blue)' }}>
                  Basé sur votre profil :
                  <span className="font-semibold ml-1">{user.age || '?'} ans, {user.height || '?'} cm</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={calculating}
              className="btn-cyber w-full font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {calculating ? 'Calcul en cours...' : 'Calculer mes Calories'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {result ? (
            <>
              <div className="glass-panel p-6" style={{ borderColor: 'rgba(0,85,255,0.2)' }}>
                <h3 className="text-lg font-medium mb-1" style={{ color: 'var(--accent-blue)' }}>Objectif Quotidien</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>{result.targetCalories}</span>
                  <span className="text-xl" style={{ color: 'var(--text-muted)' }}>kcal</span>
                </div>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  Apport quotidien recommandé pour atteindre votre objectif.
                </p>
                {result.delta > 0 && (
                  <div className="mt-4 pt-4 space-y-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold">{result.delta} kg</span> restant pour atteindre la cible.
                    </p>
                    {result.weeksToGoal && (
                      <p className="text-sm flex items-center gap-2" style={{ color: 'var(--accent-blue)' }}>
                        <Activity className="w-4 h-4" />
                        Temps estimé : <span className="font-semibold">{result.weeksToGoal} semaines</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="glass-panel backdrop-blur-xl rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Activity className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
                  Détails
                </h3>

                <div className="flex justify-between items-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Métabolisme de Base (BMR)</span>
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{result.bmr} kcal</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex flex-col">
                    <span style={{ color: 'var(--text-muted)' }}>Facteur d'Activité</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Basé sur ~{result.avgHoursPerWeek}h/semaine (Strava)</span>
                  </div>
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>x {result.activityFactor}</span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)', borderTop: '1px solid var(--glass-border)' }}>
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>TDEE (Maintien)</span>
                  <span className="font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{result.tdee} kcal</span>
                </div>

                {result.adjustmentReason && (
                  <div className="p-3 rounded-xl mt-2" style={{ background: 'rgba(0, 85, 255, 0.08)', border: '1px solid rgba(0, 85, 255, 0.2)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent-blue)' }}>Stratégie d'Ajustement</p>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{result.adjustmentReason}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="glass-panel h-full flex flex-col items-center justify-center rounded-2xl p-8 text-center">
              <Flame className="w-16 h-16 mb-4" style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Prêt à Calculer</h3>
              <p className="max-w-xs" style={{ color: 'var(--text-muted)' }}>
                Sélectionnez vos paramètres et cliquez sur calculer pour voir votre plan nutritionnel personnalisé.
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default KcalCalculator;
