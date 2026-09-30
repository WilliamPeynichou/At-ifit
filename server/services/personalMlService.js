const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const User = require('../models/User');
const run = promisify(execFile);
const ROOT = path.resolve(__dirname, '../../ml');

// Single-user local prototype only. Disabled unless explicitly configured server-side.
async function personalModel(userId) {
  if (process.env.NODE_ENV === 'production' || process.env.ML_LOCAL_ENABLED !== 'true' || !process.env.ML_OWNER_EMAIL) return null;
  const user = await User.findByPk(userId, { attributes: ['email'] });
  if (!user || user.email !== process.env.ML_OWNER_EMAIL) return null;
  let report;
  try { report = JSON.parse(await fs.readFile(path.join(ROOT, 'reports/cycling_report.json'), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  const version = report.artifact_version;
  if (!/^\d{8}T\d{12}Z$/.test(version || '')) throw new Error('Invalid local model version');
  const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'models', version, 'manifest.json'), 'utf8'));
  // Binding is explicit: operator must set owner and trust locally generated artifacts only.
  return { version, manifest, report };
}

function summary(model) {
  if (!model) return { status: 'unavailable' };
  const { manifest: m, report: r } = model;
  return { status: 'experimental', version: model.version, trainedAt: m.created_at,
    realCount: m.real_count, syntheticCount: m.synthetic_count,
    metrics: m.metrics, baselineMetrics: r.metrics.heuristic,
    intervalCoverage: r.intervals.observed_coverage, intervalCount: r.intervals.evaluated_count,
    sensors: r.stream_coverage, significantImprovement: r.significance.significant_improvement };
}

async function estimate(model, input) {
  const { stdout } = await run(process.env.ML_PYTHON || path.join(ROOT, '.venv/bin/python'),
    [path.join(ROOT, 'predict.py'), '--distance-km', String(input.distanceKm),
      '--elevation-m', String(input.elevationM), '--date', input.date, '--version', model.version],
    { timeout: 20000, maxBuffer: 256 * 1024, cwd: ROOT });
  return JSON.parse(stdout);
}
module.exports = { personalModel, summary, estimate };
