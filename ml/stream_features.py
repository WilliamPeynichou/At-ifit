"""Stream summaries. Missing sensor values stay missing, never become invented readings."""
import json
import numpy as np
import pandas as pd


def array(value):
    if isinstance(value, str):
        value = json.loads(value)
    if isinstance(value, dict):
        value = value.get('data', [])
    return np.asarray(value if value is not None else [], dtype=float)


def summarize(stream):
    t = array(stream.get('time'))
    result = {'normalized_power': np.nan, 'cardiac_drift_pct': np.nan}
    if len(t) < 2 or np.any(~np.isfinite(t)) or np.any(np.diff(t) <= 0):
        return result
    # Avoid interpolating long sensor outages or processing malformed durations.
    if t[-1] - t[0] < 600 or t[-1] - t[0] > 86400 or np.max(np.diff(t)) > 30:
        return result
    grid = np.arange(t[0], t[-1] + 1)
    watts = array(stream.get('watts'))
    if len(watts) == len(t) and np.all(np.isfinite(watts)) and np.all(watts >= 0):
        power = np.interp(grid, t, watts)
        rolling = pd.Series(power).rolling(30, min_periods=30).mean().dropna()
        result['normalized_power'] = float(np.mean(rolling ** 4) ** .25)
    hr = array(stream.get('heartrate'))
    # Power/HR preferred; speed/HR is terrain-confounded and explicitly marked proxy.
    effort = watts if len(watts) == len(t) else array(stream.get('velocitySmooth'))
    result['drift_source'] = 'power' if len(watts) == len(t) else 'speed_proxy'
    if len(hr) == len(t) and len(effort) == len(t):
        h = np.interp(grid, t, hr)
        e = np.interp(grid, t, effort)
        moving = array(stream.get('moving'))
        mask = (h >= 40) & (h <= 230) & np.isfinite(e) & (e > 0)
        if len(moving) == len(t):
            mask &= np.interp(grid, t, moving) >= .99
        # Drop first 10 minutes (warm-up); each half must contain >= 5 min valid data.
        split = (grid[-1] + grid[0] + 600) / 2
        halves = [mask & (grid >= grid[0] + 600) & (grid < split), mask & (grid >= split)]
        if all(m.sum() >= 300 for m in halves):
            ratios = [float(np.mean(e[m]) / np.mean(h[m])) for m in halves]
            result['cardiac_drift_pct'] = 100 * (1 - ratios[1] / ratios[0])
    return result


def enrich(df, streams):
    summaries = {int(s['activityId']): summarize(s) for s in streams}
    out = df.copy()
    for col in ('normalized_power', 'cardiac_drift_pct'):
        out[col] = [summaries.get(int(i), {}).get(col, np.nan) for i in out.id]
    return out, {'streams': len(streams), 'with_power': int(out.normalized_power.notna().sum()),
                 'with_drift': int(out.cardiac_drift_pct.notna().sum()),
                 'speed_proxy_streams': sum(s.get('drift_source') == 'speed_proxy' for s in summaries.values())}
