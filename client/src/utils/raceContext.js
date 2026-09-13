/**
 * Contexte de course partagé entre la préparation de course et la stratégie
 * nutritionnelle. Il évite de ressaisir les mêmes informations d'une page à
 * l'autre et permet de reprendre son parcours là où il s'est arrêté.
 */
const STORAGE_KEY = 'atifit:race-context:v1';

export function saveRaceContext(context) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...context, savedAt: Date.now() }));
    window.dispatchEvent(new Event('race-context-updated'));
  } catch {
    // Stockage indisponible : le parcours reste utilisable via les paramètres d'URL.
  }
}

export function loadRaceContext() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function clearRaceContext() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('race-context-updated'));
  } catch {
    // Rien à nettoyer si le stockage est indisponible.
  }
}

/** Construit la query string utilisée pour préremplir la stratégie nutritionnelle. */
export function buildStrategySearch(context) {
  if (!context) return '';
  const params = new URLSearchParams();
  const entries = {
    sport: context.sport,
    distanceKm: context.distanceKm,
    elevationGainM: context.elevationGainM,
    swimmingDistanceKm: context.swimmingDistanceKm,
    cyclingDistanceKm: context.cyclingDistanceKm,
    cyclingElevationGainM: context.cyclingElevationGainM,
    runningDistanceKm: context.runningDistanceKm,
    runningElevationGainM: context.runningElevationGainM,
    transitionMinutes: context.transitionMinutes,
    plannedStartAt: context.plannedStartAt,
    locationLabel: context.locationLabel,
    objectiveText: context.objectiveText,
    gutTolerance: context.gutTolerance,
    sweatSodiumProfile: context.sweatSodiumProfile,
  };

  Object.entries(entries).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });

  return params.toString();
}
