import React, { useEffect, useMemo, useState } from 'react';
import { Bike, CircleUserRound, HeartPulse, Loader2, LogOut, Pencil, Ruler, Save, Scale, ShieldCheck, Target, Unplug, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Homme' },
  { value: 'female', label: 'Femme' },
  { value: 'other', label: 'Autre' },
];

const BIKE_TYPES = [
  { value: '', label: 'À préciser plus tard' },
  { value: 'road', label: 'Route' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'indoor', label: 'Home trainer' },
  { value: 'commute', label: 'Vélotaf' },
  { value: 'mixed', label: 'Mixte' },
];

const CYCLING_GOALS = [
  { value: '', label: 'À préciser plus tard' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'ftp', label: 'Augmenter la FTP' },
  { value: 'climb', label: 'Grimpe' },
  { value: 'race', label: 'Course' },
  { value: 'health', label: 'Santé' },
];

const toInputValue = value => (value === undefined || value === null ? '' : String(value));

/** Espace de compte : données athlète, objectifs et actions liées au profil. */
export default function Profile() {
  const { user, loadUser, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!user) return;
    setForm({
      pseudo: toInputValue(user.pseudo),
      height: toInputValue(user.height),
      age: toInputValue(user.age),
      gender: user.gender || 'other',
      country: user.country || 'FR',
      targetWeight: toInputValue(user.targetWeight),
      restHeartrate: toInputValue(user.restHeartrate),
      bikeType: user.bikeType || '',
      cyclingGoal: user.cyclingGoal || '',
    });
  }, [user]);

  const profileComplete = Boolean(user?.pseudo && user?.height && user?.age && user?.gender);
  const athleteRows = useMemo(() => [
    { icon: Ruler, label: 'Taille', value: user?.height ? `${user.height} cm` : 'Non renseignée' },
    { icon: Scale, label: 'Poids actuel', value: user?.weight ? `${user.weight} kg` : 'Non renseigné' },
    { icon: Target, label: 'Poids cible', value: user?.targetWeight ? `${user.targetWeight} kg` : 'Non renseigné' },
    { icon: HeartPulse, label: 'FC repos', value: user?.restHeartrate ? `${user.restHeartrate} bpm` : 'Non renseignée' },
  ], [user]);

  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.patch('/user', {
        ...form,
        height: form.height === '' ? null : Number(form.height),
        age: form.age === '' ? null : Number(form.age),
        targetWeight: form.targetWeight === '' ? null : Number(form.targetWeight),
        restHeartrate: form.restHeartrate === '' ? null : Number(form.restHeartrate),
      });
      await loadUser();
      setEditing(false);
      setMessage('Profil enregistré.');
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour le profil.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    setError('');
    setForm({
      pseudo: toInputValue(user?.pseudo), height: toInputValue(user?.height), age: toInputValue(user?.age),
      gender: user?.gender || 'other', country: user?.country || 'FR', targetWeight: toInputValue(user?.targetWeight),
      restHeartrate: toInputValue(user?.restHeartrate), bikeType: user?.bikeType || '', cyclingGoal: user?.cyclingGoal || '',
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-7">
      <header className="glass-panel p-6 sm:p-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        <div className="flex gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
            <CircleUserRound size={30} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>Mon espace athlète</p>
            <h1 className="text-3xl sm:text-4xl font-black mt-1 truncate">{user?.pseudo || 'Profil'}</h1>
            <p className="text-sm mt-2 break-all" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
          </div>
        </div>
        <button type="button" onClick={() => setEditing(current => !current)} className="btn-primary inline-flex items-center gap-2 shrink-0 self-start">
          <Pencil size={16} /> {editing ? 'Fermer l’édition' : 'Modifier mon profil'}
        </button>
      </header>

      {message && <p className="glass-panel p-4 text-sm" style={{ borderColor: '#788c5d', color: 'var(--text-primary)' }}>{message}</p>}
      {error && <p className="glass-panel p-4 text-sm" style={{ borderColor: '#d97757', color: '#d97757' }}>{error}</p>}

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Repères athlète">
        {athleteRows.map(({ icon, label, value }) => (
          <article key={label} className="glass-card p-4">
            {React.createElement(icon, { size: 18, style: { color: 'var(--accent-blue)' } })}
            <p className="text-xs uppercase mt-3" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-lg font-display mt-1">{value}</p>
          </article>
        ))}
      </section>

      {editing ? (
        <form onSubmit={save} className="glass-panel p-5 sm:p-6 space-y-6">
          <div className="flex items-center gap-2"><UserRound size={20} style={{ color: 'var(--accent-blue)' }} /><h2 className="text-2xl">Informations athlète</h2></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="text-xs font-bold uppercase">Pseudo<input required name="pseudo" value={form.pseudo || ''} onChange={update} className="input-cyber mt-2" /></label>
            <label className="text-xs font-bold uppercase">Genre<select name="gender" value={form.gender || 'other'} onChange={update} className="input-cyber mt-2">{GENDER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="text-xs font-bold uppercase">Pays<select name="country" value={form.country || 'FR'} onChange={update} className="input-cyber mt-2"><option value="FR">France</option><option value="BE">Belgique</option><option value="CH">Suisse</option><option value="CA">Canada</option><option value="GB">Royaume-Uni</option><option value="US">États-Unis</option><option value="IT">Italie</option><option value="TR">Turquie</option></select></label>
            <label className="text-xs font-bold uppercase">Taille (cm)<input name="height" type="number" min="100" max="250" value={form.height || ''} onChange={update} className="input-cyber mt-2" /></label>
            <label className="text-xs font-bold uppercase">Âge<input name="age" type="number" min="16" max="100" value={form.age || ''} onChange={update} className="input-cyber mt-2" /></label>
            <label className="text-xs font-bold uppercase">Poids cible (kg)<input name="targetWeight" type="number" min="30" max="300" step="0.1" value={form.targetWeight || ''} onChange={update} className="input-cyber mt-2" /></label>
          </div>
          <div className="rounded-xl p-4 sm:p-5" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-2 mb-4"><Bike size={19} style={{ color: 'var(--accent-blue)' }} /><h3 className="text-lg">Pratique cycliste</h3></div>
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="text-xs font-bold uppercase">FC repos<input name="restHeartrate" type="number" min="25" max="120" value={form.restHeartrate || ''} onChange={update} className="input-cyber mt-2" /></label>
              <label className="text-xs font-bold uppercase">Pratique<select name="bikeType" value={form.bikeType || ''} onChange={update} className="input-cyber mt-2">{BIKE_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="text-xs font-bold uppercase">Objectif<select name="cyclingGoal" value={form.cyclingGoal || ''} onChange={update} className="input-cyber mt-2">{CYCLING_GOALS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" onClick={cancelEditing} className="btn-ghost">Annuler</button>
          </div>
        </form>
      ) : (
        <section className="glass-panel p-5 sm:p-6">
          <div className="flex items-center gap-2"><ShieldCheck size={20} style={{ color: profileComplete ? '#788c5d' : '#d97757' }} /><h2 className="text-2xl">État du profil</h2></div>
          <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
            {profileComplete ? 'Profil athlète renseigné. Mets-le à jour dès que tes objectifs changent.' : 'Quelques informations manquent pour personnaliser au mieux les calculs et recommandations.'}
          </p>
        </section>
      )}

      <section className="glass-panel p-5 sm:p-6">
        <h2 className="text-2xl">Actions du compte</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          <Link to="/new-user-weight" className="rounded-xl p-4 transition-colors" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}><Scale size={19} style={{ color: 'var(--accent-blue)' }} /><h3 className="mt-3 font-bold">Suivi du poids</h3><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Ajouter ou consulter tes mesures.</p></Link>
          <Link to="/strava-connect" className="rounded-xl p-4 transition-colors" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}><Unplug size={19} style={{ color: 'var(--accent-blue)' }} /><h3 className="mt-3 font-bold">{user?.stravaConnected ? 'Gérer Strava' : 'Connecter Strava'}</h3><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{user?.stravaConnected ? 'Synchronisation et données d’activité.' : 'Optionnel : améliore les prédictions.'}</p></Link>
          <button type="button" onClick={async () => { await logout(); navigate('/login'); }} className="rounded-xl p-4 text-left" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}><LogOut size={19} style={{ color: '#d97757' }} /><h3 className="mt-3 font-bold">Se déconnecter</h3><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Fermer cette session sur cet appareil.</p></button>
        </div>
      </section>
    </div>
  );
}
