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
      <div className="glass-panel rounded-3xl p-8 w-full max-w-4xl relative z-10 border border-white/10 bg-black/40">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-widest mb-2">
              <span className="text-white">INITIALIZATION</span>
              <span className="text-neon-cyan">.SEQUENCE</span>
            </h1>
            <p className="text-sm text-slate-400 tracking-wide">
              {t('onboarding.subtitle')}
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            title={t('onboarding.skipOnboarding')}
          >
            <X className="w-6 h-6 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
              currentStep >= 1 ? 'bg-neon-cyan/20 border-neon-cyan' : 'bg-white/5 border-white/20'
            }`}>
              {profileComplete ? (
                <CheckCircle2 className="w-6 h-6 text-neon-cyan" />
              ) : (
                <Circle className={`w-6 h-6 ${currentStep === 1 ? 'text-neon-cyan' : 'text-slate-500'}`} />
              )}
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${
              currentStep >= 1 ? 'text-neon-cyan' : 'text-slate-500'
            }`}>
              {t('onboarding.profile')}
            </span>
          </div>
          <div className="w-16 h-[1px] bg-gradient-to-r from-neon-cyan/50 to-transparent"></div>
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
              currentStep >= 2 ? 'bg-neon-purple/20 border-neon-purple' : 'bg-white/5 border-white/20'
            }`}>
              {stravaConnected ? (
                <CheckCircle2 className="w-6 h-6 text-neon-purple" />
              ) : (
                <Circle className={`w-6 h-6 ${currentStep === 2 ? 'text-neon-purple' : 'text-slate-500'}`} />
              )}
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${
              currentStep >= 2 ? 'text-neon-purple' : 'text-slate-500'
            }`}>
              {t('onboarding.strava')}
            </span>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2 tracking-wider">
                  {t('onboarding.completeProfile')}
                </h2>
                <p className="text-sm text-slate-400">
                  {t('onboarding.profileDesc')}
                </p>
              </div>
              <div className="bg-black/30 rounded-xl p-6 border border-white/5">
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
                <h2 className="text-xl font-bold text-white mb-2 tracking-wider">
                  {t('onboarding.connectStrava')}
                </h2>
                <p className="text-sm text-slate-400">
                  {t('onboarding.stravaDesc')}
                </p>
              </div>
              <div className="bg-black/30 rounded-xl p-8 border border-white/5 text-center">
                {stravaConnected ? (
                  <div className="space-y-4">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
                    <div className="text-green-400 font-bold tracking-wider">
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
                    <div className="text-slate-400 text-sm">
                      {t('onboarding.stravaDesc')}
                    </div>
                    <button
                      onClick={handleStravaConnect}
                      className="btn-cyber mx-auto"
                    >
                      {t('onboarding.connectStravaBtn')}
                    </button>
                    <button
                      onClick={handleComplete}
                      className="text-sm text-slate-500 hover:text-white transition-colors underline"
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
        <div className="flex justify-between items-center pt-6 border-t border-white/10">
          <button
            onClick={handleSkip}
            className="text-sm text-slate-500 hover:text-white transition-colors"
          >
            {t('onboarding.skipOnboarding')}
          </button>
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(1)}
              className="text-sm text-neon-cyan hover:text-white transition-colors"
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

