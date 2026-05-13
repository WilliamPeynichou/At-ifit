export const isNumber = (value) => Number.isFinite(Number(value));

export const formatDuration = (minutes) => {
  if (!isNumber(minutes) || Number(minutes) <= 0) return '0 min';
  const rounded = Math.round(Number(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return hours ? `${hours}h${String(mins).padStart(2, '0')}` : `${mins} min`;
};

export const formatDistance = (km) => {
  if (!isNumber(km)) return '-';
  return `${Number(km).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
};

export const formatSpeed = (kmh) => {
  if (!isNumber(kmh)) return '-';
  return `${Number(kmh).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`;
};

export const formatHeartRate = (bpm) => {
  if (!isNumber(bpm)) return '-';
  return `${Math.round(Number(bpm))} bpm`;
};

export const formatPower = (watts) => {
  if (!isNumber(watts)) return '-';
  return `${Math.round(Number(watts))} W`;
};

export const formatPowerToWeight = (wkg) => {
  if (!isNumber(wkg)) return '-';
  return `${Number(wkg).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} W/kg`;
};

export const formatElevation = (meters) => {
  if (!isNumber(meters)) return '-';
  return `${Math.round(Number(meters)).toLocaleString('fr-FR')} m`;
};

export const formatCadence = (rpm) => {
  if (!isNumber(rpm)) return '-';
  return `${Math.round(Number(rpm))} rpm`;
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
