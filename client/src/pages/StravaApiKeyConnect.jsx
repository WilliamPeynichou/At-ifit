import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Activity, CheckCircle, AlertCircle, Key, ArrowRight, Eye, EyeOff } from 'lucide-react';
import api from '../api';

const StravaApiKeyConnect = () => {
  const { t } = useLanguage();
  const { loadUser, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [stravaAthlete, setStravaAthlete] = useState(null);

  useEffect(() => {
    checkStravaStatus();
  }, []);

  const checkStravaStatus = async () => {
    try {
      const res = await api.get('/user');
      setIsConnected(!!(res.data.stravaAccessToken || res.data.stravaApiKey));
      if (res.data.stravaAthlete) {
        setStravaAthlete(res.data.stravaAthlete);
      }
    } catch (error) {
      console.error('Error checking Strava status:', error);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!apiKey.trim()) {
      setError('Veuillez entrer votre clé API Strava');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/strava/connect-api-key', { apiKey: apiKey.trim() });
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
      console.error('Strava API key connect error:', err);
      setError(err.response?.data?.error || 'Échec de la connexion avec la clé API. Vérifiez que votre clé est correcte.');
    } finally {
      setLoading(false);
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
                <Key className="w-8 h-8 text-[#fc4c02]" />
              </div>
              <h1 className="text-3xl font-bold text-white">Connexion avec clé API Strava</h1>
            </div>

            <p className="text-slate-300 mb-8 text-lg leading-relaxed">
              Connectez votre compte Strava en utilisant votre propre clé API. Cette méthode vous permet d'utiliser votre propre application Strava.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-lg mb-6 flex items-start gap-3">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Erreur</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && !error && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-300 p-4 rounded-lg mb-6 flex items-start gap-3">
                <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Succès !</p>
                  <p className="text-sm">Votre compte Strava a été connecté avec succès.</p>
                </div>
              </div>
            )}

            {isConnected || success ? (
              <div className="space-y-6">
                {stravaAthlete && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">Connecté en tant que :</p>
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
                  <h3 className="text-xl font-bold">Strava Connecté</h3>
                  <p>Votre compte Strava est connecté et synchronise les activités.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnect} className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Key size={20} />
                    Comment obtenir votre clé API Strava
                  </h3>
                  <ol className="space-y-3 text-slate-300 text-sm">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#fc4c02]/20 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02] font-bold text-xs">1</span>
                      <span>Allez sur <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener noreferrer" className="text-[#fc4c02] underline">strava.com/settings/api</a></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#fc4c02]/20 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02] font-bold text-xs">2</span>
                      <span>Créez une nouvelle application ou utilisez une application existante</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#fc4c02]/20 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02] font-bold text-xs">3</span>
                      <span>Copiez votre <strong>Access Token</strong> (token d'accès)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#fc4c02]/20 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02] font-bold text-xs">4</span>
                      <span>Collez-le dans le champ ci-dessous</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                  <p className="text-yellow-300 text-sm">
                    <strong>⚠️ Important :</strong> Votre clé API est personnelle et confidentielle. 
                    Ne la partagez jamais avec d'autres personnes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="apiKey" className="block text-sm font-semibold text-slate-300 mb-2">
                      Clé API Strava (Access Token)
                    </label>
                    <div className="relative">
                      <input
                        id="apiKey"
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Entrez votre clé API Strava"
                        className="w-full bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-[#fc4c02]/50 focus:ring-2 focus:ring-[#fc4c02]/20 transition-all"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        disabled={loading}
                      >
                        {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('/strava-connect')}
                      className="flex-1 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 text-slate-300 font-bold py-3 px-8 rounded-lg transition-all"
                      disabled={loading}
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !apiKey.trim()}
                      className="flex-1 bg-[#fc4c02] hover:bg-[#e34402] text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-[#fc4c02]/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Connexion...
                        </>
                      ) : (
                        <>
                          <Key size={20} />
                          CONNECTER AVEC CLÉ API
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-white/5 text-sm text-slate-500">
              <p className="mb-2">
                <strong>Sécurité :</strong> Votre clé API est stockée de manière sécurisée et utilisée uniquement 
                pour accéder à vos données Strava. Nous ne partageons jamais vos informations.
              </p>
              <p>
                Vous pouvez révoquer votre clé API à tout moment depuis les paramètres de votre application Strava.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StravaApiKeyConnect;

