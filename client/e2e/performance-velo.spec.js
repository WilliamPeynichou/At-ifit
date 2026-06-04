import { expect, test } from '@playwright/test';

const user = {
  id: 1,
  email: 'e2e@example.test',
  pseudo: 'e2e',
  role: 'user',
  height: 180,
  age: 34,
  gender: 'male',
  stravaConnected: true,
  stravaAthleteId: 123456,
  stravaAccessToken: 'present-for-ui-only',
};

const activities = [
  {
    id: 101,
    type: 'Ride',
    name: 'Sortie vélo vallonnée',
    startDate: '2026-05-02T08:00:00Z',
    start_date: '2026-05-02T08:00:00Z',
    distance: 54000,
    movingTime: 7200,
    moving_time: 7200,
    totalElevationGain: 780,
    total_elevation_gain: 780,
    averageSpeed: 7.5,
    average_speed: 7.5,
    averageHeartrate: 148,
    average_heartrate: 148,
    maxHeartrate: 176,
    averageWatts: 215,
    average_watts: 215,
    weightedAverageWatts: 232,
    kilojoules: 1540,
    calories: 1540,
  },
  {
    id: 102,
    type: 'Ride',
    name: 'Sortie vélo endurance',
    startDate: '2026-05-09T08:00:00Z',
    start_date: '2026-05-09T08:00:00Z',
    distance: 72000,
    movingTime: 9600,
    moving_time: 9600,
    totalElevationGain: 430,
    total_elevation_gain: 430,
    averageSpeed: 7.8,
    average_speed: 7.8,
    averageHeartrate: 142,
    average_heartrate: 142,
    maxHeartrate: 168,
    averageWatts: 205,
    average_watts: 205,
    weightedAverageWatts: 221,
    kilojoules: 1840,
    calories: 1840,
  },
  {
    id: 103,
    type: 'Run',
    name: 'Footing test',
    startDate: '2026-05-10T08:00:00Z',
    start_date: '2026-05-10T08:00:00Z',
    distance: 10000,
    movingTime: 2700,
    moving_time: 2700,
    totalElevationGain: 90,
    total_elevation_gain: 90,
    averageSpeed: 3.7,
    average_speed: 3.7,
    averageHeartrate: 151,
    average_heartrate: 151,
  },
];

const rides = [
  {
    id: 101,
    date: '2026-05-02T08:00:00Z',
    name: 'Sortie vélo vallonnée',
    distanceKm: 54,
    elevationMeters: 780,
    averageSpeedKmh: 27,
    averageHeartrate: 148,
    maxHeartrate: 176,
    minHeartrate: 96,
  },
  {
    id: 102,
    date: '2026-05-09T08:00:00Z',
    name: 'Sortie vélo endurance',
    distanceKm: 72,
    elevationMeters: 430,
    averageSpeedKmh: 28.1,
    averageHeartrate: 142,
    maxHeartrate: 168,
    minHeartrate: 92,
  },
];

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');

    const json = (body) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

    if (path === '/auth/me') return json(user);
    if (path === '/user') return json(user);
    if (path === '/strava/activities') return json(activities);
    if (path === '/strava/sync/status') return json({ connected: true, status: 'completed', totalActivities: activities.length });
    if (path === '/strava/athlete/stats') return json({ biggestRideDistance: 72000, recentRideTotals: { count: 2, distance: 126000 } });
    if (path === '/strava/athlete/zones') return json({ heart_rate: { zones: [] } });
    if (path === '/stats/training-load') return json([]);
    if (path === '/stats/gear-usage') return json([]);
    if (path === '/goals') return json([]);
    if (path === '/cycling/profile') {
      return json({
        ftp: 245,
        ftpSource: 'power_curve_20min',
        ftpConfidence: 'high',
        ftpRelative: 3.4,
        sprintPower: 720,
        sprintPowerRelative: 10,
        level: 'Good',
        vo2max: 52,
        maxHeartrate: 184,
        weight: 72,
      });
    }
    if (path === '/cycling/rides') return json(rides);

    return json({});
  });
}

test('performance vélo utilise des fonds blancs et des typos foncées', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });

  await page.goto('/strava-stats');

  await expect(page.getByRole('heading', { name: /DATA ANALYSE/i })).toBeVisible();
  await page.getByRole('button', { name: /PERFORMANCE/i }).click();
  await expect(page.getByRole('heading', { name: /^PERFORMANCE$/i, level: 2 })).toBeVisible();

  await page.getByRole('tab', { name: /Vélo/i }).click();
  await expect(page.getByText('Vitesse moyenne vs dénivelé')).toBeVisible();
  await expect(page.getByText('Évolution TSS / IF')).toBeVisible();

  const cyclingHeading = page.getByRole('heading', { name: /Vitesse moyenne vs dénivelé/i });
  await expect(cyclingHeading).toHaveCSS('color', 'rgb(15, 23, 42)');

  const chartCard = cyclingHeading.locator('..');
  await expect(chartCard).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  const explanatoryText = page.getByText(/Chaque point = une sortie/);
  await expect(explanatoryText).toHaveCSS('color', 'rgb(71, 85, 105)');

  const darkLegend = page.getByText('Vitesse moy. (km/h)').first();
  await expect(darkLegend).toBeVisible();
});
