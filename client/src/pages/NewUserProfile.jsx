import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { countryNames, countryToLanguage } from '../i18n/translations';
import api from '../api';
import { User, Target, ArrowRight } from 'lucide-react';

const NewUserProfile = () => {
  const { user, loadUser } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    height: '',
    age: '',
    pseudo: '',
    gender: 'male',
    targetWeight: '',
    country: user?.country || 'FR',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        pseudo: user.pseudo || '',
        country: user.country || 'FR',
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/user', formData);
      
      // Update language if country changed
      if (formData.country) {
        const newLang = countryToLanguage[formData.country] || 'FR';
        if (newLang !== language) {
          changeLanguage(newLang);
        }
      }
      
      if (loadUser) {
        await loadUser();
      }
      
      // Navigate to next step
      navigate('/new-user-weight');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(t('common.error') || 'Error updating profile');
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
            <div className="p-3 rounded-xl bg-neon-purple/10 border border-neon-purple/30">
              <User className="w-8 h-8 text-neon-purple" />
            </div>
            <h1 className="text-3xl font-black tracking-widest">
              <span className="text-white">STEP 1</span>
              <span className="text-neon-purple">: PROFILE</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            {t('newUser.profile.subtitle') || 'Complete your profile to get started'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-lg mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">
                {t('profile.callSign')}
              </label>
              <input
                type="text"
                name="pseudo"
                value={formData.pseudo}
                onChange={handleChange}
                className="input-cyber w-full"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">
                {t('profile.gender')}
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="input-cyber w-full"
              >
                <option value="male" className="bg-slate-900">{t('profile.male')}</option>
                <option value="female" className="bg-slate-900">{t('profile.female')}</option>
                <option value="other" className="bg-slate-900">{t('profile.other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">
                {t('profile.height')}
              </label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                className="input-cyber w-full"
                required
                placeholder="175"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">
                {t('profile.age')}
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="input-cyber w-full"
                required
                placeholder="25"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">
                {t('profile.country')}
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="input-cyber w-full"
                required
              >
                <option value="FR" className="bg-slate-900">{countryNames.FR[language] || countryNames.FR.EN}</option>
                <option value="US" className="bg-slate-900">{countryNames.US[language] || countryNames.US.EN}</option>
                <option value="GB" className="bg-slate-900">{countryNames.GB[language] || countryNames.GB.EN}</option>
                <option value="TR" className="bg-slate-900">{countryNames.TR[language] || countryNames.TR.EN}</option>
                <option value="IT" className="bg-slate-900">{countryNames.IT[language] || countryNames.IT.EN}</option>
              </select>
            </div>

            {/* Target Weight - Highlighted */}
            <div className="md:col-span-2">
              <div className="bg-neon-purple/10 border-2 border-neon-purple/50 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/20 blur-3xl rounded-full"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-neon-purple/20 border border-neon-purple/40">
                      <Target className="w-6 h-6 text-neon-purple" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neon-purple mb-1 uppercase tracking-widest">
                        {t('profile.targetWeight')} - {t('newUser.profile.targetLabel') || 'YOUR GOAL'}
                      </label>
                      <p className="text-xs text-slate-400">
                        {t('newUser.profile.targetDescription') || 'Enter your target weight goal'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="number"
                    name="targetWeight"
                    value={formData.targetWeight}
                    onChange={handleChange}
                    className="input-cyber w-full border-neon-purple/50 focus:border-neon-purple text-lg font-bold"
                    required
                    placeholder="70.0"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-cyber w-full py-4 text-sm tracking-widest flex items-center justify-center gap-2"
          >
            {loading ? t('common.loading') || 'Loading...' : (t('newUser.profile.continue') || 'CONTINUE')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewUserProfile;

