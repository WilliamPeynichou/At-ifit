import { test, expect } from '@playwright/test';
test('personal ML result displays warning and private summary', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'test'); localStorage.setItem('refreshToken', 'test');
    localStorage.setItem('onboarding_completed', 'true');
  });
  await page.route('**/api/**', route => {
    const url = route.request().url();
    let data = { id: 1, email: 'test@example.test', role: 'user', stravaConnected: true };
    if (url.endsWith('/predictions/model')) data = { status: 'experimental', realCount: 49, syntheticCount: 1841,
      trainedAt: '2026-09-30', metrics: { MAPE_duree_pct: 8.53 }, baselineMetrics: { MAPE_duree_pct: 8.06 },
      intervalCoverage: .75, intervalCount: 16, significantImprovement: false };
    if (url.endsWith('/predictions/estimate')) data = { target_minutes: 150, model_version: 'test-model',
      outside_training_domain: true, interval: { low_minutes: 130, high_minutes: 180 } };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/profile/predictions');
  const panel = page.getByRole('region', { name: 'Mon modèle ML · Vélo' });
  await expect(panel.getByText('8.53 %', { exact: true })).toBeVisible();
  await panel.getByLabel('Distance (km)', { exact: true }).fill('60');
  await panel.getByLabel('Dénivelé positif (m)').fill('600');
  await panel.getByLabel('Date de sortie').fill('2030-01-01');
  await panel.getByRole('button', { name: 'Calculer ma prédiction ML' }).click();
  await expect(panel.getByText('2 h 30 min', { exact: true })).toBeVisible();
  await expect(panel.getByText(/Hors domaine d’entraînement/)).toBeVisible();
  await panel.getByLabel('Distance (km)', { exact: true }).fill('70');
  await expect(panel.getByText('2 h 30 min', { exact: true })).toHaveCount(0);
});
