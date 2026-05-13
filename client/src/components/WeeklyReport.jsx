import React, { useState, useEffect } from 'react';
import api from '../api';
import { Sparkles, RefreshCw, Clock } from 'lucide-react';

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Affiche chaque paragraphe séparé (ligne vide = séparateur)
function ReportText({ text }) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  return (
    <div className="space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {p.trim()}
        </p>
      ))}
    </div>
  );
}

const WeeklyReport = () => {
  const [report, setReport] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Chargement automatique si on est lundi
  useEffect(() => {
    const day = new Date().getDay(); // 1 = lundi
    if (day === 1) {
      loadReport(false);
    }
  }, []);

  const loadReport = async (force = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/ai-coach/weekly-report${force ? '?force=true' : ''}`);
      setReport(res.data.report);
      setGeneratedAt(res.data.generatedAt);
      setCached(res.data.cached);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de générer le bilan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(0,85,255,0.08)', border: '1.5px solid rgba(0,85,255,0.15)' }}>
            <Sparkles className="w-5 h-5" style={{ color: '#0055ff' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Bilan hebdomadaire IA
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Analyse de ta semaine par ton coach IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {generatedAt && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <Clock className="w-3 h-3" />
              {formatDate(generatedAt)}
              {cached && ' (cache)'}
            </span>
          )}
          <button
            onClick={() => report ? loadReport(true) : loadReport(false)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'rgba(0,85,255,0.06)',
              border: '1px solid rgba(0,85,255,0.2)',
              color: loading ? 'var(--text-muted)' : '#0055ff',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Génération...' : report ? 'Regénérer' : 'Générer mon bilan'}
          </button>
        </div>
      </div>

      {/* Contenu */}
      {error && (
        <div className="p-3 rounded-lg text-sm mb-4" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {loading && !report && (
        <div className="py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: '#0055ff' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Analyse de ta semaine en cours...
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Cela peut prendre jusqu'à 30 secondes.
          </p>
        </div>
      )}

      {!loading && !report && !error && (
        <div className="py-6 text-center">
          <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Clique sur "Générer mon bilan" pour obtenir une analyse personnalisée de ta semaine.
          </p>
        </div>
      )}

      {report && (
        <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
          <ReportText text={report} />
        </div>
      )}
    </div>
  );
};

export default WeeklyReport;
