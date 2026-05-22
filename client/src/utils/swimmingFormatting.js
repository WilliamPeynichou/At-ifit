export const isNumber = (value) => Number.isFinite(Number(value));

export const formatSwimPace = (paceMinPer100m) => {
  if (!isNumber(paceMinPer100m) || Number(paceMinPer100m) <= 0) return '-';
  const seconds = Math.round(Number(paceMinPer100m) * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}/100m`;
};

export const formatDuration = (minutes) => {
  if (!isNumber(minutes) || Number(minutes) <= 0) return '0 min';
  const rounded = Math.round(Number(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return hours ? `${hours}h${String(mins).padStart(2, '0')}` : `${mins} min`;
};

export const formatDistanceMeters = (meters) => {
  if (!isNumber(meters)) return '-';
  return `${Math.round(Number(meters)).toLocaleString('fr-FR')} m`;
};

export const formatDistanceKm = (km) => {
  if (!isNumber(km)) return '-';
  return `${Number(km).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
};

export const formatSpeed = (kmh) => {
  if (!isNumber(kmh)) return '-';
  return `${Number(kmh).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`;
};

export const formatHeartRate = (bpm) => {
  if (!isNumber(bpm)) return '-';
  return `${Math.round(Number(bpm))} bpm`;
};

export const formatCalories = (calories) => {
  if (!isNumber(calories)) return '-';
  return `${Math.round(Number(calories)).toLocaleString('fr-FR')} kcal`;
};

export const formatPercentage = (value) => {
  if (!isNumber(value)) return '-';
  const number = Number(value);
  return `${number > 0 ? '+' : ''}${(number * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
