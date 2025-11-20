import React from 'react';
import { Activity, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen relative">

      <header className="glass-panel sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="relative">
              <div className="absolute inset-0 bg-[#00f3ff] blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-black/50 rounded-xl p-2 border border-[#00f3ff]/30">
                <Activity className="w-6 h-6 text-[#00f3ff]" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-wider">
              <span className="text-white">At</span>
              <span className="text-neon-cyan"> ifit</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/strava-stats" className="text-sm font-bold text-slate-300 hover:text-[#fc4c02] transition-colors flex items-center gap-2">
              <Activity size={16} />
              STRAVA
            </Link>
            <Link to="/kcal-calculator" className="text-sm font-bold text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-2">
              <Activity size={16} className="text-blue-400" />
              KCAL
            </Link>
            {user && (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse"></div>
                <span className="text-sm font-medium text-slate-300 tracking-wide">
                  {user.pseudo || user.email}
                </span>
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white hover:text-[#bc13fe] transition-colors duration-300"
            >
              <LogOut className="w-4 h-4" />
              LOGOUT
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {children}
      </main>
    </div>
  );
};

export default Layout;
