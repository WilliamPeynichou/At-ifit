import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';
import { countryNames } from '../i18n/translations';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [country, setCountry] = useState('FR');
  const [healthDataConsent, setHealthDataConsent] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!healthDataConsent || !ageConfirmed) {
      setError('Merci de confirmer ton âge et ton consentement au traitement des données de santé.');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, pseudo, country, { healthDataConsent, ageConfirmed });
      setTimeout(() => {
        navigate('/new-user-profile');
      }, 100);
    } catch (err) {
      let errorMessage = '';

      if (!err.response) {
        errorMessage = 'Erreur réseau : impossible de joindre le serveur.';
      } else if (err.response?.data?.details && Array.isArray(err.response.data.details)) {
        errorMessage = err.response.data.details.join(', ');
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else {
        errorMessage = err.message || 'Inscription échouée. Veuillez réessayer.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 py-8"
      style={{
        background: 'linear-gradient(135deg, #0b0a0d 0%, #0d1020 100%)',
      }}
    >
      <div
        className="glass-panel p-8 sm:p-10 w-full max-w-md"
        
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--accent-blue-light)', border: '1px solid rgba(0,85,255,0.15)' }}
          >
            <Activity className="w-8 h-8" style={{ color: 'var(--accent-blue)' }} />
          </div>
          <h1 className="text-3xl" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
            AT<span style={{ color: 'var(--accent-blue)' }}>IFIT</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Créez votre compte</p>
        </div>

        {error && (
          <div
            className="px-4 py-3 rounded-xl mb-6 text-sm font-medium"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-clean"
              required
              placeholder="vous@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-secondary)' }}>
              Pseudo (optionnel)
            </label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="input-clean"
              placeholder="Votre pseudo"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-secondary)' }}>
              Pays
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input-clean"
              required
            >
              <option value="FR">{countryNames.FR.EN}</option>
              <option value="US">{countryNames.US.EN}</option>
              <option value="GB">{countryNames.GB.EN}</option>
              <option value="TR">{countryNames.TR.EN}</option>
              <option value="IT">{countryNames.IT.EN}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-secondary)' }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-clean"
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-secondary)' }}>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-clean"
              required
              placeholder="••••••••"
            />
          </div>

          <fieldset className="space-y-3 rounded-xl p-4" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--glass-border)' }}>
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Tes données</legend>
            <label className="flex items-start gap-3 text-xs leading-relaxed cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                name="ageConfirmed"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#d97757]"
                required
              />
              <span>J’ai 15 ans ou plus et j’ai lu la <Link to="/confidentialite" target="_blank" className="underline font-semibold" style={{ color: 'var(--accent-blue)' }}>politique de confidentialité</Link>.</span>
            </label>
            <label className="flex items-start gap-3 text-xs leading-relaxed cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                name="healthDataConsent"
                checked={healthDataConsent}
                onChange={(e) => setHealthDataConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#d97757]"
                required
              />
              <span>J’accepte explicitement qu’Atifit traite mes données de santé et d’effort (poids, fréquence cardiaque, activités) pour calculer mes analyses. Retrait possible à tout moment en supprimant mon compte depuis mon profil.</span>
            </label>
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-sm mt-2"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Déjà inscrit ?{' '}
          <Link to="/login" className="font-semibold transition-colors" style={{ color: 'var(--accent-blue)' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
