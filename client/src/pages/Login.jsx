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
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      <div className="glass-panel p-10 rounded-3xl w-full max-w-md relative z-10 animate-float" style={{ border: '1.5px solid var(--glass-border)' }}>
        <div className="flex flex-col items-center justify-center gap-6 mb-10">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 blur-xl opacity-20 group-hover:opacity-50 transition-opacity duration-500 rounded-full" style={{ background: 'var(--accent-blue)' }}></div>
            <div className="relative rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.3)', border: '1.5px solid var(--glass-border)' }}>
              <Activity className="w-10 h-10" style={{ color: 'var(--accent-blue)' }} />
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-widest">
            <span style={{ color: 'var(--text-primary)' }}>AT</span>
            <span className="text-neon-cyan">.IFIT</span>
          </h1>
        </div>

        <h2 className="text-xs font-bold mb-8 text-center uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>INITIATE SEQUENCE</h2>

        {error && (
          <div className="px-4 py-3 rounded-lg mb-6 text-sm font-medium flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-cyber"
              required
              placeholder="at-ifit@gmail.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Password 6+ caractères, 1 majuscule,,1 chiffre, 1 caractère spécial</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-cyber"
              required
              placeholder="atitif1!"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-cyber w-full mt-6 py-4 text-sm tracking-widest"
          >
            {loading ? 'AUTHENTICATING...' : 'ENTER SYSTEM'}
          </button>
        </form>

        <p className="mt-10 text-center text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>
          NO ACCESS?{' '}
          <Link to="/register" className="text-neon-purple hover:text-neon-cyan transition-colors font-bold tracking-widest ml-2">
            CREATE ACCOUNT
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
