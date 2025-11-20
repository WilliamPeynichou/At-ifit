import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, pseudo);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
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
            <span className="text-white">ANTIGRAVITY</span>
            <span className="text-neon-cyan">.FIT</span>
          </h1>
        </div>

        <h2 className="text-xs font-bold text-slate-500 mb-8 text-center uppercase tracking-[0.3em]">NEW PILOT REGISTRATION</h2>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-lg mb-6 text-sm font-medium flex items-center justify-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Email Coordinates</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-cyber bg-black/50 border-white/10 focus:border-neon-cyan/50"
              required
              placeholder="PILOT@ANTIGRAVITY.IO"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Call Sign (Optional)</label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="input-cyber bg-black/50 border-white/10 focus:border-neon-cyan/50"
              placeholder="MAVERICK"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Access Code</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-cyber bg-black/50 border-white/10 focus:border-neon-cyan/50"
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Confirm Code</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'INITIALIZING...' : 'JOIN SQUADRON'}
          </button>
        </form>

        <p className="mt-10 text-center text-xs text-slate-500 tracking-wide">
          ALREADY REGISTERED?{' '}
          <Link to="/login" className="text-neon-purple hover:text-white transition-colors font-bold tracking-widest ml-2">
            ACCESS SYSTEM
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
