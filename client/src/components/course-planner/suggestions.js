export const SECTION_COLORS = ['#6a9bcc', '#d97757', '#788c5d', '#a855f7', '#e0b25a'];

export const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function suggestStations(course, sport) {
  const total = course.stats.distanceKm;
  const fromWaypoints = course.waypoints
    .filter(w => w.km > 0.5 && w.km < total - 0.5)
    .map(w => ({ id: newId(), km: Number(w.km.toFixed(2)), name: w.name, stopMinutes: 2, kind: 'aid' }));
  if (fromWaypoints.length) return fromWaypoints;
  const spacing = sport === 'cycling' ? 40 : course.stats.gainM / Math.max(1, total) > 25 ? 12 : 5;
  const stations = [];
  for (let km = spacing, i = 1; km < total - spacing / 3; km += spacing, i += 1) {
    stations.push({ id: newId(), km, name: `Ravito ${i}`, stopMinutes: sport === 'cycling' ? 3 : 1, kind: i % 2 ? 'water' : 'aid' });
  }
  return stations;
}

/** Détecte les montées significatives et les propose comme sections. */
export function suggestClimbs(course, sport) {
  const { profile } = course;
  const minGain = sport === 'cycling' ? 80 : 60;
  const climbs = [];
  let start = null;
  let peak = null;
  const close = () => {
    if (start && peak && peak.ele - start.ele >= minGain) climbs.push({ fromKm: start.km, toKm: peak.km, gain: peak.ele - start.ele });
    start = null;
    peak = null;
  };
  for (let i = 1; i < profile.length; i += 1) {
    const p = profile[i];
    if (!start) {
      if (p.grade > 0.03) { start = profile[i - 1]; peak = p; }
      continue;
    }
    if (p.ele >= peak.ele) peak = p;
    else if (peak.ele - p.ele > 25) close();
  }
  close();
  return climbs.sort((a, b) => b.gain - a.gain).slice(0, 5).sort((a, b) => a.fromKm - b.fromKm).map((c, i) => ({
    id: newId(),
    name: `Montée ${i + 1} (+${Math.round(c.gain)} m)`,
    fromKm: Number(c.fromKm.toFixed(2)),
    toKm: Number(c.toKm.toFixed(2)),
    mode: 'intensity',
    value: 95,
    color: SECTION_COLORS[i % SECTION_COLORS.length],
  }));
}
