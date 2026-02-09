import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../api';
import UserProfile from './UserProfile';
import { X, CheckCircle2, Circle, ArrowRight } from 'lucide-react';

const Onboarding = () => {
  const { t } = useLanguage();
  const { user, loadUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [profileComplete, setProfileComplete] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    checkStatus();
  }, [user]);

  const checkStatus = async () => {
    try {
      // Reload user data
      if (loadUser) {
        await loadUser();
      }

      // Get fresh user data
      const res = await api.get('/user');
      const freshUser = res.data;
      setUserData(freshUser);

      // Check if profile is complete
      const hasProfile = freshUser && freshUser.height && freshUser.age && freshUser.gender;
      setProfileComplete(!!hasProfile);

      // Check if Strava is connected
      setStravaConnected(!!freshUser.stravaAccessToken);
    } catch (error) {
      console.error('Error checking status:', error);
      setProfileComplete(false);
      setStravaConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/');
  };

  const handleProfileUpdate = async () => {
    // Wait a bit for the update to propagate, then check status
    setTimeout(async () => {
      await checkStatus();
      // Re-check after status update
      const freshUser = await api.get('/user').then(r => r.data).catch(() => null);
      if (freshUser && freshUser.height && freshUser.age && freshUser.gender) {
        setProfileComplete(true);
        setCurrentStep(2);
      }
    }, 800);
  };

  const handleStravaConnect = async () => {
    try {
      const res = await api.get('/strava/auth');
      window.location.href = res.data.url;
    } catch (error) {
      console.error('Error connecting Strava:', error);
    }
  };

  // Check for Strava callback
  useEffect(() => {
    const checkStravaCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        try {
          setLoading(true);
          await api.post('/strava/connect', { code });
          await checkStatus();
          setCurrentStep(2);
          // Clean URL
          window.history.replaceState({}, document.title, '/onboarding');
        } catch (error) {
          console.error('Error connecting Strava:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    checkStravaCallback();
  }, []);

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-neon-cyan animate-pulse tracking-widest font-bold">
        INITIALIZING SYSTEM...
      </div>
    );
  }

  // If both are complete, redirect to dashboard
  if (profileComplete && stravaConnected) {
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Rule 1: removed border border-white/10 bg-black/40 — glass-panel handles it */}
      <div className="glass-panel rounded-3xl p-8 w-full max-w-4xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-widest mb-2">
              {/* Rule 2: text-white → text-primary */}
              <span style={{ color: 'var(--text-primary)' }}>INITIALIZATION</span>
              {/* Rule 5: keep text-neon-cyan */}
              <span className="text-neon-cyan">.SEQUENCE</span>
            </h1>
            {/* Rule 3: text-slate-400 → text-muted */}
            <p className="text-sm tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {t('onboarding.subtitle')}
            </p>
          </div>
          {/* Rule 15: hover:bg-white/5 → glass-border hover */}
          <button
            onClick={handleSkip}
            className="p-2 hover:bg-[rgba(249,115,22,0.1)] rounded-lg transition-colors"
            title={t('onboarding.skipOnboarding')}
          >
            {/* Rule 3: text-slate-400 → text-muted; Rule 2: hover:text-white removed */}
            <X className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            {/* Rules 7 & 9: step circle conditional styles */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={currentStep >= 1
                ? { background: 'rgba(0,85,255,0.15)', border: '2px solid var(--accent-blue)' }
                : { background: 'rgba(255,255,255,0.2)', border: '2px solid var(--glass-border)' }
              }
            >
              {profileComplete ? (
                /* Rule 5: keep text-neon-cyan */
                <CheckCircle2 className="w-6 h-6 text-neon-cyan" />
              ) : (
                /* Rule 5: keep text-neon-cyan; Rule 4: text-slate-500 → text-muted */
                <Circle
                  className={`w-6 h-6 ${currentStep === 1 ? 'text-neon-cyan' : ''}`}
                  style={currentStep !== 1 ? { color: 'var(--text-muted)' } : undefined}
                />
              )}
            </div>
            {/* Rule 5: keep text-neon-cyan; Rule 4: text-slate-500 → text-muted */}
            <span
              className={`text-xs font-bold uppercase tracking-widest ${currentStep >= 1 ? 'text-neon-cyan' : ''}`}
              style={currentStep < 1 ? { color: 'var(--text-muted)' } : undefined}
            >
              {t('onboarding.profile')}
            </span>
          </div>
          {/* Rule 10: divider gradient → glass-border gradient */}
          <div
            className="w-16 h-[1px]"
            style={{ background: 'linear-gradient(to right, var(--glass-border), transparent)' }}
          ></div>
          <div className="flex items-center gap-2">
            {/* Rules 8 & 9: step circle conditional styles */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={currentStep >= 2
                ? { background: 'rgba(249,115,22,0.15)', border: '2px solid var(--accent-orange)' }
                : { background: 'rgba(255,255,255,0.2)', border: '2px solid var(--glass-border)' }
              }
            >
              {stravaConnected ? (
                /* Rule 6: keep text-neon-purple */
                <CheckCircle2 className="w-6 h-6 text-neon-purple" />
              ) : (
                /* Rule 6: keep text-neon-purple; Rule 4: text-slate-500 → text-muted */
                <Circle
                  className={`w-6 h-6 ${currentStep === 2 ? 'text-neon-purple' : ''}`}
                  style={currentStep !== 2 ? { color: 'var(--text-muted)' } : undefined}
                />
              )}
            </div>
            {/* Rule 6: keep text-neon-purple; Rule 4: text-slate-500 → text-muted */}
            <span
              className={`text-xs font-bold uppercase tracking-widest ${currentStep >= 2 ? 'text-neon-purple' : ''}`}
              style={currentStep < 2 ? { color: 'var(--text-muted)' } : undefined}
            >
              {t('onboarding.strava')}
            </span>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                {/* Rule 2: text-white → text-primary */}
                <h2 className="text-xl font-bold mb-2 tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  {t('onboarding.completeProfile')}
                </h2>
                {/* Rule 3: text-slate-400 → text-muted */}
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('onboarding.profileDesc')}
                </p>
              </div>
              {/* Rule 11: bg-black/30 border border-white/5 → glass content area */}
              <div
                className="rounded-xl p-6"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid var(--glass-border)' }}
              >
                <UserProfile onUpdate={handleProfileUpdate} />
              </div>
              {profileComplete && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="btn-cyber flex items-center gap-2"
                  >
                    {t('onboarding.continue')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                {/* Rule 2: text-white → text-primary */}
                <h2 className="text-xl font-bold mb-2 tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  {t('onboarding.connectStrava')}
                </h2>
                {/* Rule 3: text-slate-400 → text-muted */}
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('onboarding.stravaDesc')}
                </p>
              </div>
              {/* Rule 11: bg-black/30 border border-white/5 → glass content area */}
              <div
                className="rounded-xl p-8 text-center"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid var(--glass-border)' }}
              >
                {stravaConnected ? (
                  <div className="space-y-4">
                    {/* Rule 12: text-green-400 → #16a34a */}
                    <CheckCircle2 className="w-16 h-16 mx-auto" style={{ color: '#16a34a' }} />
                    <div className="font-bold tracking-wider" style={{ color: '#16a34a' }}>
                      {t('onboarding.stravaConnected')}
                    </div>
                    <button
                      onClick={handleComplete}
                      className="btn-cyber mt-4"
                    >
                      {t('onboarding.completeSetup')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Rule 3: text-slate-400 → text-muted */}
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {t('onboarding.stravaDesc')}
                    </div>
                    <button
                      onClick={handleStravaConnect}
                      className="btn-cyber mx-auto"
                    >
                      {t('onboarding.connectStravaBtn')}
                    </button>
                    {/* Rule 13: text-slate-500 hover:text-white → text-muted, hover text-primary */}
                    <button
                      onClick={handleComplete}
                      className="text-sm transition-colors underline hover:opacity-80"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {t('onboarding.skipForNow')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {/* Rule 14: border-t border-white/10 → glass-border */}
        <div
          className="flex justify-between items-center pt-6"
          style={{ borderTop: '1px solid var(--glass-border)' }}
        >
          {/* Rule 13: text-slate-500 hover:text-white → text-muted, hover text-primary */}
          <button
            onClick={handleSkip}
            className="text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('onboarding.skipOnboarding')}
          </button>
          {currentStep > 1 && (
            /* Rule 5: keep text-neon-cyan */
            <button
              onClick={() => setCurrentStep(1)}
              className="text-sm text-neon-cyan transition-colors hover:opacity-80"
            >
              {t('onboarding.backToProfile')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
