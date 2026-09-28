import { expect, test } from '@playwright/test';

const user = {
  id: 1, email: 'e2e@example.test', pseudo: 'e2e', role: 'user', height: 180, age: 34, gender: 'male', stravaConnected: true,
};

async function mockApi(page, calls = []) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    calls.push(`${request.method()} ${path}`);
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/user' && request.method() === 'DELETE') {
      const body = request.postDataJSON();
      if (body.password !== 'bon-mot-de-passe') return json({ success: false, error: 'Invalid password' }, 403);
      return json({ deleted: true });
    }
    if (path === '/user/export') return json({ format: 'atifit-export-v1', profile: user, weights: [], goals: [], activities: [] });
    if (path === '/user' || path === '/auth/me') return json(user);
    if (path === '/strava/analytics/gps-heatmap') return json([{ id: 101, polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', type: 'Run', distance: 15000 }]);
    if (path === '/strava/activities') return json([
      { id: 101, type: 'Ride', name: 'Vélo test', startDate: '2026-05-02T08:00:00Z', distance: 54000, movingTime: 7200, averageHeartrate: 148, averageWatts: 215 },
      { id: 102, type: 'Ride', name: 'Endurance test', startDate: '2026-05-09T08:00:00Z', distance: 72000, movingTime: 9600, averageHeartrate: 142, averageWatts: 205 },
      { id: 103, type: 'Run', name: 'Course test', startDate: '2026-05-10T08:00:00Z', distance: 10000, movingTime: 2700, averageHeartrate: 151 },
    ]);
    if (path === '/goals') return json([]);
    return json({});
  });
}

async function login(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e2e-access-token');
    window.localStorage.setItem('refreshToken', 'e2e-refresh-token');
    window.localStorage.setItem('onboarding_completed', 'true');
  });
}

test('visite neuve : aucun appel tiers, polices locales, bandeau avec refus aussi simple qu’accepter', async ({ page }) => {
  const external = [];
  page.on('request', req => {
    const host = new URL(req.url()).hostname;
    if (!['127.0.0.1', 'localhost'].includes(host)) external.push(req.url());
  });
  await mockApi(page);
  await page.goto('/login');

  const banner = page.getByTestId('cookie-banner');
  await expect(banner).toBeVisible();
  const refuse = banner.getByRole('button', { name: 'Tout refuser' });
  const accept = banner.getByRole('button', { name: 'Tout accepter' });
  await expect(refuse).toBeVisible();
  await expect(accept).toBeVisible();
  const [rb, ab] = [await refuse.boundingBox(), await accept.boundingBox()];
  expect(Math.abs(rb.width - ab.width)).toBeLessThan(2);
  expect(Math.abs(rb.height - ab.height)).toBeLessThan(2);

  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
  expect(await page.evaluate(() => window.localStorage.getItem('atifit_consent'))).toBeNull();
});

test('refus puis retrait : choix mémorisé, modifiable depuis le footer', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  await page.getByTestId('cookie-banner').getByRole('button', { name: 'Tout refuser' }).click();
  await expect(page.getByTestId('cookie-banner')).toHaveCount(0);

  const stored = JSON.parse(await page.evaluate(() => window.localStorage.getItem('atifit_consent')));
  expect(stored.choices.maps).toBe(false);

  await page.reload();
  await expect(page.getByTestId('cookie-banner')).toHaveCount(0);

  await page.getByTestId('site-footer').getByRole('button', { name: 'Gérer les cookies' }).click();
  const dialog = page.getByRole('dialog', { name: 'Gérer mes préférences' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('switch').check();
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  const updated = JSON.parse(await page.evaluate(() => window.localStorage.getItem('atifit_consent')));
  expect(updated.choices.maps).toBe(true);
});

test('pages légales publiques accessibles sans compte depuis le footer (mobile)', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByTestId('cookie-banner').getByRole('button', { name: 'Tout refuser' }).click();

  const footer = page.getByTestId('site-footer');
  await footer.getByRole('link', { name: 'Mentions légales' }).click();
  await expect(page).toHaveURL(/\/mentions-legales$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeVisible();
  await expect(page.getByText('Entrepreneur individuel (micro-entrepreneur)', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Adresse professionnelle :/)).toBeVisible();
  await expect(page.getByText(/^Immatriculation \(SIREN \/ RCS selon situation\) :/)).toBeVisible();
  await expect(page.getByText('TVA non applicable, art. 293 B du CGI', { exact: false })).toBeVisible();
  await expect(page.getByText('Railway Corporation').first()).toBeVisible();
  await expect(page.getByText(/pas un dispositif médical/).first()).toBeVisible();

  await page.getByTestId('site-footer').getByRole('link', { name: 'Confidentialité' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeVisible();
  await expect(page.getByText(/données de santé/).first()).toBeVisible();

  await page.getByTestId('site-footer').getByRole('link', { name: 'Politique cookies' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Politique cookies' })).toBeVisible();
  await expect(page.getByTestId('consent-status')).toContainText('refusées');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('inscription exige âge et consentement explicite santé', async ({ page }) => {
  const calls = [];
  await mockApi(page, calls);
  await page.goto('/register');
  await page.getByTestId('cookie-banner').getByRole('button', { name: 'Tout refuser' }).click();
  await expect(page.getByRole('checkbox', { name: /15 ans ou plus/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /données de santé/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /données de santé/ })).toHaveAttribute('required', '');
});

test('profil : export JSON et suppression avec mot de passe', async ({ page }) => {
  const calls = [];
  await mockApi(page, calls);
  await login(page);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/profile');
  await page.getByTestId('cookie-banner').getByRole('button', { name: 'Tout refuser' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exporter mes données/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^atifit-export-\d{4}-\d{2}-\d{2}\.json$/);

  await page.getByRole('button', { name: 'Supprimer…' }).click();
  const submit = page.getByRole('button', { name: 'Supprimer définitivement' });
  await expect(submit).toBeDisabled();
  await page.getByLabel('Mot de passe').fill('mauvais');
  await page.getByLabel('Tape SUPPRIMER').fill('SUPPRIMER');
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText('Mot de passe incorrect.');
  await expect(page).toHaveURL(/\/profile$/);

  await page.getByLabel('Mot de passe').fill('bon-mot-de-passe');
  await submit.click();
  await expect(page).toHaveURL(/\/login$/);
  expect(calls).toContain('DELETE /user');
  expect(await page.evaluate(() => window.localStorage.getItem('accessToken'))).toBeNull();
});
