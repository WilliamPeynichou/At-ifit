export function calculatePert(stages) {
  if (!Array.isArray(stages) || !stages.length) return { error: 'Ajoute au moins une étape.' };
  const results = [];
  for (const stage of stages) {
    const values = [stage.optimistic, stage.likely, stage.pessimistic];
    if (values.some(v => v === '' || v === null || v === undefined)) {
      return { error: 'Renseigne les trois durées de chaque étape.' };
    }
    const [o, m, p] = values.map(Number);
    if ([o, m, p].some(v => !Number.isFinite(v) || v < 0 || v > 10080)) {
      return { error: 'Durées attendues : de 0 à 10 080 minutes par étape.' };
    }
    if (o > m || m > p) return { error: 'Respecte cet ordre : optimiste ≤ probable ≤ pessimiste.' };
    results.push({ name: stage.name, optimistic: o, likely: m, pessimistic: p,
      expected: (o + 4 * m + p) / 6, approximateSigma: (p - o) / 6 });
  }
  return { stages: results, expected: results.reduce((sum, s) => sum + s.expected, 0),
    optimistic: results.reduce((sum, s) => sum + s.optimistic, 0),
    pessimistic: results.reduce((sum, s) => sum + s.pessimistic, 0) };
}

export function formatMinutes(value) {
  const seconds = Math.round(value * 60);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${hours ? `${hours} h ` : ''}${minutes} min${rest ? ` ${rest} s` : ''}`;
}
