import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Connexion échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, var(--bg-primary) 0%, #eef0f8 100%)',
      }}
    >
      <div
        className="glass-panel p-8 sm:p-10 w-full max-w-md"
        
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--accent-blue-light)', border: '1px solid rgba(0,85,255,0.15)' }}
          >
            <Activity className="w-8 h-8" style={{ color: 'var(--accent-blue)' }} />
          </div>
          <h1 className="text-3xl" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
            AT<span style={{ color: 'var(--accent-blue)' }}>IFIT</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Connectez-vous à votre espace</p>
        </div>

        {error && (
          <div
            className="px-4 py-3 rounded-xl mb-6 text-sm font-medium"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-muted)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-clean"
              required
              placeholder="vous@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-muted)' }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-clean"
              required
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-sm"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Pas de compte ?{' '}
          <Link to="/register" className="font-semibold transition-colors" style={{ color: 'var(--accent-blue)' }}>
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
