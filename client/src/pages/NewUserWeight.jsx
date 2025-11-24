import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import api from '../api';
import { Scale, ArrowRight } from 'lucide-react';

const NewUserWeight = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Convertir le poids en nombre
    const weightValue = parseFloat(weight);
    
    // Validation côté client
    if (isNaN(weightValue) || weightValue <= 0) {
      setError(t('weightForm.validation.invalidWeight') || 'Le poids doit être un nombre valide supérieur à 0');
      setLoading(false);
      return;
    }
    
    if (!date) {
      setError(t('weightForm.validation.required') || 'Veuillez remplir tous les champs');
      setLoading(false);
      return;
    }

    try {
      // Envoyer le poids comme nombre et la date
      await api.post('/weight', { 
        weight: weightValue, 
        date: date 
      });
      // Navigate to next step
      navigate('/new-user-strava');
    } catch (error) {
      console.error('Error adding weight:', error);
      const errorMessage = error.response?.data?.error || error.message || t('weightForm.error') || 'Échec de l\'ajout du poids';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="glass-panel rounded-3xl p-8 w-full max-w-2xl relative z-10 border border-white/10 bg-black/40">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30">
              <Scale className="w-8 h-8 text-neon-cyan" />
            </div>
            <h1 className="text-3xl font-black tracking-widest">
              <span className="text-white">STEP 2</span>
              <span className="text-neon-cyan">: CURRENT WEIGHT</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            {t('newUser.weight.subtitle') || 'Enter your current weight to start tracking'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-lg mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Large Weight Input */}
          <div className="bg-black/30 rounded-2xl p-8 border-2 border-neon-cyan/50">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-neon-cyan mb-4 uppercase tracking-widest text-center">
                  {t('newUser.weight.currentWeight') || 'CURRENT WEIGHT (kg)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="input-cyber w-full text-4xl font-bold text-center py-8 border-2 border-neon-cyan/50 focus:border-neon-cyan"
                  required
                  placeholder="0.0"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">
                  {t('weightForm.date')}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-cyber w-full text-lg py-4"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-cyber w-full py-4 text-sm tracking-widest flex items-center justify-center gap-2"
          >
            {loading ? t('common.loading') || 'Loading...' : (t('newUser.weight.continue') || 'CONTINUE')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewUserWeight;

