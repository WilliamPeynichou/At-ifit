import React, { useState, useEffect, useRef } from 'react';
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
  const [checkingConnection, setCheckingConnection] = useState(false);
  const pollIntervalRef = useRef(null);
  const stravaWindowRef = useRef(null);

  useEffect(() => {
    checkStravaStatus();

    // Check for Strava callback from popup
    const handleMessage = async (event) => {
      // Vérifier l'origine pour la sécurité
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'STRAVA_CONNECTED') {
        // Arrêter le polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }

        setCheckingConnection(false);
        await checkStravaStatus();
        await loadUser();

        // Fermer la fenêtre popup si elle existe
        if (stravaWindowRef.current && !stravaWindowRef.current.closed) {
          stravaWindowRef.current.close();
        }

        // Rediriger vers la page principale
        navigate('/');
      } else if (event.data.type === 'STRAVA_ERROR') {
        // Arrêter le polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }

        setCheckingConnection(false);
        setError(event.data.error || 'Erreur lors de la connexion Strava');

        // Fermer la fenêtre popup si elle existe
        if (stravaWindowRef.current && !stravaWindowRef.current.closed) {
          stravaWindowRef.current.close();
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [navigate, loadUser]);

  const checkStravaStatus = async () => {
    try {
      const res = await api.get('/user');
      const isConnected = !!res.data.stravaAccessToken;
      setStravaConnected(isConnected);

      // Si connecté, rediriger vers la page principale
      if (isConnected) {
        await loadUser();
        // Attendre un peu pour que les données soient chargées
        setTimeout(() => {
          navigate('/');
        }, 1000);
      }

      return isConnected;
    } catch (error) {
      console.error('Error checking Strava status:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const initiateAuth = async () => {
    // Ouvrir la fenêtre SYNCHRONIQUEMENT pendant le user gesture (clic)
    // sinon les navigateurs bloquent la popup. L'URL est mise à jour après l'appel API.
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    stravaWindowRef.current = window.open(
      'about:blank',
      'stravaAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!stravaWindowRef.current) {
      setError('Veuillez autoriser les popups pour cette page');
      return;
    }

    try {
      setError('');
      setCheckingConnection(true);

      // Get the OAuth URL from backend
      const response = await api.get('/strava/auth');
      const stravaOAuthUrl = response.data.url;

      // Rediriger la popup déjà ouverte vers l'URL OAuth Strava
      stravaWindowRef.current.location.href = stravaOAuthUrl;

      // Le callback Strava enverra un message via postMessage
      // Le polling sert de backup si le message n'est pas reçu
      pollIntervalRef.current = setInterval(async () => {
        // Vérifier si la fenêtre est fermée
        if (stravaWindowRef.current && stravaWindowRef.current.closed) {
          clearInterval(pollIntervalRef.current);
          setCheckingConnection(false);

          // Vérifier une dernière fois si Strava est connecté
          const isConnected = await checkStravaStatus();
          if (!isConnected) {
            setError('Connexion Strava annulée ou échouée');
          }
          return;
        }

        // Vérifier le statut de connexion (backup si postMessage ne fonctionne pas)
        try {
          const res = await api.get('/user');
          const isConnected = !!res.data.stravaAccessToken;

          if (isConnected) {
            clearInterval(pollIntervalRef.current);
            setCheckingConnection(false);

            // Fermer la fenêtre popup
            if (stravaWindowRef.current && !stravaWindowRef.current.closed) {
              stravaWindowRef.current.close();
            }

            // Recharger les données utilisateur et rediriger
            await loadUser();
            navigate('/');
          }
        } catch (error) {
          console.error('Error checking connection status:', error);
        }
      }, 2000); // Vérifier toutes les 2 secondes

      // Timeout de sécurité après 5 minutes
      setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          setCheckingConnection(false);
          if (stravaWindowRef.current && !stravaWindowRef.current.closed) {
            stravaWindowRef.current.close();
          }
          setError('Timeout: La connexion Strava a pris trop de temps');
        }
      }, 300000); // 5 minutes

    } catch (err) {
      console.error('Failed to initiate Strava auth:', err);
      setError(t('common.error') || 'Échec de l\'initialisation de la connexion Strava. Veuillez réessayer.');
      setCheckingConnection(false);
      if (stravaWindowRef.current && !stravaWindowRef.current.closed) {
        stravaWindowRef.current.close();
      }
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
      <div className="glass-panel p-8 w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-[#fc4c02]/10 border border-[#fc4c02]/30">
              <Activity className="w-8 h-8 text-[#fc4c02]" />
            </div>
            <h1 className="text-3xl font-black tracking-widest">
              <span style={{ color: 'var(--text-primary)' }}>ÉTAPE 3</span>
              <span className="text-[#fc4c02]"> : STRAVA</span>
            </h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('newUser.strava.subtitle') || 'Connectez votre compte Strava pour synchroniser vos activités (optionnel)'}
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg mb-6 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div className="space-y-6">
          {stravaConnected ? (
            <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(22,163,74,0.1)', border: '2px solid rgba(22,163,74,0.3)' }}>
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: '#16a34a' }} />
              <h3 className="text-xl font-bold mb-2" style={{ color: '#16a34a' }}>
                {t('newUser.strava.connected') || 'STRAVA CONNECTÉ'}
              </h3>
              <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
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
              <div className="rounded-xl p-8" style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid var(--glass-border)' }}>
                <p className="text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {t('newUser.strava.description') || 'Connectez votre compte Strava pour importer automatiquement vos activités et améliorer votre expérience de suivi.'}
                </p>

                <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(0,85,255,0.08)', border: '1px solid rgba(0,85,255,0.2)' }}>
                  <p className="text-sm" style={{ color: 'var(--accent-blue)' }}>
                    <strong>Comment ça fonctionne :</strong> Lorsque vous cliquez sur le bouton ci-dessous :
                    <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                      <li>Vous serez redirigé vers la <strong>page de connexion Strava</strong> (<a href="https://www.strava.com/login" target="_blank" rel="noopener noreferrer" className="underline">strava.com/login</a>)</li>
                      <li>Connectez-vous avec <strong>votre propre</strong> compte Strava (email et mot de passe)</li>
                      <li>Après la connexion, vous serez invité à <strong>autoriser</strong> notre application</li>
                      <li>Une fois autorisé, vous serez redirigé et <strong>vos données Strava seront récupérées automatiquement</strong></li>
                    </ol>
                  </p>
                </div>

                <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
                  <p className="text-sm" style={{ color: '#a16207' }}>
                    <strong>⚠️ Important :</strong> Assurez-vous de vous connecter avec <strong>votre propre</strong> compte Strava.
                    Chaque utilisateur doit connecter son propre compte Strava pour voir ses propres données.
                  </p>
                </div>

                {loading || checkingConnection ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p style={{ color: 'var(--text-muted)' }}>
                      {checkingConnection
                        ? 'En attente de la connexion Strava...'
                        : (t('common.loading') || 'Chargement...')}
                    </p>
                    {checkingConnection && (
                      <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                        Une nouvelle fenêtre s'est ouverte. Autorisez l'application dans cette fenêtre.
                      </p>
                    )}
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
                  className="flex-1 px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid var(--glass-border)', color: 'var(--text-muted)' }}
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
