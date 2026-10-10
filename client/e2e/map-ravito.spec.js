import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const EFFORT_PREVIEW = readFileSync(new URL('./fixtures/effort-preview.json', import.meta.url), 'utf8');

function buildGpx() {
  const pts = [];
  for (let i = 0; i <= 1200; i += 1) {
    const ele = 400 + 250 * Math.sin(i / 180) + i * 0.1;
    pts.push(`<trkpt lat="${(45 + i * 0.00012).toFixed(6)}" lon="${(6 + Math.sin(i / 300) * 0.01).toFixed(6)}"><ele>${ele.toFixed(1)}</ele></trkpt>`);
  }
  return `<?xml version="1.0"?><gpx version="1.1"><trk><name>Map E2E</name><trkseg>${pts.join('')}</trkseg></trk></gpx>`;
}

test('poser un ravito depuis la carte', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'e2e-token');
    localStorage.setItem('refreshToken', 'e2e-refresh');
    localStorage.setItem('onboarding_completed', 'true');
  });
  await page.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 1, email: 't@e.test', role: 'user', stravaConnected: true }) }));
  await page.route('**/api/races**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
  await page.route('**/api/nutrition/effort/preview', route => route.fulfill({ contentType: 'application/json', body: EFFORT_PREVIEW }));

  await page.goto('/preparer-course');
  await page.getByRole('button', { name: 'Tout refuser' }).click().catch(() => {});
  await page.locator('input[type=file]').first().setInputFiles({ name: 'm.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(buildGpx()) });
  await page.locator('button.btn-primary').filter({ hasText: /Parcours/ }).click();
  await page.getByRole('button', { name: 'Autoriser les cartes' }).first().click().catch(() => {});

  const count = () => page.locator('input').evaluateAll(els => els.filter(e => /^Ravito \d/.test(e.value)).length);
  const before = await count();
  await page.getByRole('button', { name: /Ajouter un ravito sur la carte/ }).click();
  const map = page.locator('.leaflet-container').first();
  await map.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  // Clic sur le tracé : récupère la position écran d'un point de la polyline
  const pt = await page.locator('.leaflet-overlay-pane path').first().evaluate(el => {
    const p = el.getPointAtLength(el.getTotalLength() * 0.4);
    const m = el.getScreenCTM();
    return { x: p.x * m.a + m.e, y: p.y * m.d + m.f };
  });
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.click(pt.x, pt.y);
  await page.screenshot({ path: 'test-results/map-ravito.png', fullPage: false });
  await expect.poll(count).toBeGreaterThan(before);
  expect(errors).toEqual([]);
});
