# Single-user cycling ML prototype

## Run

```sh
cd ml
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m unittest test_prototype -v
.venv/bin/python train_cycling.py
```

Export only the authorized user's activities and streams with
`MYSQL_URL=... node ml/export_activities.js <account-email>` from the repository root.
Never commit credentials, exports, per-activity predictions, or trained personal models.

## Scope and evaluation

This predicts **moving time of ordinary outdoor rides**, not race performance or elapsed finish time.
One athlete, very small real evaluation sample. No production integration.

- Synthetic routes: climbing and descending segments, speed limits, wind, temperature,
  slowing/turns and separately elapsed stops. Joint distance/elevation bootstrap and speed
  calibration use only the initial 25 real training rides. Approximate simulator, not ground truth.
- Sensor features: normalized power using 30-second rolling power on a one-second grid;
  HR/effort decoupling between halves after warm-up. Reject major gaps. Prefer power/HR;
  speed/HR is a terrain-confounded proxy, recorded in stream coverage. These are descriptive,
  not medical metrics. **Only summaries of previous rides enter the predictor.**
- Target ride observed temperature is excluded: historical archive is not a forecast.
- Real sensors missing remain missing. Train-only imputation; no invented real readings.
- Walk-forward evaluation on real rides only. Synthetic readings only help training.
- Fixed primary model: `gbm_mix`. Other variants are exploratory; no winner selection on test errors.
- Historical residual intervals: nominal 80%, past residuals only, minimum eight calibration
  errors. Report empirical coverage. No coverage guarantee under temporal distribution drift.
- Paired circular block bootstrap compares relative duration errors with the baseline;
  10,000 repeats, block length 4, sensitivity at 2 and 6. Reports 95% CI and one-sided
  null-centered p-value. Exploratory: not enough observations to establish superiority.

Previous prototype's 7.91% number used full-history synthetic calibration; that leaked future
information. It is superseded by this past-only evaluation. Baseline comparison is restricted
outdoor-rides reimplementation, **not exact parity** with production (which also uses VirtualRide).

Outputs: `ml/reports/cycling_report.json` contains aggregate statistics and private per-ride
interval predictions; ignored by Git. Re-run evaluation for fresh results. No automatic promotion.
