import api from '../api';

export const PERIODS = [
  { value: '7D', label: '7 derniers jours' },
  { value: '30D', label: '30 derniers jours' },
  { value: '90D', label: '90 derniers jours' },
  { value: '6M', label: '6 derniers mois' },
  { value: 'YTD', label: 'Année en cours' },
  { value: 'ALL', label: 'Toutes les données' },
  { value: 'CUSTOM', label: 'Période personnalisée' },
];

export const buildCyclingQuery = ({
  period = '30D',
  from = '',
  to = '',
  includeGravel = true,
  includeVirtual = false,
  includeEbike = false,
} = {}) => {
  const params = new URLSearchParams();
  params.set('period', period);
  params.set('includeGravel', includeGravel ? 'true' : 'false');
  params.set('includeVirtual', includeVirtual ? 'true' : 'false');
  params.set('includeEbike', includeEbike ? 'true' : 'false');
  if (period === 'CUSTOM') {
    if (from) params.set('from', from);
    if (to) params.set('to', to);
  }
  return `?${params.toString()}`;
};

export const fetchCyclingStats = (periodState) => (
  api.get(`/strava/cycling/stats${buildCyclingQuery(periodState)}`)
);

export const syncCyclingData = () => api.post('/strava/cycling/sync');
