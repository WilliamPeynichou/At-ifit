import { useEffect, useState } from 'react';
import api from '../api';
import { useTemporal } from '../context/TemporalContext';

export default function useAnalyticsSummary() {
  const { queryParams, fromISO, toISO } = useTemporal();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.get(`/strava/analytics/summary${queryParams}`)
      .then(res => {
        if (cancelled) return;
        setData(res.data);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.response?.data?.error || err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fromISO, toISO]);

  return { data, loading, error };
}
