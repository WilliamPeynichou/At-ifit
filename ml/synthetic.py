"""
Générateur de sorties vélo SYNTHÉTIQUES (mock) basé sur la physique.

  P = m·g·(crr + pente)·v + ½·ρ·CdA·v³   ->  on résout v pour une puissance soutenue donnée.
  Puissance soutenue = CP × fitness(t) × intensité × (durée)^-0.07

Les athlètes sont calibrés pour que leur vitesse médiane ressemble à celle de l'utilisateur réel
(ça évite un décalage de distribution). Ces données ne servent QU'À l'entraînement :
jamais à l'évaluation, qui reste sur les sorties réelles.
"""
import numpy as np
import pandas as pd

G, RHO = 9.81, 1.2


def solve_speed(power, mass, cda, crr, grade):
    lo, hi = 0.5, 25.0                                  # m/s
    for _ in range(50):
        v = (lo + hi) / 2
        need = mass * G * (crr + grade) * v + 0.5 * RHO * cda * v ** 3
        lo, hi = (v, hi) if need < power else (lo, v)
    return (lo + hi) / 2


def make_athlete(rng, cp, n_days=420, profile=None):
    mass = rng.uniform(60, 95); cda = rng.uniform(0.30, 0.40); crr = rng.uniform(0.004, 0.007)
    t0 = pd.Timestamp("2025-01-01", tz="UTC")
    day, rows, load = 0, [], []
    fit = 1.0
    while day < n_days:
        day += int(rng.choice([1, 1, 2, 2, 3, 4, 6], p=[.1, .15, .25, .2, .15, .1, .05]))
        date = t0 + pd.Timedelta(days=day)
        if profile is None:
            dist = float(np.clip(rng.lognormal(np.log(40), 0.6), 8, 160))
            epk = float(np.clip(rng.lognormal(np.log(10), 0.7), 0, 45))
        else:
            # Joint bootstrap preserves distance/elevation correlation. Past-only profile.
            sampled = profile.iloc[int(rng.integers(len(profile)))]
            dist = float(np.clip(sampled.dist_km * rng.lognormal(0, .12), 6, 200))
            epk = float(np.clip(sampled.totalElevationGain / sampled.dist_km * rng.lognormal(0, .15), 0, 60))
        elev = epk * dist
        recent_h = sum(h for d, h in load if day - d <= 28)
        fit = 0.995 * fit + 0.005 * (1 + 0.006 * (recent_h - 10)) + rng.normal(0, 0.004)   # forme liée à la charge
        fit = float(np.clip(fit, 0.85, 1.15))
        wind = rng.normal(0, 1.2)                                               # vent effectif m/s
        intensity = float(np.clip(rng.normal(0.66, 0.08), 0.45, 0.9))
        month = date.month
        temp = 12 + 9 * np.sin((month - 4) / 12 * 2 * np.pi) + rng.normal(0, 3)
        v = 8.0
        for _ in range(3):                                                      # durée <-> puissance soutenue
            dur_h = dist / (v * 3.6)
            p = cp * fit * intensity * dur_h ** -0.07 * (1 - 0.004 * max(0, temp - 25))
            # Equal climbing/descending route segments. D+ is not net uphill grade.
            grade = 2 * epk / 1000
            up = solve_speed(p, mass, cda, crr, grade)
            down = min(16.7, solve_speed(p * .35, mass, cda, crr, -grade))
            v = 2 / (1 / up + 1 / down) - 0.15 * wind
            v = max(v, 2.0)
        v *= float(np.exp(rng.normal(0, 0.04)))                                 # bruit résiduel (arrêts, trafic)
        moving = dist / (v * 3.6) * 3600
        moving += dist * rng.uniform(0, 4)  # turns / slowing: seconds per km
        stopped = dist * rng.uniform(0, 8)  # stops affect elapsed, NOT moving target
        np_mock = p * rng.uniform(1.02, 1.18)
        drift_mock = float(rng.normal(2 + max(0, temp - 20) * .4 + moving / 3600, 2))
        load.append((day, moving / 3600))
        rows.append(dict(type="Ride", startDate=date + pd.Timedelta(hours=int(rng.integers(6, 18))),
                         distance=dist * 1000, movingTime=moving, totalElevationGain=elev,
                         averageTemp=temp, trainer=0, elapsedTime=moving + stopped,
                         normalized_power=np_mock if rng.random() < .7 else np.nan,
                         cardiac_drift_pct=drift_mock if rng.random() < .7 else np.nan))
    return pd.DataFrame(rows)


def median_speed(df):
    return float(np.median((df.distance / 1000) / (df.movingTime / 3600)))


def generate(n_athletes, target_median_kmh, seed=0, profile=None):
    rng = np.random.default_rng(seed)
    # calibration : CP moyen tel que la vitesse médiane synthétique ≈ celle de l'utilisateur
    best, best_gap = 200, 1e9
    for cp in range(120, 380, 20):
        gap = abs(median_speed(make_athlete(np.random.default_rng(1), cp, 200, profile)) - target_median_kmh)
        if gap < best_gap: best, best_gap = cp, gap
    out = []
    for a in range(n_athletes):
        cp = best * rng.lognormal(0, 0.18)
        df = make_athlete(rng, cp, profile=profile)
        df["athlete"] = a
        out.append(df)
    return out, best
