import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Activity, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api';

const StravaConnect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Strava authentication failed. Please try again.');
    } else if (code) {
      handleConnect(code);
    }
  }, [searchParams]);

  const handleConnect = async (code) => {
    setLoading(true);
    try {
      await api.post('/strava/connect', { code });
      setSuccess(true);
      setTimeout(() => navigate('/strava-stats'), 2000);
    } catch (err) {
      setError('Failed to connect Strava account.');
    } finally {
      setLoading(false);
    }
  };

  const initiateAuth = async () => {
    try {
      const response = await api.get('/strava/auth');
      window.location.href = response.data.url;
    } catch (err) {
      setError('Failed to initiate Strava connection.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-panel p-8 rounded-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity size={120} className="text-[#fc4c02]" />
        </div>

        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span className="text-[#fc4c02]">STRAVA</span> INTEGRATION
        </h1>

        <p className="text-slate-300 mb-8 text-lg leading-relaxed">
          Connect your Strava account to sync your activities and visualize your performance data directly in your dashboard.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-lg mb-6 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-green-500/10 border border-green-500/20 text-green-300 p-6 rounded-lg mb-6 flex flex-col items-center gap-3 text-center animate-pulse-glow">
            <CheckCircle size={48} />
            <h3 className="text-xl font-bold">Connected Successfully!</h3>
            <p>Redirecting to your stats...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Connecting to Strava...</p>
              </div>
            ) : (
              <button
                onClick={initiateAuth}
                className="bg-[#fc4c02] hover:bg-[#e34402] text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-[#fc4c02]/20 flex items-center justify-center gap-3"
              >
                <Activity />
                CONNECT WITH STRAVA
              </button>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 text-sm text-slate-500">
          <p>By connecting, you allow us to read your public activity data. We do not write to your Strava account.</p>
        </div>
      </div>
    </div>
  );
};

export default StravaConnect;
