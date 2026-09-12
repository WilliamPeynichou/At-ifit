import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="dark-surface"
      style={{
        background: 'rgba(11,10,13,0.94)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--glass-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          <Link to="/" className="font-display text-base tracking-widest" style={{ color: 'var(--text-primary)' }}>
            Atifit
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 flex-wrap justify-center">
            {[
              { to: '/', label: 'Dashboard' },
              { to: '/strava-stats', label: 'Strava' },
              { to: '/cyclisme', label: 'Cyclisme' },
              { to: '/kcal-calculator', label: 'Calories' },
              { to: '/stats-explanation', label: 'Guide' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--accent-blue)';
                  e.currentTarget.style.background = 'var(--accent-blue-light)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <p
            className="text-xs flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
          >
            © {year} Atifit par William Peynichou
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
