import React, { useEffect, useState } from 'react';
import { Bike, LogOut, Home, Flame, User, BarChart2, Route, Waves, Bot, Menu, X, ShieldAlert, Apple, Sun, Moon, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useLocation } from 'react-router-dom';
import Footer from './Footer';

const SUPER_ADMIN_NAV_ITEM = { path: '/super-admin', label: 'Super Admin', icon: ShieldAlert, superAdminOnly: true };

/** Entrées du menu plein écran, communes à toutes les tailles d'écran. */
const NAV_ITEMS = [
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

const DIRECT_NAV_PATHS = [
  '/',
  '/strava-stats',
  '/running-dashboard',
  '/swimming-dashboard',
  '/cycling-dashboard',
  '/nutrition',
  '/preparer-course',
  '/kcal-calculator',
];

const PAGE_CONTEXT = {
  '/': 'Vue d’ensemble',
  '/strava-stats': 'Analyse Strava',
  '/assistant': 'Coach IA',
  '/running-dashboard': 'Running',
  '/swimming-dashboard': 'Natation',
  '/cycling-dashboard': 'Cyclisme',
  '/nutrition': 'Nutrition',
  '/nutrition/strategie': 'Nutrition / Stratégie',
  '/preparer-course': 'Préparer course',
  '/kcal-calculator': 'Calculateur kcal',
  '/sources': 'Sources',
  '/new-user-profile': 'Profil',
};

const Layout = ({ children }) => {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusedPath, setFocusedPath] = useState(null);

  const isActive = (path) => path === '/nutrition'
    ? location.pathname.startsWith('/nutrition')
    : location.pathname === path;
  const visibleNavItems = NAV_ITEMS.filter(item => !item.superAdminOnly || user?.role === 'super_admin');
  const directNavItems = visibleNavItems.filter(item => DIRECT_NAV_PATHS.includes(item.path));
  const currentContext = PAGE_CONTEXT[location.pathname]
    || (location.pathname.startsWith('/nutrition') ? 'Nutrition' : 'Atifit');

  useEffect(() => {
    setMenuOpen(false);
    setFocusedPath(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleKeyDown = event => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Header unique — fixé en haut, menu déployable, aucune navigation horizontale */}
      <header className="glass-nav fixed top-0 inset-x-0 z-50">
        <div
          className="header-shell max-w-6xl mx-auto px-4 sm:px-6 h-14 lg:h-16 flex items-center justify-between gap-3"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="min-w-0 flex items-center gap-2 xl:gap-3">
            <p className="header-context font-mono uppercase tracking-[.16em] truncate" style={{ color: 'var(--text-light-secondary)' }}>
              {currentContext}
            </p>
            <nav aria-label="Navigation principale" className="header-primary-nav hidden lg:flex items-center gap-0.5 xl:gap-1 min-w-0">
              {directNavItems.map(({ path, label, icon }) => (
                <Link
                  key={path}
                  to={path}
                  title={label}
                  aria-label={label}
                  className="header-primary-link flex items-center gap-2 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0"
                  style={{
                    color: isActive(path) ? 'var(--accent-blue)' : 'var(--text-light-secondary)',
                    background: isActive(path) ? 'rgba(255,255,255,0.08)' : 'transparent',
                  }}
                >
                  {React.createElement(icon, { size: 16 })}
                  <span className="header-nav-label hidden xl:inline">{label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {user && (
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm max-w-[12rem]" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <span className="truncate">{user.pseudo || user.email}</span>
              </div>
            )}
            <button
              onClick={toggleTheme}
              className="header-theme-button p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMenuOpen(open => !open)}
              className="header-menu-button flex items-center gap-2 rounded-lg font-bold transition-colors"
              style={{
                color: 'var(--text-primary)',
                background: menuOpen ? 'rgba(255,255,255,0.10)' : 'transparent',
                border: '1px solid var(--glass-border)',
              }}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              aria-controls="main-menu-overlay"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              <span className="hidden sm:inline">{menuOpen ? 'Fermer' : 'Menu'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Menu plein écran — fond et texte suivent le thème pour garder le contraste */}
      {menuOpen && (
        <div
          id="main-menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
          className="fixed inset-0 z-40 overflow-y-auto"
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            paddingTop: 'calc(4rem + env(safe-area-inset-top))',
          }}
        >
          <nav
            className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10"
            onMouseLeave={() => setFocusedPath(null)}
          >
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {visibleNavItems.map(({ path, label, icon }, index) => {
                const active = isActive(path);
                const dimmed = focusedPath !== null && focusedPath !== path;

                return (
                  <li key={path}>
                    <Link
                      to={path}
                      data-nav-item={path}
                      onMouseEnter={() => setFocusedPath(path)}
                      onFocus={() => setFocusedPath(null)}
                      onBlur={() => setFocusedPath(null)}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-4 sm:py-5 rounded-2xl min-h-[56px] transition-all duration-300"
                      style={{
                        color: 'var(--text-primary)',
                        background: active ? 'var(--surface-subtle)' : 'transparent',
                        border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                        filter: dimmed ? 'blur(1px)' : 'none',
                        opacity: dimmed ? 0.62 : 1,
                        transform: focusedPath === path ? 'translateX(4px)' : 'none',
                      }}
                    >
                      <span className="font-mono text-xs w-6 shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {React.createElement(icon, { size: 20, style: { color: 'var(--accent-blue)' }, className: 'shrink-0' })}
                      <span className="text-xl sm:text-2xl font-display truncate">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
              {user && (
                <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {user.pseudo || user.email}
                </p>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold self-start"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--glass-border)', background: 'var(--surface-subtle)' }}
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main content — décalé sous le header fixé */}
      <main className="w-full relative z-10 flex-1 pb-10 md:pb-12 pt-14 lg:pt-16" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        {children}
      </main>

      {/* Footer */}
      <div className="hidden lg:block mt-auto pt-6">
        <Footer />
      </div>

    </div>
  );
};

export default Layout;
