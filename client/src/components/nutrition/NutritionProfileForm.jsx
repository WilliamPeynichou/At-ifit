import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Save, X } from 'lucide-react';
import { getNutritionProfile, saveNutritionProfile } from '../../services/racesApi';

const GUT_TOLERANCE_OPTIONS = [
  { value: 'low', label: 'Sensible' },
  { value: 'medium', label: 'Normale' },
  { value: 'high', label: 'Solide' },
  { value: 'trained', label: 'Entraînée (>90 g/h)' },
];

const SWEAT_OPTIONS = [
  { value: 'low', label: 'Peu salée' },
  { value: 'normal', label: 'Normale' },
  { value: 'salty', label: 'Très salée (traces blanches)' },
];

const DIET_OPTIONS = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'vegetarian', label: 'Végétarien' },
  { value: 'vegan', label: 'Végétalien' },
  { value: 'pescatarian', label: 'Pescétarien' },
];

const SUGGESTED_ALLERGIES = ['Gluten', 'Lactose', 'Fruits à coque', 'Arachide', 'Œuf', 'Soja'];
const MAX_ALLERGIES = 20;
const MAX_ALLERGY_LENGTH = 40;
const MAX_PRODUCTS_LENGTH = 500;

const DEFAULT_PROFILE = {
  gutTolerance: 'medium',
  sweatSodiumProfile: 'normal',
  diet: 'omnivore',
  allergies: [],
  preferredProducts: '',
  avoidedProducts: '',
  caffeine: false,
};

const labelClass = 'block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest';

function normalizeProfile(data) {
  const source = data || {};
  return {
    gutTolerance: source.gutTolerance || DEFAULT_PROFILE.gutTolerance,
    sweatSodiumProfile: source.sweatSodiumProfile || DEFAULT_PROFILE.sweatSodiumProfile,
    diet: source.diet || DEFAULT_PROFILE.diet,
    allergies: Array.isArray(source.allergies) ? source.allergies : [],
    preferredProducts: source.preferredProducts || '',
    avoidedProducts: source.avoidedProducts || '',
    caffeine: Boolean(source.caffeine),
  };
}

export default function NutritionProfileForm() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [allergyInput, setAllergyInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getNutritionProfile()
      .then(data => { if (active) setProfile(normalizeProfile(data)); })
      .catch(() => { if (active) setError('Impossible de charger ton profil nutrition.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const update = (patch) => {
    setSaved(false);
    setProfile(prev => ({ ...prev, ...patch }));
  };

  const withAllergy = (list, raw) => {
    const value = raw.trim().slice(0, MAX_ALLERGY_LENGTH);
    if (!value || list.length >= MAX_ALLERGIES) return list;
    if (list.some(item => item.toLowerCase() === value.toLowerCase())) return list;
    return [...list, value];
  };

  const addAllergy = (raw) => {
    update({ allergies: withAllergy(profile.allergies, raw) });
  };

  const removeAllergy = (value) => {
    update({ allergies: profile.allergies.filter(item => item !== value) });
  };

  const handleAllergyKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addAllergy(allergyInput);
      setAllergyInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allergies = withAllergy(profile.allergies, allergyInput);
    setProfile(prev => ({ ...prev, allergies }));
    setAllergyInput('');
    setSaving(true);
    setError(null);
    try {
      const result = await saveNutritionProfile({ ...profile, allergies });
      setProfile(normalizeProfile(result || { ...profile, allergies }));
      setSaved(true);
    } catch {
      setError('Impossible d’enregistrer ton profil. Réessaie dans un instant.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="glass-panel p-6 flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement de ton profil nutrition...
      </section>
    );
  }

  return (
    <section className="glass-panel p-6">
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Mon profil nutrition</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Ces informations servent de base à la stratégie de chaque course : elles sont réutilisées automatiquement dans « Préparer une course ».
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label htmlFor="gutTolerance" className={labelClass}>Tolérance digestive</label>
            <select id="gutTolerance" value={profile.gutTolerance} onChange={e => update({ gutTolerance: e.target.value })} className="input-cyber">
              {GUT_TOLERANCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sweatSodiumProfile" className={labelClass}>Profil de sueur</label>
            <select id="sweatSodiumProfile" value={profile.sweatSodiumProfile} onChange={e => update({ sweatSodiumProfile: e.target.value })} className="input-cyber">
              {SWEAT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="diet" className={labelClass}>Régime</label>
            <select id="diet" value={profile.diet} onChange={e => update({ diet: e.target.value })} className="input-cyber">
              {DIET_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="allergyInput" className={labelClass}>Allergies et intolérances</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {profile.allergies.map(item => (
              <span key={item} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm" style={{ background: 'var(--accent-blue-light)', border: '1px solid var(--accent-blue)', color: 'var(--text-primary)' }}>
                {item}
                <button type="button" onClick={() => removeAllergy(item)} aria-label={`Retirer ${item}`} className="ml-1 opacity-70 hover:opacity-100">
                  <X size={14} />
                </button>
              </span>
            ))}
            {profile.allergies.length === 0 && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune renseignée.</span>}
          </div>
          <div className="flex gap-2">
            <input
              id="allergyInput"
              type="text"
              value={allergyInput}
              onChange={e => setAllergyInput(e.target.value)}
              onKeyDown={handleAllergyKeyDown}
              className="input-cyber"
              maxLength={MAX_ALLERGY_LENGTH}
              placeholder="Ajouter (Entrée pour valider)"
            />
            <button type="button" className="btn-ghost shrink-0" onClick={() => { addAllergy(allergyInput); setAllergyInput(''); }}>Ajouter</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {SUGGESTED_ALLERGIES.filter(item => !profile.allergies.includes(item)).map(item => (
              <button key={item} type="button" onClick={() => addAllergy(item)} className="text-xs px-2.5 py-1 rounded-md" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                + {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="preferredProducts" className={labelClass}>Produits préférés</label>
            <textarea
              id="preferredProducts"
              value={profile.preferredProducts}
              onChange={e => update({ preferredProducts: e.target.value })}
              className="input-cyber"
              rows={3}
              maxLength={MAX_PRODUCTS_LENGTH}
              placeholder="Gels à la banane, boisson isotonique citron, barres de riz…"
            />
          </div>
          <div>
            <label htmlFor="avoidedProducts" className={labelClass}>Produits à éviter</label>
            <textarea
              id="avoidedProducts"
              value={profile.avoidedProducts}
              onChange={e => update({ avoidedProducts: e.target.value })}
              className="input-cyber"
              rows={3}
              maxLength={MAX_PRODUCTS_LENGTH}
              placeholder="Gels trop sucrés, barres au chocolat, fructose en excès…"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={profile.caffeine} onChange={e => update({ caffeine: e.target.checked })} className="w-5 h-5" />
          J’utilise la caféine pendant l’effort (gel caféiné, boisson, café)
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Enregistrement...' : 'Enregistrer mon profil'}
          </button>
          {saved && (
            <span className="text-sm flex items-center gap-1.5" style={{ color: '#22c55e' }}>
              <Check className="w-4 h-4" /> Profil enregistré
            </span>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-5 p-4 rounded-lg flex items-start gap-3" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#f97316' }} />
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{error}</p>
        </div>
      )}
    </section>
  );
}
