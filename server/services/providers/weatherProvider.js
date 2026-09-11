const axios = require('axios');

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_HORIZON_DAYS = 16;

async function geocodeLocation(locationLabel) {
  if (!locationLabel || typeof locationLabel !== 'string') return null;

  const response = await axios.get(GEOCODING_URL, {
    params: {
      name: locationLabel.slice(0, 120),
      count: 1,
      language: 'fr',
      format: 'json',
    },
    timeout: 5000,
  });
  const result = response.data?.results?.[0];
  if (!result) return null;

  return {
    label: [result.name, result.admin1, result.country].filter(Boolean).join(', '),
    latitude: Number(result.latitude),
    longitude: Number(result.longitude),
    countryCode: result.country_code || null,
    timeZone: result.timezone || 'UTC',
  };
}

function daysFromNow(date) {
  return (new Date(date).getTime() - Date.now()) / 86400000;
}

/**
 * Prévision Open-Meteo jusqu'à 16 jours. On choisit l'heure la plus proche
 * du départ plutôt que d'inventer une précision à la minute.
 */
async function fetchForecast(location, plannedStartAt) {
  const target = new Date(plannedStartAt);
  const horizon = daysFromNow(target);
  if (horizon < -1 || horizon > FORECAST_HORIZON_DAYS) return null;

  const date = target.toISOString().slice(0, 10);
  const response = await axios.get(FORECAST_URL, {
    params: {
      latitude: location.latitude,
      longitude: location.longitude,
      hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability',
      start_date: date,
      end_date: date,
      timezone: location.timeZone,
    },
    timeout: 5000,
  });

  const hourly = response.data?.hourly;
  if (!hourly?.time?.length) return null;

  const targetMs = target.getTime();
  let bestIndex = 0;
  let bestDelta = Infinity;
  hourly.time.forEach((time, index) => {
    const delta = Math.abs(new Date(time).getTime() - targetMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = index;
    }
  });

  return {
    type: 'forecast',
    provider: 'open-meteo',
    locationLabel: location.label,
    timeZone: location.timeZone,
    temperatureC: Number(hourly.temperature_2m?.[bestIndex]),
    humidityPercent: Number(hourly.relative_humidity_2m?.[bestIndex]),
    windKmh: Number(hourly.wind_speed_10m?.[bestIndex]),
    precipitationProbabilityPercent: Number(hourly.precipitation_probability?.[bestIndex]),
    confidence: 'high',
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Repli saisonnier volontairement large pour une date hors prévision.
 * Ce n'est pas une normale météo précise : le libellé et la faible confiance
 * évitent toute confusion. L'hémisphère est déduit de la latitude.
 */
function seasonalEstimate(location, plannedStartAt) {
  const date = plannedStartAt ? new Date(plannedStartAt) : new Date();
  const month = date.getUTCMonth() + 1;
  const northern = location.latitude >= 0;
  const summerMonths = northern ? [6, 7, 8] : [12, 1, 2];
  const winterMonths = northern ? [12, 1, 2] : [6, 7, 8];

  let temperatureC = 18;
  let humidityPercent = 60;
  let season = 'interseason';
  if (summerMonths.includes(month)) {
    temperatureC = 25;
    humidityPercent = 55;
    season = 'summer';
  } else if (winterMonths.includes(month)) {
    temperatureC = 8;
    humidityPercent = 70;
    season = 'winter';
  }

  return {
    type: 'seasonal_estimate',
    provider: 'atifit-seasonal-baseline',
    locationLabel: location.label,
    timeZone: location.timeZone,
    season,
    temperatureC,
    humidityPercent,
    windKmh: null,
    precipitationProbabilityPercent: null,
    confidence: 'low',
    note: 'Date hors horizon de prévision : estimation saisonnière large, à recalculer 24 h avant le départ.',
    fetchedAt: new Date().toISOString(),
  };
}

/** Retourne null sans faire échouer le plan si le fournisseur est indisponible. */
async function getWeatherContext({ locationLabel, plannedStartAt }) {
  try {
    const location = await geocodeLocation(locationLabel);
    if (!location) return null;

    if (plannedStartAt) {
      const forecast = await fetchForecast(location, plannedStartAt);
      if (forecast) return forecast;
    }

    return seasonalEstimate(location, plannedStartAt);
  } catch (_error) {
    return null;
  }
}

module.exports = {
  geocodeLocation,
  fetchForecast,
  seasonalEstimate,
  getWeatherContext,
  FORECAST_HORIZON_DAYS,
};
