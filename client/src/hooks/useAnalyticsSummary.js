import { useEffect, useState } from 'react';
import api from '../api';
import { useTemporal } from '../context/TemporalContext';

// Cache global stale-while-revalidate (SWR) partagé entre toutes les instances du hook.
// Clé = `${fromISO}_${toISO}`. Valeur = { data, fetchedAt }.
// TTL "fresh" : 5 min — au-delà on refetch en background même si on retourne le cache instantanément.
const cache = new Map();
const FRESH_TTL_MS = 5 * 60 * 1000;

const cacheKey = (from, to) => `${from || 'null'}_${to || 'null'}`;

export default function useAnalyticsSummary() {
  const { queryParams, fromISO, toISO } = useTemporal();
  const key = cacheKey(fromISO, toISO);

  const cached = cache.get(key);

  const [data, setData] = useState(cached?.data || null);
  // Si on a déjà du cache (même périmé), on n'affiche pas le spinner
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetched = cache.get(key);
    const isStale = !fetched || (Date.now() - fetched.fetchedAt) > FRESH_TTL_MS;

    // Cache hit : sert immédiatement
    if (fetched) {
      setData(fetched.data);
      setLoading(false);
    } else {
      setData(null);
      setLoading(true);
    }
    setError(null);

    // Refetch en background si pas de cache OU si périmé
    if (isStale) {
      api.get(`/strava/analytics/summary${queryParams}`)
        .then(res => {
          if (cancelled) return;
          cache.set(key, { data: res.data, fetchedAt: Date.now() });
          setData(res.data);
        })
        .catch(err => {
          if (cancelled) return;
          // Garde le cache périmé en cas d'erreur réseau plutôt que de tout perdre
          if (!fetched) {
            setError(err.response?.data?.error || err.message);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => { cancelled = true; };
  }, [key]); // re-run uniquement quand la clé change

  return { data, loading, error };
}

// Utilitaire : invalider le cache (utile après une re-sync manuelle)
useAnalyticsSummary.invalidate = () => cache.clear();
