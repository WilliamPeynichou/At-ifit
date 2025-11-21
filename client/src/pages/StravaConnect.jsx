import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Activity, CheckCircle, AlertCircle, LogOut, Mail, Lock, ArrowRight } from 'lucide-react';
import api from '../api';

const StravaConnect = () => {
  const { t } = useLanguage();
  const { loadUser, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stravaAthlete, setStravaAthlete] = useState(null);

  useEffect(() => {
    checkStravaStatus();
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const state = searchParams.get('state');

    if (errorParam) {
      setError('Strava authentication failed. Please try again.');
    } else if (code) {
      // We have an authorization code from Strava OAuth callback
      handleConnect(code);
    } else {
      // Check if user is returning from Strava login
      // If we have a stored OAuth URL and login redirect flag, redirect to OAuth
      const storedOAuthUrl = sessionStorage.getItem('strava_oauth_url');
      const loginRedirect = sessionStorage.getItem('strava_login_redirect');
      
      if (storedOAuthUrl && loginRedirect === 'true' && !code && !errorParam) {
        // User has logged in on Strava, now redirect to OAuth authorization
        sessionStorage.removeItem('strava_login_redirect');
        // Small delay to ensure page is loaded
        setTimeout(() => {
          window.location.href = storedOAuthUrl;
        }, 1000);
      }
    }
  }, [searchParams]);

  const checkStravaStatus = async () => {
    try {
      const res = await api.get('/user');
      setIsConnected(!!res.data.stravaAccessToken);
      if (res.data.stravaAthlete) {
        setStravaAthlete(res.data.stravaAthlete);
      }
    } catch (error) {
      console.error('Error checking Strava status:', error);
    }
  };

  const handleConnect = async (code) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/strava/connect', { code });
      setSuccess(true);
      setIsConnected(true);
      if (response.data?.athlete) {
        setStravaAthlete(response.data.athlete);
      }
      if (loadUser) {
        await loadUser();
      }
      setTimeout(() => navigate('/strava-stats'), 2000);
    } catch (err) {
      console.error('Strava connect error:', err);
      setError(err.response?.data?.error || 'Failed to connect Strava account. Make sure you are logged into the correct Strava account.');
    } finally {
      setLoading(false);
    }
  };

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
      if (loadUser) {
        await loadUser();
      }
      setSuccess(false);
    } catch (err) {
      setError('Failed to disconnect Strava account.');
    } finally {
      setDisconnecting(false);
    }
  };

  const initiateAuth = async () => {
    try {
      setError('');
      // Clear any existing code from URL
      window.history.replaceState({}, document.title, '/strava-connect');
      
      // Get the OAuth URL from backend
      const response = await api.get('/strava/auth');
      const stravaOAuthUrl = response.data.url;
      
      // Store the OAuth URL in sessionStorage to use after login
      sessionStorage.setItem('strava_oauth_url', stravaOAuthUrl);
      sessionStorage.setItem('strava_login_redirect', 'true');
      
      // Redirect directly to Strava login page
      window.location.href = 'https://www.strava.com/login';
    } catch (err) {
      console.error('Failed to initiate Strava auth:', err);
      setError('Failed to initiate Strava connection. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="glass-panel rounded-2xl p-8 relative overflow-hidden border border-white/5 bg-black/40">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#fc4c02]/20 blur-3xl rounded-full"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-lg bg-[#fc4c02]/10 border border-[#fc4c02]/30">
                <Activity className="w-8 h-8 text-[#fc4c02]" />
              </div>
              <h1 className="text-3xl font-bold text-white">Connect to Strava</h1>
            </div>

            <p className="text-slate-300 mb-8 text-lg leading-relaxed">
              Connect your Strava account to sync your activities and visualize your performance data directly in your dashboard.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-lg mb-6 flex items-start gap-3">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && !error && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-300 p-4 rounded-lg mb-6 flex items-start gap-3">
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
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">Connected as:</p>
                    <p className="text-lg font-bold text-white">
                      {stravaAthlete.firstname} {stravaAthlete.lastname}
                    </p>
                    {stravaAthlete.email && (
                      <p className="text-sm text-slate-400 mt-1">{stravaAthlete.email}</p>
                    )}
                  </div>
                )}
                
                <div className="bg-green-500/10 border border-green-500/20 text-green-300 p-6 rounded-lg flex flex-col items-center gap-3 text-center">
                  <CheckCircle size={48} />
                  <h3 className="text-xl font-bold">Strava Connected</h3>
                  <p>Your Strava account is connected and syncing activities.</p>
                </div>
                
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold py-4 px-8 rounded-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
                    <p className="text-slate-400">Connecting to Strava...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <Mail size={20} />
                        How it works
                      </h3>
                      <ol className="space-y-3 text-slate-300 text-sm">
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#fc4c02]/20 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02] font-bold text-xs">1</span>
                          <span>Click the button below to be redirected to Strava's secure login page</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#fc4c02]/20 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02] font-bold text-xs">2</span>
                          <span>Log in with your Strava email and password (or create a new account)</span>
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

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                      <p className="text-blue-300 text-sm flex items-start gap-2">
                        <Lock size={16} className="flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>How it works:</strong> When you click the button below:
                          <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                            <li>You'll be redirected to <strong>Strava's login page</strong> (<a href="https://www.strava.com/login" target="_blank" rel="noopener noreferrer" className="underline">strava.com/login</a>)</li>
                            <li>Log in with <strong>your own</strong> Strava account (email and password)</li>
                            <li>After logging in, <strong>come back to this page</strong> - you'll be automatically redirected to authorize the application</li>
                            <li>Once authorized, you'll be redirected back and <strong>your Strava data will be fetched automatically</strong></li>
                          </ol>
                        </span>
                      </p>
                    </div>
                    
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                      <p className="text-yellow-300 text-sm">
                        <strong>⚠️ Important:</strong> Make sure you log in with <strong>your own</strong> Strava account. 
                        Each user must connect their own Strava account to see their own data.
                      </p>
                    </div>

                    {user && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                        <p className="text-sm text-slate-400 mb-1">Connecting for user:</p>
                        <p className="text-lg font-bold text-white">{user.email}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <a
                        href="https://www.strava.com/logout"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 text-slate-300 font-bold py-3 px-8 rounded-lg transition-all flex items-center justify-center gap-3 text-sm"
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

            <div className="mt-8 pt-6 border-t border-white/5 text-sm text-slate-500">
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
