import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const CALLBACK_CLOSE_DELAY = 700;
const REDIRECT_DELAY = 1200;
const pendingOAuthConnections = new Map();

const getCallbackErrorMessage = (error) => {
  switch (error) {
    case 'auth_failed':
      return 'Authentification Strava annulée ou refusée.';
    case 'no_code':
      return 'Aucun code d’autorisation Strava reçu.';
    case 'invalid_state':
      return 'Session de connexion Strava expirée. Veuillez recommencer.';
    default:
      return error || 'Erreur lors de la connexion Strava.';
  }
};

const isPopupCallback = () => {
  try {
    return Boolean(window.opener && window.opener !== window);
  } catch {
    return false;
  }
};

const getReturnPath = () => {
  const fallback = '/strava-stats';

  try {
    const storedPath = sessionStorage.getItem('strava_oauth_return_path');
    sessionStorage.removeItem('strava_oauth_return_path');

    if (storedPath && storedPath.startsWith('/') && !storedPath.startsWith('//')) {
      return storedPath;
    }
  } catch (error) {
    console.warn('Unable to read Strava return path:', error);
  }

  return fallback;
};

const StravaCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loadUser } = useAuth();
  const code = searchParams.get('code');
  const callbackError = searchParams.get('error');
  const handledRef = useRef(false);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Connexion à Strava en cours...');

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const popup = isPopupCallback();

    const notifyOpener = (payload) => {
      if (!popup) return;

      try {
        window.opener.postMessage(payload, window.location.origin);
      } catch (postMessageError) {
        console.error('Unable to notify Strava opener:', postMessageError);
      }
    };

    const closePopup = () => {
      try {
        window.close();
      } catch (closeError) {
        console.warn('Unable to close Strava popup:', closeError);
      }
    };

    const fail = (errorMessage) => {
      setStatus('error');
      setMessage(errorMessage);

      if (popup) {
        notifyOpener({ type: 'STRAVA_ERROR', error: errorMessage });
        setTimeout(closePopup, CALLBACK_CLOSE_DELAY);
        return;
      }

      setTimeout(() => {
        navigate('/strava-connect', {
          replace: true,
          state: { stravaError: errorMessage }
        });
      }, REDIRECT_DELAY);
    };

    const handleCallback = async () => {
      if (callbackError) {
        fail(getCallbackErrorMessage(callbackError));
        return;
      }

      if (!code) {
        fail(getCallbackErrorMessage('no_code'));
        return;
      }

      try {
        if (!pendingOAuthConnections.has(code)) {
          pendingOAuthConnections.set(code, api.post('/strava/connect', { code }));
        }

        await pendingOAuthConnections.get(code);
        setStatus('success');
        setMessage('Compte Strava connecté avec succès. Redirection...');

        if (loadUser) {
          loadUser().catch((loadUserError) => {
            console.warn('Unable to refresh user after Strava connection:', loadUserError);
          });
        }

        if (popup) {
          notifyOpener({ type: 'STRAVA_CONNECTED' });
          setTimeout(closePopup, CALLBACK_CLOSE_DELAY);
          return;
        }

        const returnPath = getReturnPath();
        setTimeout(() => navigate(returnPath, { replace: true }), REDIRECT_DELAY);
      } catch (err) {
        pendingOAuthConnections.delete(code);
        console.error('Error connecting Strava:', err);
        fail(err.response?.data?.error || 'Échec de la connexion Strava. Veuillez réessayer.');
      }
    };

    handleCallback();
  }, [code, callbackError, loadUser, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center px-6 max-w-md">
        {status === 'loading' && (
          <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        )}

        {status === 'success' && (
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
        )}

        {status === 'error' && (
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
        )}

        <p className="text-white font-semibold">{message}</p>
        <p className="text-slate-400 text-sm mt-2">
          {isPopupCallback()
            ? 'Cette fenêtre se fermera automatiquement.'
            : status === 'error'
              ? 'Retour à la page de connexion Strava...'
              : 'Vous allez être redirigé automatiquement.'}
        </p>
      </div>
    </div>
  );
};

export default StravaCallback;
