function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function round(value, digits = 1) {
  if (!isFiniteNumber(value)) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function formatPace(paceMinKm) {
  if (!isFiniteNumber(paceMinKm) || Number(paceMinKm) <= 0) return '-';
  const totalSeconds = Math.round(Number(paceMinKm) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
}

function formatDuration(minutes) {
  if (!isFiniteNumber(minutes) || Number(minutes) <= 0) return '0 min';
  const rounded = Math.round(Number(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours <= 0) return `${mins} min`;
  return `${hours}h${String(mins).padStart(2, '0')}`;
}

function formatDistance(km) {
  if (!isFiniteNumber(km)) return '-';
  return `${Number(km).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}

function formatSpeed(kmh) {
  if (!isFiniteNumber(kmh)) return '-';
  return `${Number(kmh).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`;
}

function formatPercent(value) {
  if (!isFiniteNumber(value)) return '-';
  const number = Number(value);
  const sign = number > 0 ? '+' : '';
  return `${sign}${(number * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

module.exports = {
  round,
  formatPace,
  formatDuration,
  formatDistance,
  formatSpeed,
  formatPercent,
};
