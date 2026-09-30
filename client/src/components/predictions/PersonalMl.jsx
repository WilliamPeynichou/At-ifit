import React, { useEffect, useState } from 'react';
import api from '../../api';
import { formatMinutes } from '../../utils/pert';

const inputStyle = { background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' };
export default function PersonalMl() {
  const [model, setModel] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({ distanceKm: '', elevationM: '', date: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoadError(false);
    api.get('/user/predictions/model').then(r => { if (active) setModel(r.data); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [reload]);
  const update = (key, value) => { setForm(old => ({ ...old, [key]: value })); setResult(null); setError(''); };
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(''); setResult(null);
    try {
      const response = await api.post('/user/predictions/estimate', {
        distanceKm: Number(form.distanceKm), elevationM: Number(form.elevationM), date: form.date,
      }, { timeout: 25000 });
      setResult(response.data);
    } catch (failure) { setError(failure.response?.data?.error || 'Calcul indisponible. Réessaie plus tard.'); }
    finally { setBusy(false); }
  }
  return <section className="glass-panel p-5 sm:p-6" aria-labelledby="personal-ml-title">
    <h2 id="personal-ml-title" className="text-2xl">Mon modèle ML · Vélo</h2>
    <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Prototype expérimental. Temps en mouvement, pas temps d’arrivée en compétition. Aucun gain de précision garanti.</p>
    {loadError ? <div role="alert" className="mt-4">Chargement du modèle impossible. <button type="button" className="underline" onClick={() => setReload(x => x + 1)}>Réessayer</button></div>
      : !model ? <p role="status" className="mt-4">Chargement…</p>
        : model.status !== 'experimental' ? <p role="status" className="mt-4">Aucun modèle personnel disponible. Le prototype nécessite une activation et un modèle liés à ton compte côté serveur.</p>
          : <>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 text-sm">
              <div><dt>Sorties réelles</dt><dd className="font-bold">{model.realCount}</dd></div>
              <div><dt>Sorties simulées</dt><dd className="font-bold">{model.syntheticCount}</dd></div>
              <div><dt>Erreur moyenne ML</dt><dd className="font-bold">{model.metrics.MAPE_duree_pct} %</dd></div>
              <div><dt>Erreur estimation classique</dt><dd className="font-bold">{model.baselineMetrics.MAPE_duree_pct} %</dd></div>
              <div><dt>Couverture observée</dt><dd className="font-bold">{model.intervalCoverage === null ? 'Non mesurée' : `${Math.round(model.intervalCoverage * 100)} %`} ({model.intervalCount} tests)</dd></div>
              <div><dt>Dernier entraînement</dt><dd className="font-bold">{new Date(model.trainedAt).toLocaleDateString('fr-FR')}</dd></div>
            </dl>
            <p className="text-sm mt-4">{model.significantImprovement ? 'Gain observé dans cette évaluation exploratoire ; à confirmer.' : 'Aucune amélioration statistiquement démontrée face à l’estimation classique.'}</p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <fieldset disabled={busy} className="grid sm:grid-cols-3 gap-3 min-w-0">
                <legend className="font-semibold mb-3">Estimer ma prochaine sortie</legend>
                <label className="min-w-0 text-sm">Distance (km)<input required type="number" min="5.1" max="500" step="0.1" value={form.distanceKm} onChange={e => update('distanceKm', e.target.value)} className="block w-full rounded-lg p-3 mt-1" style={inputStyle} /></label>
                <label className="min-w-0 text-sm">Dénivelé positif (m)<input required type="number" min="0" max="20000" step="1" value={form.elevationM} onChange={e => update('elevationM', e.target.value)} className="block w-full rounded-lg p-3 mt-1" style={inputStyle} /></label>
                <label className="min-w-0 text-sm">Date de sortie<input required type="date" value={form.date} onChange={e => update('date', e.target.value)} className="block w-full min-w-0 rounded-lg p-3 mt-1" style={inputStyle} /></label>
              </fieldset>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Calcul en cours…' : 'Calculer ma prédiction ML'}</button>
            </form>
            {error && <p role="alert" className="mt-4">{error}</p>}
            {result && <div role="status" className="mt-5 rounded-xl p-4" style={inputStyle}>
              <p>Durée expérimentale : <strong>{formatMinutes(result.target_minutes)}</strong></p>
              {result.interval && <p className="mt-2">Fourchette nominale 80 % : {formatMinutes(result.interval.low_minutes)} à {formatMinutes(result.interval.high_minutes)}. Couverture non garantie.</p>}
              {result.outside_training_domain && <p className="font-bold mt-3">Hors domaine d’entraînement : extrapolation, prudence renforcée.</p>}
              <p className="text-xs mt-3 break-all">Version : {result.model_version}</p>
              <p className="text-sm mt-2">Résultat non enregistré. Ne pas convertir automatiquement cette fourchette en scénarios PERT.</p>
            </div>}
          </>}
  </section>;
}
