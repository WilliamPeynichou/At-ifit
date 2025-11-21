import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { User } from 'lucide-react';
import { countryNames, countryToLanguage } from '../i18n/translations';

const UserProfile = ({ onUpdate }) => {
  const { loadUser } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const [formData, setFormData] = useState({
    height: '',
    age: '',
    pseudo: '',
    gender: 'male',
    targetWeight: '',
    country: 'FR',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/user');
      if (res.data) {
        setFormData({
          height: res.data.height || '',
          age: res.data.age || '',
          pseudo: res.data.pseudo || '',
          gender: res.data.gender || 'male',
          targetWeight: res.data.targetWeight || '',
          country: res.data.country || 'FR',
        });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      if (onUpdate) onUpdate();
      alert(t('common.success'));
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(t('common.error'));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="text-neon-cyan animate-pulse">LOADING PROFILE DATA...</div>;

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-neon-purple/20 blur-3xl rounded-full"></div>
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 rounded-lg bg-neon-purple/10 border border-neon-purple/30">
          <User className="w-5 h-5 text-neon-purple" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-wider">{t('profile.pilotProfile')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">{t('profile.callSign')}</label>
            <input
              type="text"
              name="pseudo"
              value={formData.pseudo}
              onChange={handleChange}
              className="input-cyber"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">{t('profile.gender')}</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="input-cyber"
            >
              <option value="male" className="bg-slate-900">{t('profile.male')}</option>
              <option value="female" className="bg-slate-900">{t('profile.female')}</option>
              <option value="other" className="bg-slate-900">{t('profile.other')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">{t('profile.height')}</label>
            <input
              type="number"
              name="height"
              value={formData.height}
              onChange={handleChange}
              className="input-cyber"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">{t('profile.age')}</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="input-cyber"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">{t('profile.targetWeight')} <span className="text-neon-purple ml-2">/// {t('profile.missionGoal')}</span></label>
            <input
              type="number"
              name="targetWeight"
              value={formData.targetWeight || ''}
              onChange={handleChange}
              className="input-cyber border-neon-purple/30 focus:border-neon-purple"
              placeholder={t('profile.optional')}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">{t('profile.country')}</label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="input-cyber"
              required
            >
              <option value="FR" className="bg-slate-900">{countryNames.FR[language] || countryNames.FR.EN}</option>
              <option value="US" className="bg-slate-900">{countryNames.US[language] || countryNames.US.EN}</option>
              <option value="GB" className="bg-slate-900">{countryNames.GB[language] || countryNames.GB.EN}</option>
              <option value="TR" className="bg-slate-900">{countryNames.TR[language] || countryNames.TR.EN}</option>
              <option value="IT" className="bg-slate-900">{countryNames.IT[language] || countryNames.IT.EN}</option>
            </select>
          </div>
          {formData.consoKcal && (
            <div className="col-span-2 mt-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-green-400 mb-2 uppercase tracking-widest">{t('profile.dailyFuelTarget')} <span className="text-green-600 ml-2">/// {t('profile.calculated')}</span></label>
                <div className="input-cyber bg-green-500/10 border-green-500/30 text-green-400 font-mono text-lg flex items-center justify-between">
                  <span>{formData.consoKcal} KCAL</span>
                </div>
              </div>
              {formData.weeksToGoal && (
                <div>
                  <label className="block text-xs font-bold text-blue-400 mb-2 uppercase tracking-widest">{t('profile.estTimeToGoal')} <span className="text-blue-600 ml-2">/// {t('profile.projected')}</span></label>
                  <div className="input-cyber bg-blue-500/10 border-blue-500/30 text-blue-400 font-mono text-lg flex items-center justify-between">
                    <span>{formData.weeksToGoal} {t('dashboard.weeks') || 'WEEKS'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="btn-cyber w-full"
        >
          {t('profile.updateRecords')}
        </button>
      </form>
    </div>
  );
};

export default UserProfile;
