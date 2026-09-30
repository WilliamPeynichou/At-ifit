import { expect, test } from '@playwright/test';
import { calculatePert } from '../src/utils/pert.js';

test('formule PERT et validation', () => {
  const result = calculatePert([{ name: 'Course', optimistic: 136, likely: 153, pessimistic: 173 }]);
  expect(result.expected).toBe(153.5);
  expect(result.stages[0].approximateSigma).toBeCloseTo(37 / 6);
  expect(calculatePert([{ optimistic: '', likely: 10, pessimistic: 20 }]).error).toBeTruthy();
  expect(calculatePert([{ optimistic: 20, likely: 10, pessimistic: 30 }]).error).toBeTruthy();
  expect(calculatePert([{ optimistic: -1, likely: 10, pessimistic: 30 }]).error).toBeTruthy();
  expect(calculatePert([{ optimistic: 0, likely: 0, pessimistic: 0 }]).expected).toBe(0);
});

test('PERT mobile : total, triathlon, brouillons et absence de débordement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'e2e-token');
    localStorage.setItem('refreshToken', 'e2e-refresh');
    localStorage.setItem('onboarding_completed', 'true');
  });
  await page.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 1, email: 'test@example.test', role: 'user', stravaConnected: true }) }));
  await page.goto('/profile/predictions');
  const planner = page.getByRole('region', { name: 'Planifier mes scénarios · PERT' });
  for (const [stage, values] of [['Course', [136, 153, 173]], ['Arrêts / ravitaillements', [0, 0, 0]]]) {
    for (const [i, label] of ['Optimiste', 'Probable', 'Pessimiste'].entries()) {
      await planner.getByRole('spinbutton', { name: `${stage} — ${label} (min)`, exact: true }).fill(String(values[i]));
    }
  }
  await expect(planner.getByText('2 h 33 min 30 s', { exact: true }).first()).toBeVisible();
  await planner.getByLabel('Objectif total en minutes (optionnel)').fill('160');
  await expect(planner.getByText(/Marge prévue : 6 min 30 s/)).toBeVisible();
  await planner.getByRole('radio', { name: 'Triathlon', exact: true }).check();
  await expect(planner.getByRole('spinbutton', { name: 'Transition T1 — Optimiste (min)' })).toBeVisible();
  await planner.getByRole('radio', { name: 'Course simple' }).check();
  await expect(planner.getByRole('spinbutton', { name: 'Course — Probable (min)', exact: true })).toHaveValue('153');
  await planner.getByRole('spinbutton', { name: 'Course — Optimiste (min)', exact: true }).fill('200');
  await expect(planner.getByText(/Respecte cet ordre/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
