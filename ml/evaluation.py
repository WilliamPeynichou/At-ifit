"""Past-only uncertainty and paired circular block bootstrap (serially dependent errors)."""
import numpy as np


def duration_interval(distance_km, speed, prior_log_residuals, alpha=.2):
    residuals = np.asarray(prior_log_residuals, dtype=float)
    if len(residuals) < 8:
        return None  # No fabricated precision before calibration exists.
    # Conservative finite-sample absolute residual quantile, nominal 80% interval.
    rank = min(len(residuals), int(np.ceil((len(residuals) + 1) * (1 - alpha))))
    q = float(np.sort(np.abs(residuals))[rank - 1])
    center = distance_km / speed * 60
    return {'low_minutes': center * np.exp(-q), 'target_minutes': center,
            'high_minutes': center * np.exp(q), 'calibration_count': len(residuals),
            'nominal_coverage': 1 - alpha}


def bootstrap_gain(baseline_errors, model_errors, seed=42, repeats=10000, block=4):
    delta = np.asarray(baseline_errors) - np.asarray(model_errors)
    n = len(delta)
    if n < 2:
        raise ValueError('At least two paired errors required')
    rng = np.random.default_rng(seed)
    starts = rng.integers(0, n, size=(repeats, int(np.ceil(n / block))))
    indices = ((starts[..., None] + np.arange(block)) % n).reshape(repeats, -1)[:, :n]
    means = delta[indices].mean(axis=1)
    low, high = np.quantile(means, [.025, .975])
    # Null-centred bootstrap, one-sided H0: mean gain <= 0.
    null_means = means - delta.mean()
    p = (1 + int(np.sum(null_means >= delta.mean()))) / (repeats + 1)
    return {'gain_MA_percentage_points': float(delta.mean() * 100),
            'CI95_percentage_points': [float(low * 100), float(high * 100)],
            'p_one_sided': float(p), 'block_length': block, 'repeats': repeats,
            'significant_improvement': bool(low > 0 and p < .05)}
