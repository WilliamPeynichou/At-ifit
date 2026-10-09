"""Local inference for a trusted, locally trained personal model. No web service yet."""
import argparse
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from train_cycling import ROOT, load, build
from stream_features import enrich
from evaluation import duration_interval


def predict(distance_km, elevation_m, date, version):
    if not 5 < distance_km <= 500 or not 0 <= elevation_m <= 20000:
        raise ValueError('Invalid distance or elevation')
    when = pd.to_datetime(date, utc=True)
    artifact = ROOT / 'models' / version
    manifest = json.loads((artifact / 'manifest.json').read_text())
    if when <= pd.to_datetime(manifest['created_at'], utc=True):
        raise ValueError('Prediction date must be later than model training; no historical backtest with final model')
    # Only locally generated artifacts are trusted. Joblib must never load user uploads.
    bundle = joblib.load(artifact / 'model.joblib')
    history = load()
    stream_path = ROOT / 'data/streams.json'
    if stream_path.exists():
        history, _ = enrich(history, json.loads(stream_path.read_text()))
    history = history[history.startDate < when]
    target = pd.DataFrame([{'type': 'Ride', 'startDate': when,
        'distance': distance_km * 1000, 'totalElevationGain': elevation_m,
        'movingTime': distance_km / 25 * 3600, 'trainer': 0}])
    _, features = build(pd.concat([history, target], ignore_index=True))
    row = features.iloc[[-1]][bundle['features']].fillna(bundle['medians']).fillna(0)
    speed = float(np.exp(bundle['model'].predict(row)[0]))
    interval = duration_interval(distance_km, speed, bundle['log_residuals'])
    low, high = manifest['distance_domain_km']
    epk_low, epk_high = manifest['elevation_per_km_domain']
    extrapolation = not (low <= distance_km <= high and epk_low <= elevation_m / distance_km <= epk_high)
    return {'model_version': version, 'status': 'experimental', 'method': 'gradient_boosting',
        'production_promoted': False, 'target_minutes': distance_km / speed * 60,
        'interval': interval, 'outside_training_domain': extrapolation,
        'warning': 'Prototype single-user; no demonstrated improvement. Moving time, not race finish time.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--distance-km', type=float, required=True)
    parser.add_argument('--elevation-m', type=float, default=0)
    parser.add_argument('--date', required=True)
    parser.add_argument('--version', required=True)
    args = parser.parse_args()
    # Version selects a direct child only, never arbitrary files.
    if Path(args.version).name != args.version or args.version in ('.', '..'):
        parser.error('Invalid model version')
    print(json.dumps(predict(args.distance_km, args.elevation_m, args.date, args.version), indent=2))
