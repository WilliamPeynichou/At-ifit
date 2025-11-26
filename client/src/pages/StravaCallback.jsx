import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';

const StravaCallback = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  useEffect(() => {
    const handleCallback = async () => {
      if (error) {
        // Envoyer un message d'erreur au parent
        if (window.opener) {
          window.opener.postMessage({ type: 'STRAVA_ERROR', error }, window.location.origin);
        }
        window.close();
        return;
      }

      if (code) {
        try {
          // Connecter Strava
          await api.post('/strava/connect', { code });
          
          // Envoyer un message de succès au parent
          if (window.opener) {
            window.opener.postMessage({ type: 'STRAVA_CONNECTED' }, window.location.origin);
          }
          
          // Fermer la fenêtre après un court délai
          setTimeout(() => {
            window.close();
          }, 500);
        } catch (err) {
          console.error('Error connecting Strava:', err);
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'STRAVA_ERROR', 
              error: err.response?.data?.error || 'Failed to connect Strava' 
            }, window.location.origin);
          }
          window.close();
        }
      }
    };

    handleCallback();
  }, [code, error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white">Connexion à Strava en cours...</p>
        <p className="text-slate-400 text-sm mt-2">Cette fenêtre se fermera automatiquement</p>
      </div>
    </div>
  );
};

export default StravaCallback;

