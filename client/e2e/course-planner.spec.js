import { expect, test } from '@playwright/test';

function buildGpx() {
  const pts = [];
  for (let i = 0; i <= 1200; i += 1) {
    const ele = 400 + 250 * Math.sin(i / 180) + i * 0.1;
    pts.push(`<trkpt lat="${(45 + i * 0.00012).toFixed(6)}" lon="${(6 + Math.sin(i / 300) * 0.01).toFixed(6)}"><ele>${ele.toFixed(1)}</ele></trkpt>`);
  }
  return `<?xml version="1.0"?><gpx version="1.1" creator="e2e"><wpt lat="45.06" lon="6.005"><name>Col test</name></wpt><trk><name>Trail E2E</name><trkseg>${pts.join('')}</trkseg></trk></gpx>`;
}

async function setup(page, errors) {
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'e2e-token');
    localStorage.setItem('refreshToken', 'e2e-refresh');
    localStorage.setItem('onboarding_completed', 'true');
  });
  await page.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 1, email: 'test@example.test', role: 'user', stravaConnected: true }) }));
  await page.route('**/{tile,basemaps}**', route => route.abort());
}

for (const sport of ['Course à pied', 'Triathlon']) {
  test(`planificateur GPX — ${sport}`, async ({ page }) => {
    const errors = [];
    await setup(page, errors);
    await page.goto('/preparer-course');
    await page.getByRole('button', { name: 'Tout refuser' }).click().catch(() => {});
    await page.getByRole('button', { name: sport, exact: true }).click();
    await page.getByRole('tab', { name: /Parcours/ }).click();
    await expect(page).toHaveURL(/onglet=parcours/);

    const inputs = page.locator('input[type=file]');
    await inputs.first().setInputFiles({ name: 'trail.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(buildGpx()) });
    await expect(page.getByText('Quoi prendre à chaque ravito').first()).toBeVisible();
    await expect(page.getByRole('group', { name: 'Profil altimétrique du parcours' }).first()).toBeVisible();

    const chart = page.locator('.recharts-surface').first();
    await chart.scrollIntoViewIfNeeded();
    const box = await chart.boundingBox();
    const countStations = () => page.locator('input').evaluateAll(els => els.filter(e => /^Ravito \d/.test(e.value)).length);
    const countSections = () => page.locator('input').evaluateAll(els => els.filter(e => /^Section \d/.test(e.value)).length);
    const before = await countStations();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.up();
    await expect.poll(countStations).toBeGreaterThan(before);

    const sectionsBefore = await countSections();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, { steps: 8 });
    await page.mouse.up();
    await expect.poll(countSections).toBeGreaterThan(sectionsBefore);

    await page.screenshot({ path: `test-results/planner-${sport === 'Triathlon' ? 'tri' : 'run'}.png`, fullPage: true });

    await page.getByRole('tab', { name: 'Nutrition' }).click();
    await expect(page.getByText('Nutrition pour mon effort')).toBeVisible();
    await page.getByRole('tab', { name: 'Prédictions' }).click();
    await page.getByRole('tab', { name: 'Objectif & plan' }).click();

    expect(errors.filter(e => !/Failed to load resource|net::ERR/.test(e))).toEqual([]);
  });
}
