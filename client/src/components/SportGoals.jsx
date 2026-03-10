import React, { useState, useEffect } from 'react';
import api from '../api';
import { Target, Plus, Trash2, CheckCircle2 } from 'lucide-react';

const TYPE_LABELS = {
  distance_monthly: 'Distance mensuelle',
  sessions_weekly: 'Séances / semaine',
  calories_weekly: 'Calories / semaine',
  elevation_monthly: 'Dénivelé mensuel',
};

const TYPE_UNITS = {
  distance_monthly: 'km',
  sessions_weekly: 'séances',
  calories_weekly: 'kcal',
  elevation_monthly: 'm',
};

const SPORT_OPTIONS = ['', 'Run', 'Ride', 'Swim', 'Walk', 'Hike', 'VirtualRide', 'Workout'];

const DEFAULT_FORM = {
  type: 'distance_monthly',
  sportType: '',
  targetValue: '',
  period: 'month',
};

// period est déduit du type automatiquement
function periodFromType(type) {
  return type.endsWith('_weekly') ? 'week' : 'month';
}

const SportGoals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/goals')
      .then(res => setGoals(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleTypeChange = (type) => {
    setForm(f => ({ ...f, type, period: periodFromType(type) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.targetValue || parseFloat(form.targetValue) <= 0) return;
    setSaving(true);
    try {
      await api.post('/goals', {
        type: form.type,
        sportType: form.sportType || null,
        targetValue: parseFloat(form.targetValue),
        period: form.period,
      });
      setForm(DEFAULT_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      console.error('Erreur création objectif', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/goals/${id}`);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error('Erreur suppression objectif', err);
    }
  };

  return (
    <div className="glass-panel p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(0,85,255,0.08)', border: '1.5px solid rgba(0,85,255,0.15)' }}>
            <Target className="w-5 h-5" style={{ color: '#0055ff' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Objectifs sportifs
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {goals.length} objectif{goals.length !== 1 ? 's' : ''} actif{goals.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: showForm ? 'rgba(0,85,255,0.08)' : 'rgba(0,85,255,0.06)',
            border: '1px solid rgba(0,85,255,0.2)',
            color: '#0055ff',
          }}
        >
          <Plus className="w-4 h-4" />
          Nouvel objectif
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(0,85,255,0.03)', border: '1px solid rgba(0,85,255,0.12)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {/* Type */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Type d'objectif</label>
              <select
                value={form.type}
                onChange={e => handleTypeChange(e.target.value)}
                className="input-clean w-full text-sm"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {/* Sport */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Sport (optionnel)</label>
              <select
                value={form.sportType}
                onChange={e => setForm(f => ({ ...f, sportType: e.target.value }))}
                className="input-clean w-full text-sm"
              >
                <option value="">Tous les sports</option>
                {SPORT_OPTIONS.filter(Boolean).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {/* Valeur cible */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                Valeur cible ({TYPE_UNITS[form.type]})
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={form.targetValue}
                onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))}
                placeholder={`ex: ${form.type === 'sessions_weekly' ? '4' : form.type === 'calories_weekly' ? '2000' : '100'}`}
                className="input-clean w-full text-sm"
                required
              />
            </div>
            {/* Période (affichage info) */}
            <div className="flex items-end">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Période : <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {form.period === 'week' ? 'Cette semaine (lun–dim)' : 'Ce mois-ci'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm px-4 py-2">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">
              {saving ? 'Enregistrement...' : 'Créer l\'objectif'}
            </button>
          </div>
        </form>
      )}

      {/* Liste des objectifs */}
      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</p>
      ) : goals.length === 0 ? (
        <div className="text-center py-8">
          <Target className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Aucun objectif actif. Créez-en un pour suivre votre progression.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const unit = TYPE_UNITS[goal.type] || '';
            const barColor = goal.achieved ? '#16a34a' : goal.progressPct >= 70 ? '#0055ff' : 'var(--text-muted)';

            return (
              <div key={goal.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {goal.achieved && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#16a34a' }} />}
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {TYPE_LABELS[goal.type] || goal.type}
                      </p>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {goal.sportType || 'Tous sports'} · {goal.period === 'week' ? 'Cette semaine' : 'Ce mois'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                    style={{ color: '#dc2626' }}
                    title="Supprimer l'objectif"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Barre de progression */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${goal.progressPct}%`, background: barColor }}
                    />
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-bold" style={{ color: barColor }}>
                      {goal.currentValue} {unit}
                    </span>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                      / {goal.targetValue} {unit}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {goal.progressPct}%
                  {goal.achieved
                    ? ' — Objectif atteint !'
                    : ` · ${Math.max(0, goal.targetValue - goal.currentValue).toFixed(unit === 'séances' ? 0 : 1)} ${unit} restants`
                  }
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SportGoals;
