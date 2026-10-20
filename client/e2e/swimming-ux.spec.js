import { expect, test } from '@playwright/test';

const user = { id: 1, email: 'swimming@example.test', role: 'user', stravaConnected: true };
const swim = (id, overrides = {}) => ({
  id: String(id), name: `Séance ${id}`, startDate: `2026-05-${String((id % 28) + 1).padStart(2, '0')}T08:00:00Z`,
  swimType: id % 2 ? 'pool' : 'open_water', distanceMeters: id * 100, movingTimeMinutes: 30,
  averagePaceMinPer100m: 2, averageSpeedKmh: 3, averageHeartRate: id % 3 ? 140 : null,
  maxHeartRate: id % 3 ? 160 : null, calories: 300, trainingLoad: 25, swolf: null, strokeRate: null,
  deviceName: null, ...overrides,
});
const activities = Array.from({ length: 32 }, (_, i) => swim(i + 1));

function payload(chosen = activities) {
  return {
    stats: { activityCount: chosen.length, totalDistanceMeters: chosen.reduce((sum, a) => sum + a.distanceMeters, 0), totalMovingTimeMinutes: chosen.length * 30, averagePaceMinPer100m: 2, averageSpeedKmh: 3, averageHeartRate: 140, totalCalories: 300, longestSwim: chosen[0], poolSessionCount: chosen.filter(a => a.swimType === 'pool').length, openWaterSessionCount: chosen.filter(a => a.swimType === 'open_water').length },
    activities: chosen, weeklyStats: [], comparison: { available: false }, trainingLoadRatios: [], longSwims: [], regularity: {}, personalBests: {}, correlations: { scatter: {} }, insights: [], allSwimmingActivityCount: chosen.length, status: { stravaConnected: true, dataSynced: true, totalSwimmingActivities: chosen.length },
  };
}

async function setup(page, { onStats, empty = false } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'swim-e2e');
    localStorage.setItem('refreshToken', 'swim-refresh');
    localStorage.setItem('onboarding_completed', 'true');
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/me' || path === '/user') return json(user);
    if (path === '/strava/swimming/stats') {
      const params = new URL(route.request().url()).searchParams;
      if (onStats) await onStats(params);
      return json(payload(empty ? [] : params.get('period') === '7D' ? activities.slice(0, 2) : activities));
    }
    return json({});
  });
}

test('filtres natation, piscine/eau libre, capteurs manquants et pagination', async ({ page }) => {
  await setup(page);
  await page.goto('/swimming-dashboard');
  await expect(page.getByRole('heading', { name: 'Analyse Natation' }).first()).toBeVisible();
  const table = page.getByRole('table');
  await expect(table.locator('tbody tr')).toHaveCount(15);
  await expect(table.getByText('Non renseigné')).toHaveCount(0);
  await expect(table.locator('tbody tr').filter({ hasText: '140 bpm' })).toHaveCount(10);
  const mode = page.locator('select').filter({ has: page.locator('option[value="pool"]') });
  await mode.selectOption('pool');
  await expect(page.getByText(/séance\(s\) affichée\(s\)/)).toBeVisible();
  await expect(table.locator('tbody tr')).toHaveCount(15);
  await expect(table.locator('tbody tr').first()).toContainText('Piscine');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.getByText('Page 2/2')).toBeVisible();
  await page.getByRole('columnheader', { name: /Date/i }).getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('columnheader', { name: /Date/i })).toHaveAttribute('aria-sort', /ascending|descending/);
});

test('période vide et dates personnalisées invalides sans requête incohérente', async ({ page }) => {
  const requested = [];
  await setup(page, { empty: true, onStats: params => requested.push(Object.fromEntries(params.entries())) });
  await page.goto('/swimming-dashboard');
  await expect(page.getByText('Aucune activité de natation trouvée.', { exact: true })).toBeVisible();
  const before = requested.length;
  const selects = page.locator('select');
  await selects.first().selectOption('CUSTOM');
  await page.getByLabel('Début').fill('2026-05-20');
  await page.getByLabel('Fin').fill('2026-05-02');
  await expect(page.getByRole('alert')).toBeVisible();
  expect(requested.slice(before).some(q => q.from && q.to && q.from > q.to)).toBe(false);
});

test('actualisation masque les données puis ignore une réponse antérieure retardée', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let started;
  const requested = new Promise(resolve => { started = resolve; });
  await setup(page, { onStats: async params => {
    if (params.get('period') === '30D') { started(); await gate; }
  } });
  await page.goto('/swimming-dashboard');
  await expect(page.getByRole('table')).toBeVisible();
  const period = page.locator('select').filter({ has: page.locator('option[value="30D"]') });
  try {
    await period.selectOption('30D');
    await requested;
    await expect(page.getByText('Chargement de l’analyse natation...')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
    await period.selectOption('7D');
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(2);
    const oldResponse = page.waitForResponse(response => response.url().includes('/strava/swimming/stats') && new URL(response.url()).searchParams.get('period') === '30D');
    release();
    await oldResponse;
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(2);
    await expect(period).toHaveValue('7D');
  } finally { release(); }
});
