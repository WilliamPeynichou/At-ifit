import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../api';
import { Activity, CheckCircle2, ArrowRight, X } from 'lucide-react';

const NewUserStrava = () => {
  const { t } = useLanguage();
  const { loadUser } = useAuth();
  const navigate = useNavigate();
  const [stravaConnected, setStravaConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkStravaStatus();
    // Check for Strava callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const errorParam = urlParams.get('error');
    
    if (errorParam) {
      setError(t('common.error') || 'L\'authentification Strava a échoué. Veuillez réessayer.');
    } else if (code) {
      handleStravaConnect(code);
    } else {
      // Check if user is returning from Strava login
      // If we have a stored OAuth URL and login redirect flag, redirect to OAuth
      const storedOAuthUrl = sessionStorage.getItem('strava_oauth_url');
      const loginRedirect = sessionStorage.getItem('strava_login_redirect');
      const redirectPage = sessionStorage.getItem('strava_redirect_page');
      
      if (storedOAuthUrl && loginRedirect === 'true' && redirectPage === '/new-user-strava' && !code && !errorParam) {
        // User has logged in on Strava, now redirect to OAuth authorization
        sessionStorage.removeItem('strava_login_redirect');
        sessionStorage.removeItem('strava_redirect_page');
        // Small delay to ensure page is loaded
        setTimeout(() => {
          window.location.href = storedOAuthUrl;
        }, 1000);
      }
    }
  }, []);

  const checkStravaStatus = async () => {
    try {
      const res = await api.get('/user');
      setStravaConnected(!!res.data.stravaAccessToken);
    } catch (error) {
      console.error('Error checking Strava status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStravaConnect = async (code) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/strava/connect', { code });
      await checkStravaStatus();
      if (loadUser) {
        await loadUser();
      }
      // Clean URL
      window.history.replaceState({}, document.title, '/new-user-strava');
    } catch (error) {
      console.error('Error connecting Strava:', error);
      setError(t('common.error') || 'Échec de la connexion à Strava');
    } finally {
      setLoading(false);
    }
  };

  const initiateAuth = async () => {
    try {
      setError('');
      // Clear any existing code from URL
      window.history.replaceState({}, document.title, '/new-user-strava');
      
      // Get the OAuth URL from backend
      const response = await api.get('/strava/auth');
      const stravaOAuthUrl = response.data.url;
      
      // Store the OAuth URL in sessionStorage to use after login
      sessionStorage.setItem('strava_oauth_url', stravaOAuthUrl);
      sessionStorage.setItem('strava_login_redirect', 'true');
      sessionStorage.setItem('strava_redirect_page', '/new-user-strava');
      
      // Redirect directly to Strava login page
      window.location.href = 'https://www.strava.com/login';
    } catch (err) {
      console.error('Failed to initiate Strava auth:', err);
      setError(t('common.error') || 'Échec de l\'initialisation de la connexion Strava. Veuillez réessayer.');
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  const handleComplete = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="glass-panel rounded-3xl p-8 w-full max-w-2xl relative z-10 border border-white/10 bg-black/40">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-[#fc4c02]/10 border border-[#fc4c02]/30">
              <Activity className="w-8 h-8 text-[#fc4c02]" />
            </div>
            <h1 className="text-3xl font-black tracking-widest">
              <span className="text-white">ÉTAPE 3</span>
              <span className="text-[#fc4c02]"> : STRAVA</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            {t('newUser.strava.subtitle') || 'Connectez votre compte Strava pour synchroniser vos activités (optionnel)'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-lg mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {stravaConnected ? (
            <div className="bg-green-500/10 border-2 border-green-500/50 rounded-xl p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-400 mb-2">
                {t('newUser.strava.connected') || 'STRAVA CONNECTÉ'}
              </h3>
              <p className="text-slate-400 mb-6">
                {t('newUser.strava.connectedDescription') || 'Votre compte Strava est connecté avec succès !'}
              </p>
              <button
                onClick={handleComplete}
                className="btn-cyber w-full flex items-center justify-center gap-2"
              >
                {t('newUser.strava.finish') || 'TERMINER LA CONFIGURATION'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="bg-black/30 rounded-xl p-8 border border-white/5">
                <p className="text-slate-300 text-center mb-6">
                  {t('newUser.strava.description') || 'Connectez votre compte Strava pour importer automatiquement vos activités et améliorer votre expérience de suivi.'}
                </p>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <p className="text-blue-300 text-sm">
                    <strong>Comment ça fonctionne :</strong> Lorsque vous cliquez sur le bouton ci-dessous :
                    <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                      <li>Vous serez redirigé vers la <strong>page de connexion Strava</strong> (<a href="https://www.strava.com/login" target="_blank" rel="noopener noreferrer" className="underline">strava.com/login</a>)</li>
                      <li>Connectez-vous avec <strong>votre propre</strong> compte Strava (email et mot de passe)</li>
                      <li>Après la connexion, vous serez invité à <strong>autoriser</strong> notre application</li>
                      <li>Une fois autorisé, vous serez redirigé et <strong>vos données Strava seront récupérées automatiquement</strong></li>
                    </ol>
                  </p>
                </div>
                
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                  <p className="text-yellow-300 text-sm">
                    <strong>⚠️ Important :</strong> Assurez-vous de vous connecter avec <strong>votre propre</strong> compte Strava. 
                    Chaque utilisateur doit connecter son propre compte Strava pour voir ses propres données.
                  </p>
                </div>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">{t('common.loading') || 'Chargement...'}</p>
                  </div>
                ) : (
                  <button
                    onClick={initiateAuth}
                    className="bg-[#fc4c02] hover:bg-[#e34402] text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-[#fc4c02]/20 flex items-center justify-center gap-3 w-full"
                  >
                    <Activity />
                    {t('newUser.strava.connect') || 'SE CONNECTER À STRAVA'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSkip}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {t('newUser.strava.skip') || 'PASSER'}
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 btn-cyber flex items-center justify-center gap-2"
                >
                  {t('newUser.strava.finish') || 'TERMINER LA CONFIGURATION'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewUserStrava;

