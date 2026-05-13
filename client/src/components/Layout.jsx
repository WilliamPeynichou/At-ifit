import React from 'react';
import { Activity, Bike, LogOut, Home, Flame, User, BarChart2, Route, Waves } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import Footer from './Footer';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/strava-stats', label: 'Strava', icon: BarChart2 },
  { path: '/running-dashboard', label: 'Running', icon: Route },
  { path: '/swimming-dashboard', label: 'Natation', icon: Waves },
  { path: '/cycling-dashboard', label: 'Cyclisme', icon: Bike },
  { path: '/kcal-calculator', label: 'Kcal', icon: Flame },
];

const Layout = ({ children }) => {
  const { logout, user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen relative">
      {/* Desktop header — hidden on mobile */}
      <header className="glass-nav sticky top-0 z-50 hidden md:block">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="rounded-xl p-2" style={{ background: 'var(--accent-blue-light)', border: '1px solid rgba(0,85,255,0.15)' }}>
              <Activity className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
            </div>
            <span className="font-display text-xl" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
              AT<span style={{ color: 'var(--accent-blue)' }}>IFIT</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ path, label, icon }) => (
              <Link
                key={path}
                to={path}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  color: isActive(path) ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  background: isActive(path) ? 'var(--accent-blue-light)' : 'transparent',
                }}
              >
                {React.createElement(icon, { size: 15 })}
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                {user.pseudo || user.email}
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <div className="glass-nav sticky top-0 z-50 md:hidden">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Activity className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: '1rem' }}>
              AT<span style={{ color: 'var(--accent-blue)' }}>IFIT</span>
            </span>
          </Link>
          <button
            onClick={logout}
            className="p-2 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content — padding bottom on mobile for bottom nav */}
      <main className="w-full relative z-10 pb-20 md:pb-0">
        {children}
      </main>

      {/* Footer — desktop only (mobile uses bottom nav) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Bottom nav — mobile only */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden h-16 flex items-center dark-surface"
        style={{
          background: 'rgba(11, 10, 13, 0.94)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(0, 85, 255, 0.1)',
        }}
      >
        {NAV_ITEMS.map(({ path, label, icon }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 relative ${active ? 'nav-drop' : ''}`}
              style={{ color: active ? 'var(--accent-blue)' : 'var(--text-muted)' }}
            >
              {React.createElement(icon, { size: 20, strokeWidth: active ? 2.5 : 1.8 })}
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        {/* Profile tab */}
        <Link
          to="/new-user-profile"
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 relative ${isActive('/new-user-profile') ? 'nav-drop' : ''}`}
          style={{ color: isActive('/new-user-profile') ? 'var(--accent-blue)' : 'var(--text-muted)' }}
        >
          <User size={20} strokeWidth={isActive('/new-user-profile') ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">Profil</span>
        </Link>
      </nav>
    </div>
  );
};

export default Layout;
