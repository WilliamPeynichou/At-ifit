"""
Prédiction de durée vélo — vrai ML, évalué contre l'heuristique actuelle.

Cible      : log(vitesse moyenne en mouvement)  -> durée = distance / vitesse
Validation : walk-forward (on n'utilise JAMAIS le futur pour prédire le passé).
Baseline   : baseline comparable restreinte aux sorties extérieures (pas parité production).
Sortie     : ml/reports/cycling_report.json (aucun branchement production).
"""
import json, math, sys
import hashlib
from datetime import datetime, timezone
import joblib
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from synthetic import generate
from stream_features import enrich
from evaluation import duration_interval, bootstrap_gain

ROOT = Path(__file__).parent
RIDE = {"Ride", "GravelRide"}          # VirtualRide exclu : dynamique différente (pas de vent, pas de descente)
MIN_TRAIN = 25                          # taille minimale avant d'évaluer
FEATURES = ["log_dist", "elev_per_km", "elev_total", "load_28d", "load_7d", "rest_days",
            "recent_speed", "recent_speed_long", "month_sin", "month_cos", "temp", "recent_np", "recent_drift"]


def load():
    df = pd.read_csv(ROOT / "data/activities.csv", parse_dates=["startDate"])
    df["startDate"] = pd.to_datetime(df["startDate"], utc=True)
    return df.sort_values("startDate").reset_index(drop=True)


def build(df_all):
    """Features calculées à partir du seul passé de chaque sortie (pas de fuite)."""
    df = df_all[df_all.type.isin(RIDE) | (df_all.type == "VirtualRide")].copy()
    rides = df[df.type.isin(RIDE) & (df.distance > 5000) & (df.movingTime > 600) & (df.trainer.fillna(0) == 0)].copy()
    rides["dist_km"] = rides.distance / 1000
    rides["speed"] = rides.dist_km / (rides.movingTime / 3600)
    rides = rides[(rides.speed > 5) & (rides.speed < 60)].reset_index(drop=True)

    allact = df_all.copy()
    allact["hours"] = allact.movingTime.fillna(0) / 3600
    rides = rides.sort_values('startDate').reset_index(drop=True)
    rows = []
    for i, r in rides.iterrows():
        past = allact[allact.startDate < r.startDate]
        d28 = past[past.startDate >= r.startDate - pd.Timedelta(days=28)]
        d7 = past[past.startDate >= r.startDate - pd.Timedelta(days=7)]
        prev_rides = rides.iloc[:i]
        rest = (r.startDate - past.startDate.max()).days if len(past) else 30
        rs = prev_rides.tail(5).speed.mean() if len(prev_rides) else np.nan
        long_ = prev_rides[prev_rides.dist_km >= 0.7 * r.dist_km]
        rsl = long_.tail(3).speed.mean() if len(long_) else np.nan
        m = r.startDate.month
        rows.append(dict(
            log_dist=math.log(r.dist_km), elev_per_km=(r.totalElevationGain or 0) / r.dist_km,
            elev_total=r.totalElevationGain or 0, load_28d=d28.hours.sum(), load_7d=d7.hours.sum(),
            rest_days=min(rest, 30), recent_speed=rs, recent_speed_long=rsl,
            month_sin=math.sin(2 * math.pi * m / 12), month_cos=math.cos(2 * math.pi * m / 12),
            temp=np.nan,  # no observed temperature from the target activity; forecast input unavailable
            recent_np=prev_rides.tail(5).get('normalized_power', pd.Series(dtype=float)).mean(),
            recent_drift=prev_rides.tail(5).get('cardiac_drift_pct', pd.Series(dtype=float)).mean()))
    X = pd.DataFrame(rows)
    return rides, X


# ---- Baseline : port Python de cyclingPredictor.js ----------------------------------------
def wquantile(vals, w, q):
    o = np.argsort(vals); v, w = np.array(vals)[o], np.array(w)[o]
    c = np.cumsum(w)
    return v[np.searchsorted(c, q * c[-1])]


def heuristic(rides, i):
    r = rides.iloc[i]; past = rides.iloc[:i]
    epk = (r.totalElevationGain or 0) / r.dist_km
    if len(past) == 0:
        return None
    age = (r.startDate - past.startDate).dt.days.clip(lower=0)
    rw = 0.5 ** (age / 180)
    dr = np.minimum(past.dist_km, r.dist_km) / np.maximum(past.dist_km, r.dist_km)
    pepk = past.totalElevationGain.fillna(0) / past.dist_km
    sim = dr * 0.65 + (1 / (1 + (pepk - epk).abs() / 10)) * 0.35
    ok = (sim >= 0.5) & (age <= 540)
    if ok.sum() < 3:
        return max(12, 25 - min(10, epk / 10 * 1.5))  # repli générique de l'heuristique
    return wquantile(past.speed[ok].values, (sim * rw)[ok].values, 0.5)


# ---- Modèles -----------------------------------------------------------------------------
def fit_predict(Xtr, ytr, Xte, kind, w=None):
    med = Xtr.median()
    Xtr, Xte = Xtr.fillna(med).fillna(0), Xte.fillna(med).fillna(0)
    if kind == "ridge":
        sc = StandardScaler().fit(Xtr)
        m = Ridge(alpha=10.0).fit(sc.transform(Xtr), ytr, sample_weight=w)
        return m.predict(sc.transform(Xte))
    if kind == "gbm":
        m = GradientBoostingRegressor(loss="absolute_error", n_estimators=60, max_depth=2,
                                      learning_rate=0.05, subsample=0.8, min_samples_leaf=4, random_state=0)
        return m.fit(Xtr, ytr, sample_weight=w).predict(Xte)


def main():
    df = load()
    stream_path = ROOT / 'data/streams.json'
    stream_coverage = {'available': False}
    if stream_path.exists():
        df, stream_coverage = enrich(df, json.loads(stream_path.read_text()))
    rides, X = build(df)
    # Keep an ablation without streams. Synthetic readings never fill real missing sensors.
    base_cols = [c for c in X.columns if c not in ('recent_np', 'recent_drift')]
    if not stream_path.exists():
        X = X[base_cols]
    n = len(rides)
    print(f"{n} sorties vélo réelles exploitables ({rides.startDate.min().date()} -> {rides.startDate.max().date()})")
    if n < MIN_TRAIN + 10:
        sys.exit("Pas assez de données.")
    y = np.log(rides.speed.values)

    # ---- catalogue synthétique (mock), calibré sur la vitesse médiane réelle ----
    N_SYN = 10
    athletes, cp = generate(N_SYN, float(rides.iloc[:MIN_TRAIN].speed.median()), seed=42,
                            profile=rides.iloc[:MIN_TRAIN])
    Xs, ys = [], []
    for a in athletes:
        r_a, X_a = build(a)
        Xs.append(X_a); ys.append(np.log(r_a.speed.values))
    Xs = pd.concat(Xs, ignore_index=True)[X.columns]; ys = np.concatenate(ys)
    print(f"{len(Xs)} sorties synthétiques ({N_SYN} athlètes, CP moyen calibré ≈ {cp} W)")

    variants = ['heuristic', 'naive_median', 'ridge_real', 'gbm_real', 'ridge_syn', 'gbm_syn', 'ridge_mix', 'gbm_mix']
    if stream_path.exists():
        variants.append('gbm_mix_no_streams')
    res = {k: [] for k in variants}
    intervals = []
    prior_residuals = []
    truth = []
    W_REAL = 8.0
    for i in range(MIN_TRAIN, n):                       # walk-forward : entraîne sur [0,i), prédit i
        truth.append(rides.speed.iloc[i])
        res["heuristic"].append(heuristic(rides, i))
        res["naive_median"].append(rides.speed.iloc[:i].median())
        xt = X.iloc[[i]]
        Xmix = pd.concat([Xs, X.iloc[:i]], ignore_index=True)
        ymix = np.concatenate([ys, y[:i]])
        wmix = np.concatenate([np.ones(len(Xs)), np.full(i, W_REAL)])
        for k in ("ridge", "gbm"):
            res[f"{k}_real"].append(float(np.exp(fit_predict(X.iloc[:i], y[:i], xt, k)[0])))
            res[f"{k}_syn"].append(float(np.exp(fit_predict(Xs, ys, xt, k)[0])))
            res[f"{k}_mix"].append(float(np.exp(fit_predict(Xmix, ymix, xt, k, wmix)[0])))
        if stream_path.exists():
            res['gbm_mix_no_streams'].append(float(np.exp(fit_predict(Xmix[base_cols], ymix, xt[base_cols], 'gbm', wmix)[0])))
        # Fixed primary model: no selection of best variant on the evaluation set.
        speed = res['gbm_mix'][-1]
        interval = duration_interval(float(rides.dist_km.iloc[i]), speed, prior_residuals)
        if interval:
            minutes = float(rides.movingTime.iloc[i] / 60)
            interval['covered'] = bool(interval['low_minutes'] <= minutes <= interval['high_minutes'])
            interval['actual_minutes'] = minutes
            intervals.append(interval)
        prior_residuals.append(float(y[i] - np.log(speed)))

    truth = np.array(truth)
    report = {"n_rides_real": n, "n_synthetic": int(len(Xs)), "n_evaluated": len(truth),
              "note": "Évaluation UNIQUEMENT sur sorties réelles, walk-forward. Le mock ne sert qu'à l'entraînement.",
              'stream_coverage': stream_coverage,
              'primary_model': 'gbm_mix',
              'limitations': ['Small sample; exploratory, not a promotion gate.',
                              'Mock calibrated only on initial training window.',
                              'Historical NP/drift only; no target-activity sensor leakage.',
                              'Intervals calibrated on prior errors; temporal dependence means no guaranteed coverage.'],
              "metrics": {}}
    for k, p in res.items():
        p = np.array(p, dtype=float)
        e = np.abs(1 / p - 1 / truth) / (1 / truth)
        report["metrics"][k] = dict(MAPE_duree_pct=round(100 * float(np.mean(e)), 2),
                                    MedAPE_duree_pct=round(100 * float(np.median(e)), 2),
                                    MAE_kmh=round(float(np.mean(np.abs(p - truth))), 2))
    primary = 'gbm_mix'
    baseline_error = np.abs(truth / np.asarray(res['heuristic']) - 1)
    model_error = np.abs(truth / np.asarray(res[primary]) - 1)
    report['significance'] = bootstrap_gain(baseline_error, model_error)
    report['bootstrap_sensitivity'] = {str(b): bootstrap_gain(baseline_error, model_error, block=b) for b in (2, 6)}
    report['intervals'] = {'nominal_coverage': .8, 'evaluated_count': len(intervals),
                           'observed_coverage': float(np.mean([r['covered'] for r in intervals])) if intervals else None,
                           'predictions': intervals}
    report['ml_beats_heuristic_significantly'] = report['significance']['significant_improvement']
    # Final experimental fit, distinct from walk-forward evaluation. Private local artifact.
    final_X = pd.concat([Xs, X], ignore_index=True)
    final_y = np.concatenate([ys, y])
    medians = final_X.median().fillna(0)
    final_model = GradientBoostingRegressor(loss='absolute_error', n_estimators=60,
        max_depth=2, learning_rate=.05, subsample=.8, min_samples_leaf=4, random_state=0)
    final_model.fit(final_X.fillna(medians).fillna(0), final_y,
                    sample_weight=np.concatenate([np.ones(len(Xs)), np.full(n, W_REAL)]))
    version = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    artifact_dir = ROOT / 'models' / version
    artifact_dir.mkdir(parents=True)
    joblib.dump({'model': final_model, 'medians': medians, 'features': list(X.columns),
                 'log_residuals': prior_residuals}, artifact_dir / 'model.joblib')
    manifest = {'schema_version': 1, 'version': version, 'status': 'experimental',
        'created_at': datetime.now(timezone.utc).isoformat(), 'target': 'outdoor_cycling_moving_minutes',
        'data_sha256': hashlib.sha256((ROOT / 'data/activities.csv').read_bytes()).hexdigest(),
        'features': list(X.columns), 'real_count': n, 'synthetic_count': len(Xs),
        'distance_domain_km': [float(rides.dist_km.min()), float(rides.dist_km.max())],
        'elevation_per_km_domain': [float((rides.totalElevationGain.fillna(0) / rides.dist_km).min()),
                                   float((rides.totalElevationGain.fillna(0) / rides.dist_km).max())],
        'metrics': report['metrics'][primary], 'significance': report['significance'],
        'production_promoted': False}
    (artifact_dir / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    report['artifact_version'] = version
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports/cycling_report.json").write_text(json.dumps(report, indent=2))
    print(f"{'modèle':<14}{'MAPE %':>8}{'MedAPE %':>10}{'MAE km/h':>10}")
    for k in variants:
        m = report["metrics"][k]
        print(f"{k:<14}{m['MAPE_duree_pct']:>8}{m['MedAPE_duree_pct']:>10}{m['MAE_kmh']:>10}")
    print(json.dumps(report['significance'], indent=2))
    print('Interval coverage:', report['intervals']['observed_coverage'])


if __name__ == "__main__":
    main()
