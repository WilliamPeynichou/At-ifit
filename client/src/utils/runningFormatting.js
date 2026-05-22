export const isNumber = (value) => Number.isFinite(Number(value));

export const formatPace = (paceMinKm) => {
  if (!isNumber(paceMinKm) || Number(paceMinKm) <= 0) return '-';
  const seconds = Math.round(Number(paceMinKm) * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}/km`;
};

export const formatDuration = (minutes) => {
  if (!isNumber(minutes) || Number(minutes) <= 0) return '0 min';
  const rounded = Math.round(Number(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return hours ? `${hours}h${String(mins).padStart(2, '0')}` : `${mins} min`;
};

export const formatDistance = (km) => {
  if (!isNumber(km)) return '-';
  return `${Number(km).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
};

export const formatSpeed = (kmh) => {
  if (!isNumber(kmh)) return '-';
  return `${Number(kmh).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`;
};

export const formatPercent = (value) => {
  if (!isNumber(value)) return '-';
  const number = Number(value);
  return `${number > 0 ? '+' : ''}${(number * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
