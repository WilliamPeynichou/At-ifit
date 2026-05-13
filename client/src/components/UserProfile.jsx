import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Bike, Target, User, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    restHeartrate: '',
    bikeType: '',
    cyclingGoal: '',
    consoKcal: null,
    weeksToGoal: null,
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
          restHeartrate: res.data.restHeartrate || '',
          bikeType: res.data.bikeType || '',
          cyclingGoal: res.data.cyclingGoal || '',
          consoKcal: res.data.consoKcal || null,
          weeksToGoal: res.data.weeksToGoal || null,
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
    <div className="glass-panel p-6 relative ">
      <div className="absolute top-0 right-0 w-20 h-20 blur-3xl rounded-full" style={{ background: 'rgba(0, 85, 255, 0.08)' }}></div>

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 rounded-lg" style={{ background: 'var(--accent-blue-light)', border: '1px solid var(--glass-border)' }}>
          <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </div>
        <h2 className="text-lg font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>{t('profile.pilotProfile')}</h2>
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
              <option value="male" style={{ background: 'var(--bg-secondary)' }}>{t('profile.male')}</option>
              <option value="female" style={{ background: 'var(--bg-secondary)' }}>{t('profile.female')}</option>
              <option value="other" style={{ background: 'var(--bg-secondary)' }}>{t('profile.other')}</option>
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
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">{t('profile.targetWeight')} <span style={{ color: 'var(--text-muted)' }} className="ml-2">/// {t('profile.missionGoal')}</span></label>
            <input
              type="number"
              name="targetWeight"
              value={formData.targetWeight || ''}
              onChange={handleChange}
              className="input-cyber"
              style={{ borderColor: 'var(--glass-border)' }}
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
              <option value="FR" style={{ background: 'var(--bg-secondary)' }}>{countryNames.FR[language] || countryNames.FR.EN}</option>
              <option value="US" style={{ background: 'var(--bg-secondary)' }}>{countryNames.US[language] || countryNames.US.EN}</option>
              <option value="GB" style={{ background: 'var(--bg-secondary)' }}>{countryNames.GB[language] || countryNames.GB.EN}</option>
              <option value="TR" style={{ background: 'var(--bg-secondary)' }}>{countryNames.TR[language] || countryNames.TR.EN}</option>
              <option value="IT" style={{ background: 'var(--bg-secondary)' }}>{countryNames.IT[language] || countryNames.IT.EN}</option>
            </select>
          </div>
          <div className="col-span-2 pt-4 mt-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Bike className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
              <h3 className="text-base font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>Profil cycliste</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">FC repos</label>
                <input
                  type="number"
                  name="restHeartrate"
                  value={formData.restHeartrate || ''}
                  onChange={handleChange}
                  className="input-cyber"
                  min="25"
                  max="120"
                  placeholder="bpm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Pratique</label>
                <select
                  name="bikeType"
                  value={formData.bikeType || ''}
                  onChange={handleChange}
                  className="input-cyber"
                >
                  <option value="" style={{ background: 'var(--bg-secondary)' }}>Non renseigné</option>
                  <option value="road" style={{ background: 'var(--bg-secondary)' }}>Route</option>
                  <option value="gravel" style={{ background: 'var(--bg-secondary)' }}>Gravel</option>
                  <option value="indoor" style={{ background: 'var(--bg-secondary)' }}>Home trainer</option>
                  <option value="commute" style={{ background: 'var(--bg-secondary)' }}>Velotaf</option>
                  <option value="mixed" style={{ background: 'var(--bg-secondary)' }}>Mixte</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Objectif</label>
                <select
                  name="cyclingGoal"
                  value={formData.cyclingGoal || ''}
                  onChange={handleChange}
                  className="input-cyber"
                >
                  <option value="" style={{ background: 'var(--bg-secondary)' }}>Non renseigné</option>
                  <option value="endurance" style={{ background: 'var(--bg-secondary)' }}>Endurance</option>
                  <option value="ftp" style={{ background: 'var(--bg-secondary)' }}>FTP</option>
                  <option value="climb" style={{ background: 'var(--bg-secondary)' }}>Grimpe</option>
                  <option value="race" style={{ background: 'var(--bg-secondary)' }}>Course</option>
                  <option value="health" style={{ background: 'var(--bg-secondary)' }}>Santé</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Target className="w-3.5 h-3.5" />
              Ces champs alimentent la page Cyclisme, la récupération et les analyses automatiques.
            </div>
          </div>
          {formData.consoKcal && (
            <div className="col-span-2 mt-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--accent-blue)' }}>
                  {t('profile.dailyFuelTarget')} <span style={{ color: 'var(--text-muted)' }} className="ml-2">/// {t('profile.calculated')}</span>
                  <Link
                    to="/stats-explanation#daily-fuel"
                    className="p-1 rounded-full transition-all group"
                    style={{ background: 'var(--glass-white)', border: '1px solid var(--glass-border)', color: 'var(--accent-blue)' }}
                    title={t('stats.dailyFuel.title') || 'En savoir plus sur l\'Objectif Calorique'}
                  >
                    <Info className="w-3 h-3 group-hover:scale-110 transition-transform" />
                  </Link>
                </label>
                <div className="input-cyber font-mono text-lg flex items-center justify-between" style={{ background: 'var(--glass-white)', border: '1px solid var(--glass-border)', color: 'var(--accent-blue)' }}>
                  <span>{formData.consoKcal} KCAL</span>
                </div>
              </div>
              {formData.weeksToGoal && (
                <div>
                  <label className="block text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: 'var(--accent-blue)' }}>{t('profile.estTimeToGoal')} <span style={{ color: 'var(--text-muted)' }} className="ml-2">/// {t('profile.projected')}</span></label>
                  <div className="input-cyber font-mono text-lg flex items-center justify-between" style={{ background: 'var(--glass-white)', border: '1px solid var(--glass-border)', color: 'var(--accent-blue)' }}>
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
