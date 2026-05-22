import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, CheckCircle, AlertCircle, LogOut, Mail, Lock, ArrowRight } from 'lucide-react';
import api from '../api';

const StravaConnect = () => {
  const { loadUser, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stravaAthlete, setStravaAthlete] = useState(null);
  const processedCodeRef = useRef(null);

  const refreshUser = useCallback(() => {
    if (!loadUser) return;

    loadUser().catch((loadUserError) => {
      console.warn('Unable to refresh user after Strava change:', loadUserError);
    });
  }, [loadUser]);

  const checkStravaStatus = useCallback(async () => {
    try {
      const res = await api.get('/user');
      setIsConnected(!!res.data.stravaAccessToken);
      if (res.data.stravaAthlete) {
        setStravaAthlete(res.data.stravaAthlete);
      }
    } catch (error) {
      console.error('Error checking Strava status:', error);
    }
  }, []);

  const handleConnect = useCallback(async (code) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/strava/connect', { code });
      setSuccess(true);
      setIsConnected(true);
      if (response.data?.athlete) {
        setStravaAthlete(response.data.athlete);
      }
      refreshUser();
      setTimeout(() => navigate('/strava-stats'), 2000);
    } catch (err) {
      console.error('Strava connect error:', err);
      setError(err.response?.data?.error || 'Failed to connect Strava account. Make sure you are logged into the correct Strava account.');
    } finally {
      setLoading(false);
    }
  }, [navigate, refreshUser]);

  useEffect(() => {
    checkStravaStatus();
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const redirectedError = location.state?.stravaError;

    if (redirectedError) {
      setError(redirectedError);
      navigate('/strava-connect', { replace: true, state: null });
    } else if (errorParam) {
      setError('Strava authentication failed. Please try again.');
    } else if (code && processedCodeRef.current !== code) {
      processedCodeRef.current = code;
      handleConnect(code);
    }

    // Nettoyage d'éventuels résidus de l'ancien flux (login → OAuth via sessionStorage)
    sessionStorage.removeItem('strava_oauth_url');
    sessionStorage.removeItem('strava_login_redirect');
  }, [checkStravaStatus, handleConnect, searchParams, location.state, navigate]);

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Strava account?')) {
      return;
    }

    setDisconnecting(true);
    setError('');
    try {
      await api.delete('/strava/disconnect');
      setIsConnected(false);
      setStravaAthlete(null);
      refreshUser();
      setSuccess(false);
    } catch (err) {
      console.error('Strava disconnect error:', err);
      setError('Failed to disconnect Strava account.');
    } finally {
      setDisconnecting(false);
    }
  };

  const initiateAuth = async () => {
    try {
      setError('');
      window.history.replaceState({}, document.title, '/strava-connect');

      const response = await api.get('/strava/auth');
      const stravaOAuthUrl = response.data.url;

      if (!stravaOAuthUrl) {
        throw new Error('Strava OAuth URL missing in server response');
      }

      // Redirection directe vers la page d'autorisation OAuth Strava.
      // Strava affichera lui-même l'écran de login si nécessaire,
      // puis l'écran d'autorisation, puis nous renverra vers /strava/callback.
      try {
        sessionStorage.setItem('strava_oauth_return_path', '/strava-stats');
      } catch (storageError) {
        console.warn('Unable to store Strava return path:', storageError);
      }
      window.location.href = stravaOAuthUrl;
    } catch (err) {
      console.error('Failed to initiate Strava auth:', err);
      setError('Failed to initiate Strava connection. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="glass-panel p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 blur-3xl rounded-full" style={{ background: 'rgba(252,76,2,0.15)' }}></div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-lg bg-[#fc4c02]/10 border border-[#fc4c02]/30">
                <Activity className="w-8 h-8 text-[#fc4c02]" />
              </div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Connect to Strava</h1>
            </div>

            <p className="mb-8 text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Connect your Strava account to sync your activities and visualize your performance data directly in your dashboard.
            </p>

            {error && (
              <div className="p-4 rounded-lg mb-6 flex items-start gap-3" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#b91c1c' }}>
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && !error && (
              <div className="p-4 rounded-lg mb-6 flex items-start gap-3" style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', color: '#15803d' }}>
                <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Success!</p>
                  <p className="text-sm">Your Strava account has been connected successfully.</p>
                </div>
              </div>
            )}

            {isConnected || success ? (
              <div className="space-y-6">
                {stravaAthlete && (
                  <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid var(--glass-border)' }}>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Connected as:</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {stravaAthlete.firstname} {stravaAthlete.lastname}
                    </p>
                    {stravaAthlete.email && (
                      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{stravaAthlete.email}</p>
                    )}
                  </div>
                )}

                <div className="p-6 rounded-lg flex flex-col items-center gap-3 text-center" style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', color: '#15803d' }}>
                  <CheckCircle size={48} />
                  <h3 className="text-xl font-bold">Strava Connected</h3>
                  <p>Your Strava account is connected and syncing activities.</p>
                </div>

                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="w-full font-bold py-4 px-8 rounded-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#b91c1c' }}
                >
                  <LogOut size={20} />
                  {disconnecting ? 'DISCONNECTING...' : 'DISCONNECT STRAVA'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p style={{ color: 'var(--text-muted)' }}>Connecting to Strava...</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg p-6 mb-6" style={{ background: 'rgba(0,85,255,0.08)', border: '1px solid rgba(0,85,255,0.2)' }}>
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Mail size={20} />
                        How it works
                      </h3>
                      <ol className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#fc4c02]/20 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02] font-bold text-xs">1</span>
                          <span>Click the button below to be redirected to Strava's secure authorization page</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#fc4c02]/20 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02] font-bold text-xs">2</span>
                          <span>Log in with your Strava email and password if you are not already signed in</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#fc4c02]/20 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02] font-bold text-xs">3</span>
                          <span>Authorize our application to access your activity data</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#fc4c02]/20 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02] font-bold text-xs">4</span>
                          <span>You'll be redirected back and your account will be connected</span>
                        </li>
                      </ol>
                    </div>

                    <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(0,85,255,0.08)', border: '1px solid rgba(0,85,255,0.2)' }}>
                      <p className="text-sm flex items-start gap-2" style={{ color: 'var(--accent-blue)' }}>
                        <Lock size={16} className="flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>How it works:</strong> When you click the button below:
                          <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                            <li>You'll be redirected to <strong>Strava's OAuth authorization page</strong> on <a href="https://www.strava.com" target="_blank" rel="noopener noreferrer" className="underline">strava.com</a></li>
                            <li>If you are not signed in, Strava will ask you to log in with <strong>your own</strong> account</li>
                            <li>Authorize the application to read your activities</li>
                            <li>Once authorized, you'll be redirected back and <strong>your Strava data will be fetched automatically</strong></li>
                          </ol>
                        </span>
                      </p>
                    </div>

                    <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(202,138,4,0.08)', border: '1px solid rgba(202,138,4,0.25)' }}>
                      <p className="text-sm" style={{ color: '#a16207' }}>
                        <strong>⚠️ Important:</strong> Make sure you log in with <strong>your own</strong> Strava account.
                        Each user must connect their own Strava account to see their own data.
                      </p>
                    </div>

                    {user && (
                      <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid var(--glass-border)' }}>
                        <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Connecting for user:</p>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{user.email}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <a
                        href="https://www.strava.com/logout"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full font-bold py-3 px-8 rounded-lg transition-all flex items-center justify-center gap-3 text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid var(--glass-border)', color: 'var(--text-secondary)' }}
                      >
                        <LogOut size={18} />
                        LOG OUT FROM STRAVA FIRST (Recommended)
                      </a>

                      <button
                        onClick={initiateAuth}
                        className="w-full bg-[#fc4c02] hover:bg-[#e34402] text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-[#fc4c02]/20 flex items-center justify-center gap-3"
                      >
                        <Activity size={24} />
                        CONNECT WITH STRAVA
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mt-8 pt-6 text-sm" style={{ borderTop: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
              <p className="mb-2">
                <strong>Security:</strong> By connecting, you allow us to read your public activity data.
                We do not write to your Strava account and we never store your Strava password.
              </p>
              <p>
                Your Strava credentials are handled securely by Strava's OAuth 2.0 system.
                We only receive an access token that allows us to read your activities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StravaConnect;
