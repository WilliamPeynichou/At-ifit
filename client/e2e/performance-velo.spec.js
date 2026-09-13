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
    if (path === '/nutrition/effort/preview') {
      return json({
        data: {
          effort: {
            estimatedDurationMinutes: { low: 225, target: 240, high: 255 },
            estimatedEnergyKcal: { low: 2200, target: 2400, high: 2600 },
            heatStress: 'modéré',
            comparableActivitiesCount: 4,
          },
          during: {
            carbohydratesGPerHour: { low: 50, target: 60, high: 70 },
            carbohydratesTotalG: { low: 200, target: 240, high: 280 },
            fluidMlPerHour: { low: 400, target: 500, high: 600 },
            fluidTotalMl: { low: 1600, target: 2000, high: 2400 },
            sodiumMgPerHour: { low: 400, target: 500, high: 600 },
            sodiumTotalMg: { low: 1600, target: 2000, high: 2400 },
            feedingIntervalMinutes: 20,
            timeline: [],
          },
          before: { available: false, reason: 'Données insuffisantes.' },
          after: { available: false, reason: 'Données insuffisantes.' },
          confidence: { label: 'modérée' },
          warnings: [], assumptions: [], missingData: [],
          disclaimer: 'Conseils généraux.', algorithmVersion: '1', knowledgeVersion: '1',
        },
      });
    }

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
  await expect(cyclingHeading).toHaveCSS('color', 'rgb(20, 20, 19)');

  const chartCard = cyclingHeading.locator('..');
  await expect(chartCard).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  const explanatoryText = page.getByText(/Chaque point = une sortie/);
  await expect(explanatoryText).toHaveCSS('color', 'rgb(71, 85, 105)');

  const darkLegend = page.getByText('Vitesse moy. (km/h)').first();
  await expect(darkLegend).toBeVisible();
});

test('thème, sélection Tous et modale restent accessibles', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });
  await page.goto('/strava-stats');
  const allSports = page.getByRole('button', { name: /Tous · 3/ });
  await allSports.click();
  await expect(allSports).toHaveCSS('background-color', 'rgb(106, 155, 204)');
  await page.getByRole('button', { name: /Ouvrir TRAINING SCIENCE/i }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: /TRAINING SCIENCE/i });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: /Fermer TRAINING SCIENCE/i })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: /Activer le mode sombre/i }).first().click();
  await expect(page.locator('html')).toHaveClass(/theme-dark/);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(20, 20, 19)');
});

test('guide nutrition cite Nicolas Aubineau et ouvre la préparation de course', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });

  await page.goto('/nutrition');
  await expect(page.getByRole('heading', { name: /Manger pour soutenir l’effort/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Documentation de Nicolas Aubineau/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Voir son site/i })).toHaveAttribute('href', 'https://www.nicolas-aubineau.com/');
  await expect(page.getByRole('tab', { name: /Natation/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Trail long/i })).toBeVisible();
  await page.getByRole('tab', { name: /^Marathon$/i }).click();
  await expect(page.getByText(/fiole de 125 ml de boisson de récupération/i)).toBeVisible();
  await expect(page.getByText(/régime dissocié modifié/i).first()).toBeVisible();

  await expect(page.getByText(/Decathlon Energy Gel\+/)).toBeVisible();
  await expect(page.getByText(/Clif Bar Energy Bar myrtilles-amandes/)).toBeVisible();
  await expect(page.getByText(/Aptonia Iso\+ Pêche/)).toBeVisible();

  await page.getByRole('link', { name: /Préparer une course/i }).click();
  await expect(page.getByRole('heading', { name: /^Préparer une course$/i })).toBeVisible();
  await expect(page.getByLabel(/Objectif heures/i)).toBeVisible();
});

test('préparation de course couvre le triathlon', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });

  await page.goto('/preparer-course');
  await page.getByRole('button', { name: /^Triathlon$/ }).click();
  await expect(page.getByRole('button', { name: /Ironman/ })).toBeVisible();
  await page.getByRole('button', { name: /Half \/ 70.3/ }).click();
  await expect(page.getByLabel(/Natation \(km\)/)).toHaveValue('1.9');
  await expect(page.getByLabel(/Vélo \(km\)/)).toHaveValue('90');
  await expect(page.getByLabel(/Transitions T1 \+ T2/)).toHaveValue('10');
  await expect(page.locator('form input[name="distanceKm"]')).toHaveCount(0);
});

test('header reste utilisable en tablette et en mobile', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });

  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/preparer-course');
  const header = page.locator('header.glass-nav');
  await expect(header).toBeVisible();
  const headerBox = await header.boundingBox();
  expect(headerBox.width).toBeLessThanOrEqual(1100);
  await expect(page.getByRole('link', { name: /Cyclisme/i }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Plus de pages' }).click();
  await expect(page.getByRole('link', { name: /Préparer course/i })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(header).toBeHidden();
  await expect(page.getByRole('button', { name: /Ouvrir le menu/i })).toBeVisible();
  await page.getByRole('button', { name: /Ouvrir le menu/i }).click();
  await expect(page.getByRole('link', { name: /Préparer course/i })).toBeVisible();
});

test('la calculette de course conserve ses valeurs après rechargement', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });

  await page.goto('/preparer-course');
  const calculator = page.locator('aside').filter({ hasText: 'Calculette' });
  await calculator.getByLabel('Distance (km)').fill('15');
  await calculator.getByLabel('Heures').fill('1');
  await calculator.getByLabel('Minutes').fill('12');
  await expect(calculator.getByText('4:48 /km')).toBeVisible();

  await page.reload();
  const restored = page.locator('aside').filter({ hasText: 'Calculette' });
  await expect(restored.getByLabel('Distance (km)')).toHaveValue('15');
  await expect(restored.getByLabel('Heures')).toHaveValue('1');
  await expect(restored.getByLabel('Minutes')).toHaveValue('12');
  await expect(restored.getByText('4:48 /km')).toBeVisible();
});

test('la calculette mobile reste repliable et ne bloque pas le formulaire', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/preparer-course');

  const toggle = page.getByRole('button', { name: 'Calculette' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Construire mon plan' })).toBeVisible();
  await toggle.click();
  await expect(page.getByRole('heading', { name: 'Calculette' })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer la calculette' }).click();
  await expect(page.getByRole('heading', { name: 'Calculette' })).toBeHidden();
  await page.getByLabel('Nom course').fill('Course mobile');
  await expect(page.getByLabel('Nom course')).toHaveValue('Course mobile');
});

test('le plan de course affiche les modèles recommandés issus des PDF', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });
  await page.goto('/preparer-course');
  await page.getByLabel('Date').fill('2027-04-04');
  await page.getByRole('button', { name: 'Construire mon plan' }).click();

  await expect(page.getByRole('heading', { name: 'Modèles conseillés pour cette course' })).toBeVisible();
  await expect(page.getByText(/Aptonia Iso\+ Pêche/).first()).toBeVisible();
  await expect(page.getByText(/Decathlon Energy Gel\+/).first()).toBeVisible();
  await expect(page.getByText(/Isostar After Reload Drink/).first()).toBeVisible();
  await expect(page.getByText(/Nicolas Aubineau/).first()).toBeVisible();
});

test('la préparation transfère le contexte vers la stratégie nutritionnelle', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });

  await page.goto('/preparer-course');
  await page.getByLabel('Nom course').fill('Marathon test');
  await page.getByLabel('Date').fill('2027-04-04');
  await page.getByLabel('Lieu').fill('Paris, France');
  await page.getByRole('button', { name: 'Construire mon plan' }).click();
  const detailLink = page.getByRole('link', { name: /plan nutritionnel détaillé/i });
  await expect(detailLink).toBeVisible();
  await detailLink.click();

  await expect(page).toHaveURL(/\/nutrition\/strategie\?/);
  await expect(page.getByRole('heading', { name: /^Nutrition$/ })).toBeVisible();
  await expect(page.locator('input[name="distanceKm"]')).toHaveValue('42.195');
  await expect(page.getByLabel('Lieu')).toHaveValue('Paris, France');
  await expect(page.getByLabel('Objectif')).toHaveValue(/Marathon test/);
  await expect(page.getByLabel('Tolérance digestive')).toHaveValue('medium');
});

test('le header reste fixe et sans défilement horizontal', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });

  await page.setViewportSize({ width: 1100, height: 700 });
  await page.goto('/preparer-course');
  const header = page.locator('header.glass-nav');
  await expect(header).toHaveCSS('position', 'fixed');

  const nav = header.locator('nav');
  const overflows = await nav.evaluate(el => el.scrollWidth > el.clientWidth + 1);
  expect(overflows).toBe(false);

  await page.mouse.wheel(0, 600);
  await expect(header).toBeInViewport();

  await page.getByRole('button', { name: 'Plus de pages' }).click();
  await expect(page.getByRole('link', { name: /Préparer course/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Plus de pages' })).toHaveAttribute('aria-expanded', 'false');
});

test('le parcours course et stratégie reste relié', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });

  await page.goto('/preparer-course');
  await expect(page.getByRole('navigation', { name: 'Parcours course et nutrition' })).toBeVisible();
  await page.getByLabel('Nom course').fill('Trail des tests');
  await page.getByLabel('Date').fill('2027-05-02');
  await page.getByRole('button', { name: 'Construire mon plan' }).click();
  await expect(page.getByRole('heading', { name: 'Stratégie jour J' })).toBeVisible();

  await page.goto('/nutrition/strategie');
  await expect(page.getByText(/Une préparation de course est enregistrée/)).toBeVisible();
  await page.getByRole('button', { name: 'Reprendre ma course' }).click();
  await expect(page.getByLabel('Objectif')).toHaveValue(/Trail des tests/);
  await expect(page.locator('input[name="distanceKm"]')).toHaveValue('42.195');

  const steps = page.getByRole('navigation', { name: 'Parcours course et nutrition' });
  await expect(steps.getByRole('link', { name: /Stratégie nutritionnelle/ })).toHaveAttribute('aria-current', 'step');
  await steps.getByRole('link', { name: /Préparer ma course/ }).click();
  await expect(page).toHaveURL(/\/preparer-course$/);
});

test('les formulaires affichent les modèles par type d’athlète', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });

  await page.goto('/nutrition/strategie');
  await page.locator('input[name="distanceKm"]').fill('120');
  await page.getByLabel('Tolérance digestive').selectOption('low');
  await page.getByLabel('Sueur').selectOption('salty');
  await page.getByRole('button', { name: 'Calculer ma stratégie' }).click();

  const section = page.locator('section').filter({ hasText: 'Modèles par type d’athlète' });
  await expect(section.getByRole('heading', { name: 'Modèles par type d’athlète' })).toBeVisible();
  await expect(section.getByRole('heading', { name: 'Estomac sensible' })).toBeVisible();
  await expect(section.getByRole('heading', { name: 'Intestin entraîné' })).toBeVisible();
  await expect(section.getByText('Ton profil', { exact: true })).toHaveCount(3);

  await page.goto('/preparer-course');
  await page.getByLabel('Date').fill('2027-04-04');
  await page.getByRole('button', { name: 'Construire mon plan' }).click();
  await expect(page.getByRole('heading', { name: 'Modèles par type d’athlète' })).toBeVisible();
  await expect(page.getByText('Ton profil', { exact: true }).first()).toBeVisible();
});

test('la page sources explique documentation et références scientifiques', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });

  await page.goto('/nutrition');
  await page.getByRole('link', { name: /Sources et documentation/i }).click();

  await expect(page).toHaveURL(/\/sources$/);
  await expect(page.getByRole('heading', { name: /D’où viennent les informations/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Documentation de Nicolas Aubineau/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Site de Nicolas Aubineau/i })).toHaveAttribute('href', 'https://www.nicolas-aubineau.com/');
  await expect(page.getByText(/Jeukendrup A\./)).toBeVisible();
  await expect(page.getByText(/Comparatif des gels énergétiques/).first()).toBeVisible();
  await expect(page.getByText(/Aucune valeur affichée n’est générée par un modèle de langage/)).toBeVisible();
});

test('menus Nutrition gardent texte et fond contrastés', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });
  await page.goto('/nutrition/strategie');
  const sweat = page.getByLabel('Sueur');
  await expect(sweat).toHaveCSS('color', 'rgb(20, 20, 19)');
  await expect(sweat).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});
