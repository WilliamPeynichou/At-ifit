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

      <div className="glass-panel p-10 rounded-3xl w-full max-w-md relative z-10 animate-float border border-white/10 bg-black/40 shadow-[0_0_50px_-10px_rgba(0,243,255,0.1)]">
        <div className="flex flex-col items-center justify-center gap-6 mb-10">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-neon-cyan blur-xl opacity-20 group-hover:opacity-50 transition-opacity duration-500 rounded-full"></div>
            <div className="relative bg-black rounded-2xl p-4 border border-neon-cyan/30 group-hover:border-neon-cyan/60 transition-colors">
              <Activity className="w-10 h-10 text-neon-cyan" />
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-widest">
            <span className="text-white">AT</span>
            <span className="text-neon-cyan">.IFIT</span>
          </h1>
        </div>

        <h2 className="text-xs font-bold text-slate-500 mb-8 text-center uppercase tracking-[0.3em]">INITIATE SEQUENCE</h2>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-lg mb-6 text-sm font-medium flex items-center justify-center">
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
              className="input-cyber bg-black/50 border-white/10 focus:border-neon-cyan/50"
              required
              placeholder="PILOT@ATIFIT.IO"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-cyber bg-black/50 border-white/10 focus:border-neon-cyan/50"
              required
              placeholder="••••••••"
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

        <p className="mt-10 text-center text-xs text-slate-500 tracking-wide">
          NO ACCESS?{' '}
          <Link to="/register" className="text-neon-purple hover:text-white transition-colors font-bold tracking-widest ml-2">
            CREATE ACCOUNT
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
