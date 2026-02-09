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

      setTimeout(() => {
        navigate('/new-user-profile');
      }, 100);
    } catch (err) {
      console.error('Registration error:', err);
      console.error('Error response:', err.response);

      let errorMessage = '';

      if (!err.response) {
        errorMessage = 'Network Error: Cannot connect to the server. Please make sure the backend server is running on http://localhost:3001';
      }
      else if (err.response?.data?.details && Array.isArray(err.response.data.details)) {
        errorMessage = err.response.data.details.join(', ');
      }
      else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
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

        <h2 className="text-xs font-bold mb-8 text-center uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>NEW PILOT REGISTRATION</h2>

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
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Call Sign (Optional)</label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="input-cyber"
              placeholder="At Itif"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Country of Residence</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input-cyber"
              required
            >
              <option value="FR" style={{ background: 'var(--sand-light)' }}>{countryNames.FR.EN}</option>
              <option value="US" style={{ background: 'var(--sand-light)' }}>{countryNames.US.EN}</option>
              <option value="GB" style={{ background: 'var(--sand-light)' }}>{countryNames.GB.EN}</option>
              <option value="TR" style={{ background: 'var(--sand-light)' }}>{countryNames.TR.EN}</option>
              <option value="IT" style={{ background: 'var(--sand-light)' }}>{countryNames.IT.EN}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-widest pl-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-cyber"
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
              className="input-cyber"
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

        <p className="mt-10 text-center text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>
          ALREADY REGISTERED?{' '}
          <Link to="/login" className="text-neon-purple hover:text-neon-cyan transition-colors font-bold tracking-widest ml-2">
            ACCESS SYSTEM
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
