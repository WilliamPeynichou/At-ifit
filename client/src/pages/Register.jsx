import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';
import { countryNames } from '../i18n/translations';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [country, setCountry] = useState('FR');
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
    setError('');

    try {
      console.log('Attempting registration with:', { email, pseudo, country });
      const result = await register(email, password, pseudo, country);
      console.log('Registration successful:', result);
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        // Redirect to new user profile setup
        navigate('/new-user-profile');
      }, 100);
    } catch (err) {
      console.error('Registration error:', err);
      console.error('Error response:', err.response);
      
      let errorMessage = '';
      
      // Network error - server not running
      if (!err.response) {
        errorMessage = 'Network Error: Cannot connect to the server. Please make sure the backend server is running on http://localhost:3001';
      } 
      // Validation errors
      else if (err.response?.data?.details && Array.isArray(err.response.data.details)) {
        errorMessage = err.response.data.details.join(', ');
      }
      // Other API errors
      else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      // Default error
      else {
        errorMessage = err.message || 'Registration failed. Please try again.';
      }
      
      setError(errorMessage);
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

        <h2 className="text-xs font-bold text-slate-500 mb-8 text-center uppercase tracking-[0.3em]">NEW PILOT REGISTRATION</h2>

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
              placeholder="at-ifit@gmail.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Call Sign (Optional)</label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="input-cyber bg-black/50 border-white/10 focus:border-neon-cyan/50"
              placeholder="At Itif"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Country of Residence</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input-cyber bg-black/50 border-white/10 focus:border-neon-cyan/50"
              required
            >
              <option value="FR" className="bg-slate-900">{countryNames.FR.EN}</option>
              <option value="US" className="bg-slate-900">{countryNames.US.EN}</option>
              <option value="GB" className="bg-slate-900">{countryNames.GB.EN}</option>
              <option value="TR" className="bg-slate-900">{countryNames.TR.EN}</option>
              <option value="IT" className="bg-slate-900">{countryNames.IT.EN}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-cyber bg-black/50 border-white/10 focus:border-neon-cyan/50"
              required
              placeholder="atitif1!"
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Confirm Password</label>
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
            {loading ? 'INITIALIZING...' : 'CREATE ACCOUNT'}
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
