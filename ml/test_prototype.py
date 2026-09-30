import unittest
import numpy as np
import pandas as pd
from stream_features import summarize
from evaluation import duration_interval, bootstrap_gain
from train_cycling import build
from synthetic import generate


class PrototypeTests(unittest.TestCase):
    def test_constant_power(self):
        t = list(range(1801))
        r = summarize({'time': t, 'watts': [200] * len(t), 'heartrate': [140] * len(t)})
        self.assertAlmostEqual(r['normalized_power'], 200)
        self.assertAlmostEqual(r['cardiac_drift_pct'], 0)

    def test_missing_and_invalid_stream(self):
        self.assertTrue(np.isnan(summarize({'time': [0, 1]})['normalized_power']))
        self.assertTrue(np.isnan(summarize({'time': [0, 1800], 'watts': [200, 200]})['normalized_power']))

    def test_drift(self):
        t = list(range(2401))
        hr = [140 if i < 1500 else 154 for i in t]
        r = summarize({'time': t, 'watts': [200] * len(t), 'heartrate': hr})
        self.assertAlmostEqual(r['cardiac_drift_pct'], 100 * (1 - 140 / 154), places=1)

    def test_past_only_features(self):
        df = pd.DataFrame({'id': [1, 2, 3], 'type': ['Ride'] * 3,
            'startDate': pd.date_range('2025-01-01', periods=3, tz='UTC'),
            'distance': [20000] * 3, 'movingTime': [3000] * 3,
            'trainer': [0] * 3, 'averageTemp': [10] * 3,
            'totalElevationGain': [200] * 3,
            'normalized_power': [100, 200, 300], 'cardiac_drift_pct': [1, 2, 3]})
        _, before = build(df)
        df.loc[2, ['normalized_power', 'cardiac_drift_pct', 'movingTime', 'averageTemp']] = [9999, 9999, 4000, 90]
        _, after = build(df)
        pd.testing.assert_frame_equal(before, after)
        self.assertEqual(before.iloc[2].recent_np, 150)

    def test_interval_needs_history(self):
        self.assertIsNone(duration_interval(60, 30, [0] * 7))
        r = duration_interval(60, 30, [.1] * 10)
        self.assertLess(r['low_minutes'], 120)
        self.assertGreater(r['high_minutes'], 120)

    def test_paired_bootstrap(self):
        r = bootstrap_gain([.2] * 24, [.1] * 24)
        self.assertTrue(r['significant_improvement'])
        r = bootstrap_gain([.1] * 24, [.1] * 24)
        self.assertFalse(r['significant_improvement'])

    def test_mock_repeatable(self):
        a, _ = generate(1, 25, seed=9)
        b, _ = generate(1, 25, seed=9)
        pd.testing.assert_frame_equal(a[0], b[0])
        self.assertTrue((a[0].elapsedTime >= a[0].movingTime).all())


if __name__ == '__main__':
    unittest.main()
