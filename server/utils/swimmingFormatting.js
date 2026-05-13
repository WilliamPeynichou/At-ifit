function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function round(value, digits = 1) {
  if (!isFiniteNumber(value)) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function formatSwimPace(paceMinPer100m) {
  if (!isFiniteNumber(paceMinPer100m) || Number(paceMinPer100m) <= 0) return '-';
  const totalSeconds = Math.round(Number(paceMinPer100m) * 60);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}/100m`;
}

function formatDuration(minutes) {
  if (!isFiniteNumber(minutes) || Number(minutes) <= 0) return '0 min';
  const rounded = Math.round(Number(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return hours ? `${hours}h${String(mins).padStart(2, '0')}` : `${mins} min`;
}

function formatDistanceMeters(meters) {
  if (!isFiniteNumber(meters)) return '-';
  return `${Math.round(Number(meters)).toLocaleString('fr-FR')} m`;
}

function formatDistanceKm(km) {
  if (!isFiniteNumber(km)) return '-';
  return `${Number(km).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}

function formatSpeed(kmh) {
  if (!isFiniteNumber(kmh)) return '-';
  return `${Number(kmh).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`;
}

function formatHeartRate(bpm) {
  if (!isFiniteNumber(bpm)) return '-';
  return `${Math.round(Number(bpm))} bpm`;
}

function formatCalories(calories) {
  if (!isFiniteNumber(calories)) return '-';
  return `${Math.round(Number(calories)).toLocaleString('fr-FR')} kcal`;
}

function formatPercentage(value) {
  if (!isFiniteNumber(value)) return '-';
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${(n * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

module.exports = {
  round,
  formatSwimPace,
  formatDuration,
  formatDistanceMeters,
  formatDistanceKm,
  formatSpeed,
  formatHeartRate,
  formatCalories,
  formatPercentage,
  formatDate,
};
