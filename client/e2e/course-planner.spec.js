import { expect, test } from '@playwright/test';

function buildGpx() {
  const pts = [];
  for (let i = 0; i <= 1200; i += 1) {
    const ele = 400 + 250 * Math.sin(i / 180) + i * 0.1;
    pts.push(`<trkpt lat="${(45 + i * 0.00012).toFixed(6)}" lon="${(6 + Math.sin(i / 300) * 0.01).toFixed(6)}"><ele>${ele.toFixed(1)}</ele></trkpt>`);
  }
  return `<?xml version="1.0"?><gpx version="1.1" creator="e2e"><wpt lat="45.06" lon="6.005"><name>Col test</name></wpt><trk><name>Trail E2E</name><trkseg>${pts.join('')}</trkseg></trk></gpx>`;
}

async function setup(page, errors, saved = []) {
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'e2e-token');
    localStorage.setItem('refreshToken', 'e2e-refresh');
    localStorage.setItem('onboarding_completed', 'true');
  });
  await page.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 1, email: 'test@example.test', role: 'user', stravaConnected: true }) }));
  await page.route('**/api/user/nutrition-profile', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { gutTolerance: 'medium', sweatSodiumProfile: 'normal' } }) }));
  await page.route('**/api/user/training-summary', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: null }) }));
  await page.route('**/api/races**', route => {
    const method = route.request().method();
    if (method === 'GET' && /\/races$/.test(new URL(route.request().url()).pathname)) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: saved }) });
    }
    if (method === 'POST' || method === 'PUT') {
      const race = { id: 7, ...route.request().postDataJSON() };
      saved.splice(0, saved.length, race);
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: race }) });
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: saved[0] || null }) });
  });
  await page.route('**/{tile,basemaps}**', route => route.abort());
}

async function dragOnProfile(page) {
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
}

const gpxFile = () => ({ name: 'trail.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(buildGpx()) });
const stepButton = (page, label) => page.getByRole('navigation', { name: 'Étapes de la préparation' }).getByRole('button', { name: label });

test('assistant course à pied : GPX d’abord, ravitos, sauvegarde et prompt IA', async ({ page, context }) => {
  const errors = [];
  const saved = [];
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await setup(page, errors, saved);
  await page.goto('/preparer-course');
  await page.getByRole('button', { name: 'Tout refuser' }).click().catch(() => {});

  await page.locator('input[type=file]').first().setInputFiles(gpxFile());
  await expect(page).toHaveURL(/etape=2/);
  await expect(page.locator('input[name=distanceKm]')).not.toHaveValue('42.195');
  await page.locator('input[name=raceName]').fill('Trail E2E');

  await stepButton(page, /Parcours/).click();
  await dragOnProfile(page);
  await page.screenshot({ path: 'test-results/wizard-run.png', fullPage: true });

  await stepButton(page, /Nutrition/).click();
  await expect(page.getByText('Quoi prendre à chaque ravito').first()).toBeVisible();

  await stepButton(page, /entraînement/).click();
  await expect(page.getByRole('heading', { name: 'Plan d’entraînement' })).toBeVisible();

  await stepButton(page, /Sauvegarde/).click();
  await page.getByRole('button', { name: 'Sauvegarder la course' }).click();
  await expect(page).toHaveURL(/course=7/);
  await expect(page.getByRole('button', { name: 'Reprendre Trail E2E' })).toBeVisible();
  expect(saved[0].planner.stations.length).toBeGreaterThan(0);

  const prompt = page.getByLabel('Prompt IA');
  await expect(prompt).toHaveValue(/Trail E2E/);
  await expect(prompt).toHaveValue(/semaine par semaine/);
  await page.getByRole('button', { name: 'Copier le prompt' }).click();
  await expect(page.getByRole('button', { name: 'Copié' })).toBeVisible();

  expect(errors.filter(e => !/Failed to load resource|net::ERR/.test(e))).toEqual([]);
});

test('assistant triathlon : tracés vélo et course à l’étape 3', async ({ page }) => {
  const errors = [];
  await setup(page, errors);
  await page.goto('/preparer-course');
  await page.getByRole('button', { name: 'Tout refuser' }).click().catch(() => {});
  await page.getByRole('button', { name: 'Triathlon', exact: true }).click();
  await page.getByRole('button', { name: /saisie manuelle/ }).click();
  await expect(page).toHaveURL(/etape=2/);
  await stepButton(page, /Parcours/).click();
  await page.locator('input[type=file]').first().setInputFiles(gpxFile());
  await dragOnProfile(page);
  await page.screenshot({ path: 'test-results/wizard-tri.png', fullPage: true });
  await stepButton(page, /Nutrition/).click();
  await expect(page.getByText('Quoi prendre à chaque ravito').first()).toBeVisible();
  expect(errors.filter(e => !/Failed to load resource|net::ERR/.test(e))).toEqual([]);
});
