/**
 * Moteur de parcours GPX pour la préparation de course.
 *
 * - parseGpx(text)            → points bruts { lat, lon, ele }
 * - buildCourse(points)       → profil rééchantillonné + statistiques
 * - computePlan(course, opts) → temps de passage, sections, ravitos, splits
 *
 * Modèle de temps :
 *  - course à pied / trail : coût énergétique de Minetti (2002) selon la pente,
 *    calibré pour atteindre le temps objectif ;
 *  - vélo : bilan de puissance (aéro + roulement + gravité), la puissance
 *    constante est calibrée par dichotomie pour atteindre le temps objectif.
 * Les sections à vitesse imposée sont figées ; le reste du parcours absorbe
 * le temps restant.
 */

const EARTH_RADIUS_M = 6371008.8;
const toRad = deg => (deg * Math.PI) / 180;

export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* ------------------------------------------------------------------ */
/* Parsing                                                              */
/* ------------------------------------------------------------------ */

export function parseGpx(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Fichier GPX illisible.');

  const pick = tag => Array.from(doc.getElementsByTagName(tag));
  let nodes = pick('trkpt');
  if (!nodes.length) nodes = pick('rtept');
  if (nodes.length < 2) throw new Error('Aucune trace exploitable dans ce GPX.');

  const points = nodes
    .map(node => {
      const eleNode = node.getElementsByTagName('ele')[0];
      return {
        lat: Number(node.getAttribute('lat')),
        lon: Number(node.getAttribute('lon')),
        ele: eleNode ? Number(eleNode.textContent) : null,
      };
    })
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  const nameNode = doc.querySelector('trk > name') || doc.querySelector('metadata > name') || doc.querySelector('rte > name');
  const waypoints = pick('wpt')
    .map(node => ({
      lat: Number(node.getAttribute('lat')),
      lon: Number(node.getAttribute('lon')),
      name: node.getElementsByTagName('name')[0]?.textContent?.trim() || 'Waypoint',
    }))
    .filter(w => Number.isFinite(w.lat) && Number.isFinite(w.lon));

  return { name: nameNode?.textContent?.trim() || '', points, waypoints };
}

/* ------------------------------------------------------------------ */
/* Course building                                                      */
/* ------------------------------------------------------------------ */

function fillElevation(points) {
  const firstKnown = points.find(p => Number.isFinite(p.ele))?.ele ?? 0;
  let last = firstKnown;
  return points.map(p => {
    if (Number.isFinite(p.ele)) last = p.ele;
    return { ...p, ele: last };
  });
}

/** Moyenne glissante pondérée par la distance (fenêtre en mètres). */
function smoothElevation(samples, windowM) {
  const out = new Array(samples.length);
  let lo = 0;
  let hi = 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const d = samples[i].distanceM;
    while (hi < samples.length && samples[hi].distanceM <= d + windowM / 2) { sum += samples[hi].ele; hi += 1; }
    while (samples[lo].distanceM < d - windowM / 2) { sum -= samples[lo].ele; lo += 1; }
    out[i] = sum / (hi - lo);
  }
  return out;
}

/**
 * @param {{lat:number, lon:number, ele:number|null}[]} rawPoints
 * @param {{ stepM?: number, smoothingM?: number, waypoints?: object[] }} options
 */
export function buildCourse(rawPoints, { stepM, smoothingM = 120, waypoints = [] } = {}) {
  const points = fillElevation(rawPoints);
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) cumulative.push(cumulative[i - 1] + haversine(points[i - 1], points[i]));
  const totalM = cumulative[cumulative.length - 1];
  if (totalM < 50) throw new Error('Trace trop courte.');

  const step = stepM || Math.min(200, Math.max(20, totalM / 1500));
  const samples = [];
  let j = 0;
  for (let d = 0; d <= totalM + 1e-6; d += step) {
    while (j < cumulative.length - 2 && cumulative[j + 1] < d) j += 1;
    const span = cumulative[j + 1] - cumulative[j] || 1;
    const t = Math.min(1, Math.max(0, (d - cumulative[j]) / span));
    const a = points[j];
    const b = points[j + 1];
    samples.push({
      distanceM: d,
      lat: a.lat + (b.lat - a.lat) * t,
      lon: a.lon + (b.lon - a.lon) * t,
      ele: a.ele + (b.ele - a.ele) * t,
    });
  }
  if (samples[samples.length - 1].distanceM < totalM) {
    const last = points[points.length - 1];
    samples.push({ distanceM: totalM, lat: last.lat, lon: last.lon, ele: last.ele });
  }

  const smooth = smoothElevation(samples, smoothingM);
  let gainM = 0;
  let lossM = 0;
  const profile = samples.map((s, i) => {
    const ele = smooth[i];
    let grade = 0;
    if (i > 0) {
      const dh = ele - smooth[i - 1];
      const dd = s.distanceM - samples[i - 1].distanceM || 1;
      grade = dh / dd;
      if (dh > 0) gainM += dh; else lossM -= dh;
    }
    return { km: s.distanceM / 1000, ele, rawEle: s.ele, grade, lat: s.lat, lon: s.lon };
  });
  // la pente du premier point reprend celle du segment suivant
  if (profile.length > 1) profile[0].grade = profile[1].grade;

  const eles = profile.map(p => p.ele);
  const snappedWaypoints = waypoints.map(w => ({ ...w, km: nearestKm(profile, w) }));

  return {
    profile,
    stats: {
      distanceKm: totalM / 1000,
      gainM: Math.round(gainM),
      lossM: Math.round(lossM),
      minEle: Math.round(Math.min(...eles)),
      maxEle: Math.round(Math.max(...eles)),
      maxGrade: Math.max(...profile.map(p => p.grade)),
      minGrade: Math.min(...profile.map(p => p.grade)),
    },
    waypoints: snappedWaypoints,
    bounds: [
      [Math.min(...profile.map(p => p.lat)), Math.min(...profile.map(p => p.lon))],
      [Math.max(...profile.map(p => p.lat)), Math.max(...profile.map(p => p.lon))],
    ],
  };
}

function nearestKm(profile, point) {
  let best = Infinity;
  let km = 0;
  for (const p of profile) {
    const d = (p.lat - point.lat) ** 2 + (p.lon - point.lon) ** 2;
    if (d < best) { best = d; km = p.km; }
  }
  return km;
}

/** Point du profil interpolé au kilomètre donné. */
export function pointAtKm(course, km) {
  const { profile } = course;
  if (!profile.length) return null;
  if (km <= 0) return profile[0];
  if (km >= profile[profile.length - 1].km) return profile[profile.length - 1];
  let lo = 0;
  let hi = profile.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (profile[mid].km < km) lo = mid; else hi = mid;
  }
  const a = profile[lo];
  const b = profile[hi];
  const t = (km - a.km) / (b.km - a.km || 1);
  return {
    km,
    ele: a.ele + (b.ele - a.ele) * t,
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
    grade: b.grade,
  };
}

/** Dénivelés positif / négatif entre deux bornes kilométriques. */
export function elevationBetween(course, fromKm, toKm) {
  let gain = 0;
  let loss = 0;
  let prev = pointAtKm(course, fromKm).ele;
  for (const p of course.profile) {
    if (p.km <= fromKm || p.km > toKm) continue;
    const dh = p.ele - prev;
    if (dh > 0) gain += dh; else loss -= dh;
    prev = p.ele;
  }
  const end = pointAtKm(course, toKm).ele;
  const dh = end - prev;
  if (dh > 0) gain += dh; else loss -= dh;
  return { gainM: Math.round(gain), lossM: Math.round(loss) };
}

/* ------------------------------------------------------------------ */
/* Effort models                                                        */
/* ------------------------------------------------------------------ */

/** Minetti 2002 : coût énergétique (J/kg/m) en fonction de la pente. */
function minettiCost(grade) {
  const g = Math.max(-0.45, Math.min(0.45, grade));
  return 155.4 * g ** 5 - 30.4 * g ** 4 - 43.3 * g ** 3 + 46.3 * g ** 2 + 19.5 * g + 3.6;
}

/** Facteur multiplicatif d'allure (1 = plat). Descente plafonnée pour rester réaliste. */
export function runningGradeFactor(grade) {
  const factor = minettiCost(grade) / 3.6;
  return Math.max(0.78, Math.min(6, factor));
}

const CYCLING = { massKg: 82, crr: 0.005, cda: 0.32, rho: 1.2, g: 9.81, maxSpeedMs: 70 / 3.6, minSpeedMs: 4 / 3.6 };

/** Vitesse (m/s) à puissance donnée sur une pente donnée (dichotomie, racine positive unique). */
export function cyclingSpeedForPower(power, grade) {
  const { massKg, crr, cda, rho, g, maxSpeedMs, minSpeedMs } = CYCLING;
  const theta = Math.atan(grade);
  const resist = massKg * g * (Math.sin(theta) + crr * Math.cos(theta));
  const k = 0.5 * rho * cda;
  const f = v => k * v ** 3 + resist * v - power;
  let lo = 0.05;
  let hi = 40;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid; else lo = mid;
  }
  return Math.max(minSpeedMs, Math.min(maxSpeedMs, (lo + hi) / 2));
}

/* ------------------------------------------------------------------ */
/* Planning                                                             */
/* ------------------------------------------------------------------ */

/**
 * Section : { id, name, fromKm, toKm, mode: 'speed' | 'pace' | 'intensity', value, color? }
 *  - speed     : vitesse moyenne imposée en km/h
 *  - pace      : allure moyenne imposée en min/km
 *  - intensity : % de l'intensité de base (100 = normal, 90 = gestion, 105 = attaque)
 * Ravito : { id, km, name, stopMinutes, kind: 'aid' | 'water' | 'checkpoint' | 'crew', cutoff?: 'HH:MM' }
 */
export function computePlan(course, {
  sport = 'running',
  targetMinutes,
  startTime = '08:00',
  sections = [],
  aidStations = [],
  fatiguePercent = 0,
} = {}) {
  const { profile, stats } = course;
  const totalKm = stats.distanceKm;
  const stopMinutes = aidStations.reduce((sum, s) => sum + (Number(s.stopMinutes) || 0), 0);
  const movingTarget = Math.max(1, (Number(targetMinutes) || 60) - stopMinutes);

  const sectionAt = km => sections.find(s => km > s.fromKm && km <= s.toKm);
  const fatigueAt = km => 1 + (fatiguePercent / 100) * (km / totalKm);

  const segments = [];
  for (let i = 1; i < profile.length; i += 1) {
    const a = profile[i - 1];
    const b = profile[i];
    const mid = (a.km + b.km) / 2;
    segments.push({ fromKm: a.km, toKm: b.km, lengthKm: b.km - a.km, grade: b.grade, section: sectionAt(mid), fatigue: fatigueAt(mid) });
  }

  /** minutes nécessaires pour un segment à « niveau » donné. */
  const segmentMinutes = (seg, level) => {
    const s = seg.section;
    if (s && (s.mode === 'speed' || s.mode === 'pace')) return null; // traité à part
    const intensity = s?.mode === 'intensity' ? (Number(s.value) || 100) / 100 : 1;
    if (sport === 'cycling') {
      const power = level * intensity ** 3 / seg.fatigue; // level = watts
      return (seg.lengthKm * 1000) / cyclingSpeedForPower(power, seg.grade) / 60;
    }
    // level = allure plate (min/km)
    return seg.lengthKm * level * runningGradeFactor(seg.grade) * seg.fatigue / intensity;
  };

  // Sections figées : temps proportionnel à l'effort relatif dans la section.
  const fixedMinutes = new Map();
  for (const s of sections) {
    if (s.mode !== 'speed' && s.mode !== 'pace') continue;
    const segs = segments.filter(seg => seg.section === s);
    const lengthKm = segs.reduce((sum, seg) => sum + seg.lengthKm, 0);
    if (!lengthKm) continue;
    const value = Number(s.value) || 1;
    const total = s.mode === 'speed' ? (lengthKm / value) * 60 : lengthKm * value;
    const weight = seg => seg.lengthKm * (sport === 'cycling'
      ? 1 / (cyclingSpeedForPower(220, seg.grade))
      : runningGradeFactor(seg.grade));
    const weightSum = segs.reduce((sum, seg) => sum + weight(seg), 0) || 1;
    segs.forEach(seg => fixedMinutes.set(seg, (total * weight(seg)) / weightSum));
  }
  const frozen = [...fixedMinutes.values()].reduce((a, b) => a + b, 0);
  const free = segments.filter(seg => !fixedMinutes.has(seg));
  const freeTarget = Math.max(1, movingTarget - frozen);

  const freeTotal = level => free.reduce((sum, seg) => sum + segmentMinutes(seg, level), 0);
  let level;
  if (!free.length) {
    level = 0;
  } else if (sport === 'cycling') {
    let lo = 20;
    let hi = 1500;
    for (let i = 0; i < 50; i += 1) {
      const mid = (lo + hi) / 2;
      if (freeTotal(mid) > freeTarget) lo = mid; else hi = mid;
    }
    level = (lo + hi) / 2;
  } else {
    level = freeTarget / (freeTotal(1) || 1); // linéaire en allure
  }

  // Timeline cumulée
  const stationsSorted = [...aidStations].sort((a, b) => a.km - b.km);
  let elapsed = 0;
  let stationIdx = 0;
  const timeline = [{ km: 0, minutes: 0 }];
  segments.forEach(seg => {
    const minutes = fixedMinutes.get(seg) ?? segmentMinutes(seg, level);
    seg.minutes = minutes;
    elapsed += minutes;
    while (stationIdx < stationsSorted.length && stationsSorted[stationIdx].km <= seg.toKm) {
      elapsed += Number(stationsSorted[stationIdx].stopMinutes) || 0;
      stationIdx += 1;
    }
    timeline.push({ km: seg.toKm, minutes: elapsed });
  });

  /** temps écoulé (min, hors arrêt au point lui-même) au km donné. */
  const movingUntil = km => {
    let t = 0;
    for (const seg of segments) {
      if (seg.toKm <= km) t += seg.minutes;
      else { if (seg.fromKm < km) t += seg.minutes * ((km - seg.fromKm) / seg.lengthKm); break; }
    }
    return t;
  };
  const stopsBefore = km => stationsSorted.filter(s => s.km < km).reduce((sum, s) => sum + (Number(s.stopMinutes) || 0), 0);
  const elapsedAt = km => movingUntil(km) + stopsBefore(km);

  const start = parseClock(startTime);
  const clockAt = minutes => formatClock(start + minutes);

  const stations = stationsSorted.map((station, index) => {
    const arrival = elapsedAt(station.km);
    const prevKm = index ? stationsSorted[index - 1].km : 0;
    const elev = elevationBetween(course, prevKm, station.km);
    const cutoffMin = station.cutoff ? parseClock(station.cutoff) - start : null;
    return {
      ...station,
      arrivalMinutes: arrival,
      departureMinutes: arrival + (Number(station.stopMinutes) || 0),
      clock: clockAt(arrival),
      ele: Math.round(pointAtKm(course, station.km).ele),
      fromPrevKm: station.km - prevKm,
      fromPrevMinutes: arrival - (index ? elapsedAt(prevKm) + (Number(stationsSorted[index - 1].stopMinutes) || 0) : 0),
      gainFromPrevM: elev.gainM,
      lossFromPrevM: elev.lossM,
      cutoffMarginMinutes: cutoffMin === null ? null : cutoffMin - arrival,
    };
  });

  const sectionResults = sections.map(s => {
    const minutes = movingUntil(s.toKm) - movingUntil(s.fromKm);
    const lengthKm = s.toKm - s.fromKm;
    const elev = elevationBetween(course, s.fromKm, s.toKm);
    return {
      ...s,
      lengthKm,
      minutes,
      avgSpeedKmh: minutes > 0 ? lengthKm / (minutes / 60) : 0,
      avgPaceMinKm: lengthKm > 0 ? minutes / lengthKm : 0,
      avgGrade: lengthKm > 0 ? ((pointAtKm(course, s.toKm).ele - pointAtKm(course, s.fromKm).ele) / (lengthKm * 1000)) : 0,
      gainM: elev.gainM,
      lossM: elev.lossM,
      enterClock: clockAt(elapsedAt(s.fromKm)),
      exitClock: clockAt(elapsedAt(s.toKm)),
    };
  });

  const splitStep = sport === 'cycling' ? 10 : 1;
  const splits = [];
  for (let k = 0; k < totalKm - 1e-6; k += splitStep) {
    const to = Math.min(totalKm, k + splitStep);
    const minutes = movingUntil(to) - movingUntil(k);
    const elev = elevationBetween(course, k, to);
    splits.push({
      fromKm: k,
      toKm: to,
      minutes,
      paceMinKm: minutes / (to - k),
      speedKmh: (to - k) / (minutes / 60),
      gainM: elev.gainM,
      lossM: elev.lossM,
      elapsedMinutes: elapsedAt(to),
      clock: clockAt(elapsedAt(to)),
    });
  }

  const totalMinutes = timeline[timeline.length - 1].minutes;
  return {
    sport,
    totalMinutes,
    movingMinutes: totalMinutes - stopMinutes,
    stopMinutes,
    finishClock: clockAt(totalMinutes),
    baseLevel: level, // allure plate (min/km) ou puissance (W)
    timeline,
    stations,
    sections: sectionResults,
    splits,
    elapsedAt,
    clockAt,
  };
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                   */
/* ------------------------------------------------------------------ */

export function parseClock(value) {
  const [h, m] = String(value || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatClock(minutes) {
  const total = Math.round(minutes);
  const day = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${day > 0 ? ` (J+${day})` : ''}`;
}

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return '—';
  const totalSec = Math.round(minutes * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}'${String(s).padStart(2, '0')}"`;
}

export function formatPace(minPerKm) {
  if (!Number.isFinite(minPerKm) || minPerKm <= 0) return '—';
  const sec = Math.round(minPerKm * 60);
  return `${Math.floor(sec / 60)}'${String(sec % 60).padStart(2, '0')}"/km`;
}

export function gradeColor(grade) {
  const pct = grade * 100;
  if (pct >= 15) return '#7f1d1d';
  if (pct >= 10) return '#c2410c';
  if (pct >= 6) return '#d97757';
  if (pct >= 3) return '#e0b25a';
  if (pct > -3) return '#788c5d';
  if (pct > -8) return '#6a9bcc';
  return '#3b5f8a';
}

export function plannerStorageKey(raceName) {
  return `atifit:course-planner:v1:${(raceName || 'default').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/** Export CSV (séparateur « ; » pour Excel FR). */
export function planToCsv(plan) {
  const rows = [['Type', 'Nom', 'Km', 'Altitude', 'Passage', 'Écoulé', 'Arrêt (min)', 'D+ depuis précédent', 'D- depuis précédent']];
  plan.stations.forEach(s => rows.push([
    s.kind, s.name, s.km.toFixed(2), s.ele, s.clock, formatDuration(s.arrivalMinutes), s.stopMinutes || 0, s.gainFromPrevM, s.lossFromPrevM,
  ]));
  rows.push(['finish', 'Arrivée', '', '', plan.finishClock, formatDuration(plan.totalMinutes), '', '', '']);
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
}
