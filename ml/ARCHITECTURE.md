# Architecture ML — single-athlete prototype

Status: local training and local inference implemented. Web integration proposed, not implemented.
No production promotion. No multi-user training. Existing nutritional rules remain unchanged.

## Implemented

`Authorized account export -> private CSV/streams -> Python features -> walk-forward evaluation -> final fit -> versioned local artifact -> predict.py`

Each model lives in `ml/models/<UTC-version>/` with:
- `model.joblib`: fitted estimator, training medians, feature order, historical calibration residuals;
- `manifest.json`: schema/version, input hash, sample counts, observed distance/elevation domain,
  validation metrics and experimental status.

Model files, exports and per-ride reports are ignored by Git. Joblib is trusted local input only:
never load uploads or untrusted files. CLI predictions use a future date, previous activities only,
return a duration interval and an extrapolation flag. No safety or statistical coverage guarantee.

## Recommended web architecture

### React: `/profile/predictions`

Two explicit areas:
1. Personal estimate: distance, elevation and date; result interval, model version and experimental badge.
2. Model health: training status, real/synthetic counts, last training date, error, measured interval
   coverage, comparison with statistical baseline, sensor coverage and limitations.

UI states: no model, queued, training, experimental-ready, failed, outdated. No synthetic data presented
as genuine history. Existing preparation page remains usable when ML is unavailable.

### Express: authentication and ownership boundary

Proposed endpoints (not yet exposed):
- `GET /api/user/predictions/model`: current user's model summary only.
- `POST /api/user/predictions/train`: authorized owner, rate limited; returns 202 and job ID.
- `GET /api/user/predictions/jobs/:id`: job ownership checked server-side.
- `POST /api/user/predictions/estimate`: validated course input; caller's user ID from JWT only.

Never accept user ID or model filesystem path from client. No e-mail whitelist hardcoded into UI.
Every report/model/job has an owner; other accounts see no model, not William's results.

### Python worker: asynchronous CPU work

Separate Railway service for training and inference; private network, authenticated internal calls.
Worker uses a narrowly scoped dataset for the authorized job, not unrestricted cross-user queries.
Use MySQL-backed jobs initially rather than introduce Redis for one user. Claim jobs transactionally;
leases, timeout, retry cap and one active training job per owner. Snapshot training input before fitting.
Keep feature building identical for training and inference (Python). Avoid duplicated Node formulas.

### Persistence

Proposed tables: `MlJobs`, `MlModels`, `MlPredictions`, each with userId foreign key.
Versioned private artifacts in protected object storage (or Railway persistent volume for prototype),
not container ephemeral disk, public static assets, Git, or large blobs in MySQL.
Current local artifacts lack web ownership binding: import requires explicit authenticated owner mapping.
Never auto-discover artifacts by e-mail or show a global latest model to all users.

### Lifecycle and privacy

Start with explicit manual training by the owner. Consent for this feature and any later cross-user
training must be addressed separately. Account export/deletion must include jobs, reports, predictions,
artifacts and storage objects, plus cancel active jobs. No raw health values in logs.

Remain experimental until evaluation shows useful, stable improvement on real data and adequate
coverage across forecast distances. Temporal drift and repeated experimentation limit p-value claims.
No automatic promotion based on one p-value. Statistical fallback remains separate and labelled.

## Next implementation slice

Build authenticated ownership storage and read-only model summary endpoint first, then wire
`Mes prédictions` to actual personal results. Add training queue and prediction API afterward.
Do not deploy private artifacts until ownership and deletion paths are tested.
