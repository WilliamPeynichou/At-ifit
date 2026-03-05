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
      <div className="glass-panel p-8 w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.1)', border: '1.5px solid var(--glass-border)' }}>
              <User className="w-8 h-8 text-neon-purple" />
            </div>
            <h1 className="text-3xl font-black tracking-widest">
              <span style={{ color: 'var(--text-primary)' }}>STEP 1</span>
              <span className="text-neon-purple">: PROFILE</span>
            </h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('newUser.profile.subtitle') || 'Complete your profile to get started'}
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg mb-6 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
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
                <option value="male" style={{ background: 'var(--bg-secondary)' }}>{t('profile.male')}</option>
                <option value="female" style={{ background: 'var(--bg-secondary)' }}>{t('profile.female')}</option>
                <option value="other" style={{ background: 'var(--bg-secondary)' }}>{t('profile.other')}</option>
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
                <option value="FR" style={{ background: 'var(--bg-secondary)' }}>{countryNames.FR[language] || countryNames.FR.EN}</option>
                <option value="US" style={{ background: 'var(--bg-secondary)' }}>{countryNames.US[language] || countryNames.US.EN}</option>
                <option value="GB" style={{ background: 'var(--bg-secondary)' }}>{countryNames.GB[language] || countryNames.GB.EN}</option>
                <option value="TR" style={{ background: 'var(--bg-secondary)' }}>{countryNames.TR[language] || countryNames.TR.EN}</option>
                <option value="IT" style={{ background: 'var(--bg-secondary)' }}>{countryNames.IT[language] || countryNames.IT.EN}</option>
              </select>
            </div>

            {/* Target Weight - Highlighted */}
            <div className="md:col-span-2">
              <div className="rounded-xl p-6 relative overflow-hidden" style={{ background: 'rgba(249,115,22,0.08)', border: '2px solid var(--glass-border)' }}>
                <div className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full" style={{ background: 'rgba(249,115,22,0.15)' }}></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid var(--glass-border)' }}>
                      <Target className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neon-purple mb-1 uppercase tracking-widest">
                        {t('profile.targetWeight')} - {t('newUser.profile.targetLabel') || 'YOUR GOAL'}
                      </label>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t('newUser.profile.targetDescription') || 'Enter your target weight goal'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="number"
                    name="targetWeight"
                    value={formData.targetWeight}
                    onChange={handleChange}
                    className="input-cyber w-full text-lg font-bold"
                    style={{ borderColor: 'var(--glass-border)' }}
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
