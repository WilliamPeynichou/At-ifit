import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Github, Heart } from 'lucide-react';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--glass-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div
              className="p-1.5 rounded-lg"
              style={{ background: 'var(--accent-blue-light)', border: '1px solid rgba(0,85,255,0.15)' }}
            >
              <Activity className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
            </div>
            <span
              className="text-base"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em', color: 'var(--text-primary)' }}
            >
              AT<span style={{ color: 'var(--accent-blue)' }}>IFIT</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 flex-wrap justify-center">
            {[
              { to: '/', label: 'Dashboard' },
              { to: '/strava-stats', label: 'Strava' },
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
            © {year} Atifit — fait avec
            <Heart className="w-3 h-3 inline" style={{ color: 'var(--accent-blue)' }} />
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
