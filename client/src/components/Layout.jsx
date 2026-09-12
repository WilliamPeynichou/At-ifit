import React, { useState } from 'react';
import { Bike, LogOut, Home, Flame, User, BarChart2, Route, Waves, Bot, Menu, X, ShieldAlert, Apple, Sun, Moon, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useLocation } from 'react-router-dom';
import Footer from './Footer';

const SUPER_ADMIN_NAV_ITEM = { path: '/super-admin', label: 'Super Admin', icon: ShieldAlert, superAdminOnly: true };

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/strava-stats', label: 'Strava', icon: BarChart2 },
  { path: '/running-dashboard', label: 'Running', icon: Route },
  { path: '/swimming-dashboard', label: 'Natation', icon: Waves },
  { path: '/cycling-dashboard', label: 'Cyclisme', icon: Bike },
  { path: '/nutrition', label: 'Nutrition', icon: Apple },
  { path: '/preparer-course', label: 'Préparer course', icon: Flag },
  { path: '/kcal-calculator', label: 'Kcal', icon: Flame },
  SUPER_ADMIN_NAV_ITEM,
];

const MOBILE_NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/strava-stats', label: 'Strava', icon: BarChart2 },
  { path: '/assistant', label: 'Coach IA', icon: Bot },
  { path: '/running-dashboard', label: 'Running', icon: Route },
  { path: '/swimming-dashboard', label: 'Natation', icon: Waves },
  { path: '/cycling-dashboard', label: 'Cyclisme', icon: Bike },
  { path: '/nutrition', label: 'Nutrition', icon: Apple },
  { path: '/preparer-course', label: 'Préparer course', icon: Flag },
  { path: '/kcal-calculator', label: 'Kcal', icon: Flame },
  SUPER_ADMIN_NAV_ITEM,
  { path: '/new-user-profile', label: 'Profil', icon: User },
];

const Layout = ({ children }) => {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => path === '/nutrition'
    ? location.pathname.startsWith('/nutrition')
    : location.pathname === path;
  const visibleNavItems = NAV_ITEMS.filter(item => !item.superAdminOnly || user?.role === 'super_admin');
  const visibleMobileNavItems = MOBILE_NAV_ITEMS.filter(item => !item.superAdminOnly || user?.role === 'super_admin');

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Desktop header — hidden on mobile */}
      <header className="glass-nav sticky top-0 z-50 hidden xl:block">
        <div className="max-w-6xl mx-auto px-4 xl:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="font-display text-xl tracking-widest shrink-0" style={{ color: 'var(--text-light-primary)' }}>
            Atifit
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 min-w-0 overflow-x-auto">
            {visibleNavItems.map(({ path, label, icon }) => (
              <Link
                key={path}
                to={path}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap"
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
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-all duration-200"
              style={{ color: 'var(--text-muted)' }}
              aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {user && (
              <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
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
              <span className="hidden 2xl:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / tablet top bar */}
      <div className="glass-nav sticky top-0 z-50 xl:hidden">
        <div className="px-4 h-14 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <Link to="/" className="font-display tracking-widest" style={{ color: 'var(--text-light-primary)', fontSize: '1rem' }} onClick={() => setMobileMenuOpen(false)}>
            Atifit
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
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
            className="absolute left-3 right-3 top-16 rounded-2xl shadow-2xl overflow-y-auto overscroll-contain"
            style={{
              background: 'rgba(255,255,255,0)',
              backdropFilter: 'blur(18px)',
              border: '1px solid var(--glass-border)',
              maxHeight: 'calc(100dvh - 5rem - env(safe-area-inset-bottom))',
            }}
          >
            <div className="p-3 space-y-1" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
              {user && (
                <div className="px-3 py-2 mb-2 rounded-xl text-xs flex items-center gap-2" style={{ background: 'rgba(34,197,94,0.08)', color: '#000000' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {user.pseudo || user.email}
                </div>
              )}

              {visibleMobileNavItems.map(({ path, label, icon }) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3.5 min-h-[44px] rounded-xl text-sm font-medium transition-all"
                    style={{
                      color: '#000000',
                      background: active ? 'var(--accent-blue-light)' : 'transparent',
                    }}
                  >
                    {React.createElement(icon, { size: 18, strokeWidth: active ? 2.5 : 1.8 })}
                    {label}
                  </Link>
                );
              })}

              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-3 py-3.5 min-h-[44px] rounded-xl text-sm font-medium transition-all"
                style={{ color: '#000000', background: 'rgba(0,85,255,0.06)' }}
              >
                {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                {isDark ? 'Mode clair' : 'Mode sombre'}
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3 py-3.5 min-h-[44px] rounded-xl text-sm font-medium transition-all mt-2"
                style={{ color: '#000000', background: 'rgba(239,68,68,0.07)' }}
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="w-full relative z-10 flex-1 pb-10 md:pb-12">
        {children}
      </main>

      {/* Footer — desktop only */}
      <div className="hidden xl:block mt-auto pt-6">
        <Footer />
      </div>

    </div>
  );
};

export default Layout;
