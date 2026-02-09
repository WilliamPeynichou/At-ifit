import React from 'react';
import { Activity, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen relative">

      <header className="glass-panel sticky top-0 z-50" style={{ borderBottom: '1.5px solid var(--glass-border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="relative">
              <div className="absolute inset-0 bg-[var(--accent-blue)] blur-lg opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
              <div className="relative rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.3)', border: '1.5px solid var(--glass-border)' }}>
                <Activity className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-wider">
              <span style={{ color: 'var(--text-primary)' }}>At</span>
              <span className="text-neon-cyan"> ifit</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/strava-stats" className="text-sm font-bold transition-colors flex items-center gap-2" style={{ color: 'var(--text-secondary)' }} onMouseEnter={e => e.currentTarget.style.color = '#fc4c02'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <Activity size={16} />
              STRAVA
            </Link>
            <Link to="/kcal-calculator" className="text-sm font-bold transition-colors flex items-center gap-2" style={{ color: 'var(--text-secondary)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <Activity size={16} style={{ color: 'var(--accent-blue)' }} />
              KCAL
            </Link>
            <Link to="/stats-explanation" className="text-sm font-bold text-neon-cyan transition-colors flex items-center gap-2" onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-orange)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--accent-blue)'}>
              <Activity size={16} className="text-neon-cyan" />
              HELP
            </Link>
            {user && (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.25)', border: '1.5px solid var(--glass-border)' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-orange)' }}></div>
                <span className="text-sm font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  {user.pseudo || user.email}
                </span>
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-colors duration-300"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-orange)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <LogOut className="w-4 h-4" />
              LOGOUT
            </button>
          </div>
        </div>
      </header>
      <main className="w-full relative z-10">
        {children}
      </main>
    </div>
  );
};

export default Layout;
