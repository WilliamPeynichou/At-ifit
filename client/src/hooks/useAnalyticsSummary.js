import { useEffect, useState } from 'react';
import api from '../api';

export default function useAnalyticsSummary(year = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = year ? `?year=${year}` : '';
    api.get(`/strava/analytics/summary${params}`)
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
  }, [year]);

  return { data, loading, error };
}
