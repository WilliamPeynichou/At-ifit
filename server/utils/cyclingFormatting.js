function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function round(value, digits = 1) {
  if (!isFiniteNumber(value)) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function formatDuration(minutes) {
  if (!isFiniteNumber(minutes) || Number(minutes) <= 0) return '0 min';
  const rounded = Math.round(Number(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return hours ? `${hours}h${String(mins).padStart(2, '0')}` : `${mins} min`;
}

function formatDistance(km) {
  if (!isFiniteNumber(km)) return '-';
  return `${Number(km).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

function formatSpeed(kmh) {
  if (!isFiniteNumber(kmh)) return '-';
  return `${Number(kmh).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`;
}

function formatHeartRate(bpm) {
  if (!isFiniteNumber(bpm)) return '-';
  return `${Math.round(Number(bpm))} bpm`;
}

function formatPower(watts) {
  if (!isFiniteNumber(watts)) return '-';
  return `${Math.round(Number(watts))} W`;
}

function formatPowerToWeight(wkg) {
  if (!isFiniteNumber(wkg)) return '-';
  return `${Number(wkg).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} W/kg`;
}

function formatElevation(meters) {
  if (!isFiniteNumber(meters)) return '-';
  return `${Math.round(Number(meters)).toLocaleString('fr-FR')} m`;
}

function formatCadence(rpm) {
  if (!isFiniteNumber(rpm)) return '-';
  return `${Math.round(Number(rpm))} rpm`;
}

function formatCalories(calories) {
  if (!isFiniteNumber(calories)) return '-';
  return `${Math.round(Number(calories)).toLocaleString('fr-FR')} kcal`;
}

function formatPercentage(value) {
  if (!isFiniteNumber(value)) return '-';
  const number = Number(value);
  return `${number > 0 ? '+' : ''}${(number * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

module.exports = {
  round,
  formatDuration,
  formatDistance,
  formatSpeed,
  formatHeartRate,
  formatPower,
  formatPowerToWeight,
  formatElevation,
  formatCadence,
  formatCalories,
  formatPercentage,
  formatDate,
};
