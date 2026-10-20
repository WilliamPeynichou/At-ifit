import { expect, test } from '@playwright/test';

const ride = (id, date, overrides = {}) => ({ id, type: 'Ride', name: `Sortie ${id}`, startDate: date, distanceKm: 42, movingTimeMinutes: 90, elevationGain: 300, averageSpeedKmh: 28, averageHeartRate: 145, averageWatts: 210, ...overrides });
const user = { id: 1, email: 'cycling@example.test', role: 'user', stravaConnected: true };
const rides = Array.from({ length: 32 }, (_, i) => ride(i + 1, `2026-05-${String((i % 28) + 1).padStart(2, '0')}T08:00:00Z`, { distanceKm: i < 16 ? 42 : 68, averageSpeedKmh: 29, elevationGain: 560 }));

async function setup(page, { delayed = false, empty = false, failure = false, onStats } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'cycling-e2e');
    localStorage.setItem('refreshToken', 'cycling-refresh');
    localStorage.setItem('onboarding_completed', 'true');
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/me' || path === '/user') return json(user);
    if (path === '/strava/cycling/stats') {
      const params = new URL(route.request().url()).searchParams;
      const period = params.get('period');
      if (onStats) await onStats(params);
      if (failure) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Cycling unavailable' }) });
      if (period === 'CUSTOM' && delayed && params.get('from') === '2026-05-01') await new Promise(resolve => setTimeout(resolve, 700));
      else if (delayed) await new Promise(resolve => setTimeout(resolve, 300));
      const chosen = empty ? [] : period === '7D' ? rides.slice(0, 2) : period === '30D' || (period === 'CUSTOM' && params.get('from') === '2026-05-01') ? rides.slice(0, 4) : rides;
      const longRides = Array.from({ length: 3 }, (_, i) => ({ weekStart: `2026-05-0${i + 1}`, label: `S${i + 1}`, longRideDistanceKm: 68 + i, shareOfWeeklyVolume: 0.3, activity: chosen[0] }));
      return json({
        stats: { activityCount: chosen.length, totalDistanceKm: chosen.reduce((sum, item) => sum + item.distanceKm, 0), totalMovingTimeMinutes: chosen.length * 90, averageSpeedKmh: 28, totalElevationGain: chosen.length * 300, rideTypeCounts: { road: chosen.length }, powerStats: {} },
        activities: chosen, weeklyStats: [], comparison: {}, trainingLoadRatios: [], longRides, regularity: {}, personalBests: {}, correlations: { scatter: {} }, insights: [],
        allCyclingActivityCount: rides.length, status: { totalCyclingActivities: rides.length },
      });
    }
    return json({});
  });
}

test('état vide et dates personnalisées invalides sont explicités', async ({ page }) => {
  await setup(page, { empty: true });
  await page.goto('/cyclisme');
  await expect(page.getByRole('heading', { name: /Analyse Cyclisme/i })).toBeVisible();
  await expect(page.getByText('Aucune activité de cyclisme trouvée sur la période sélectionnée.')).toBeVisible();
  await page.getByRole('combobox').first().selectOption('CUSTOM');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Début').fill('2026-05-20');
  await page.getByLabel('Fin').fill('2026-05-02');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('graphique sorties longues expose les unités de ses deux axes', async ({ page }) => {
  await setup(page);
  await page.goto('/cyclisme');
  const chart = page.getByRole('heading', { name: 'Endurance et sorties longues' }).locator('..').locator('..');
  await expect(chart.getByText('Distance (km)')).toBeVisible();
  await expect(chart.getByText('Part du volume (%)')).toBeVisible();
  const point = chart.locator('.recharts-line-dots circle').first();
  await point.scrollIntoViewIfNeeded();
  const box = await point.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const tooltip = chart.locator('.recharts-tooltip-wrapper');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('30 %');
  await expect(tooltip).toContainText(/68.*km/);
});

test('tableau filtre, pagine et permet le tri avec le clavier', async ({ page }) => {
  await setup(page);
  await page.goto('/cyclisme');
  await expect(page.getByRole('heading', { name: /Analyse Cyclisme/i })).toBeVisible();
  const table = page.getByRole('table').first();
  await expect(table).toBeVisible();
  const dateHeader = page.getByRole('columnheader', { name: /Date/i }).first();
  const headerButton = dateHeader.getByRole('button');
  await headerButton.focus();
  await page.keyboard.press('Enter');
  await expect(dateHeader).toHaveAttribute('aria-sort', /ascending|descending/);
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.getByText('Page 2/3')).toBeVisible();
  await page.getByLabel('Distance minimale (km)').fill('60');
  await expect(page.getByText('Page 1/2')).toBeVisible();
  await expect(page.getByRole('row', { name: /Sortie 1\b/ })).toHaveCount(0);
});

test('masque les anciennes données et ignore une réponse retardée', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let started;
  const requested = new Promise(resolve => { started = resolve; });
  await setup(page, { onStats: async params => {
    if (params.get('period') === '30D') { started(); await gate; }
  } });
  await page.goto('/cyclisme');
  await expect(page.getByRole('table')).toBeVisible();
  const period = page.getByLabel('Période', { exact: true });
  try {
    await period.selectOption('30D');
    await requested;
    await expect(page.getByRole('status')).toContainText('Actualisation');
    await expect(page.getByRole('table')).toHaveCount(0);
    await period.selectOption('7D');
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(2);
    const oldResponse = page.waitForResponse(response => response.url().includes('/strava/cycling/stats') && new URL(response.url()).searchParams.get('period') === '30D');
    release();
    await oldResponse;
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(2);
    await expect(period).toHaveValue('7D');
  } finally { release(); }
});
