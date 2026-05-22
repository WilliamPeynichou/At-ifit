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

export const buildRunningQuery = ({ period = '30D', from = '', to = '' } = {}) => {
  const params = new URLSearchParams();
  params.set('period', period);
  if (period === 'CUSTOM') {
    if (from) params.set('from', from);
    if (to) params.set('to', to);
  }
  return `?${params.toString()}`;
};

export const fetchRunningStats = (periodState) => (
  api.get(`/strava/running/stats${buildRunningQuery(periodState)}`)
);

export const syncRunningData = () => api.post('/strava/running/sync');
