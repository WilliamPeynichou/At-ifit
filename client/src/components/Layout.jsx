import React, { useState } from 'react';
import { Activity, Bike, LogOut, Home, Flame, User, BarChart2, Route, Waves, Bot, Menu, X } from 'lucide-react';
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

const MOBILE_NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/strava-stats', label: 'Strava', icon: BarChart2 },
  { path: '/assistant', label: 'Coach IA', icon: Bot },
  { path: '/running-dashboard', label: 'Running', icon: Route },
  { path: '/swimming-dashboard', label: 'Natation', icon: Waves },
  { path: '/cycling-dashboard', label: 'Cyclisme', icon: Bike },
  { path: '/kcal-calculator', label: 'Kcal', icon: Flame },
  { path: '/new-user-profile', label: 'Profil', icon: User },
];

const Layout = ({ children }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
            <Activity className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: '1rem' }}>
              AT<span style={{ color: 'var(--accent-blue)' }}>IFIT</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(open => !open)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-primary)', background: mobileMenuOpen ? 'rgba(0,85,255,0.10)' : 'transparent' }}
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            className="absolute left-3 right-3 top-16 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(18px)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <div className="p-3 space-y-1">
              {user && (
                <div className="px-3 py-2 mb-2 rounded-xl text-xs flex items-center gap-2" style={{ background: 'rgba(34,197,94,0.08)', color: 'var(--text-muted)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {user.pseudo || user.email}
                </div>
              )}

              {MOBILE_NAV_ITEMS.map(({ path, label, icon }) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      background: active ? 'var(--accent-blue-light)' : 'transparent',
                    }}
                  >
                    {React.createElement(icon, { size: 18, strokeWidth: active ? 2.5 : 1.8 })}
                    {label}
                  </Link>
                );
              })}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all mt-2"
                style={{ color: '#b91c1c', background: 'rgba(239,68,68,0.07)' }}
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="w-full relative z-10 pb-6 md:pb-0">
        {children}
      </main>

      {/* Footer — desktop only */}
      <div className="hidden md:block">
        <Footer />
      </div>

    </div>
  );
};

export default Layout;
