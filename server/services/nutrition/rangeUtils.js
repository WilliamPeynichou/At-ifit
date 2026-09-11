/** Helpers numériques partagés par les calculateurs nutritionnels. */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 0) {
  if (!Number.isFinite(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

/** Arrondit une plage en garantissant low <= target <= high après arrondi. */
function roundRange(range, digits = 0) {
  const low = round(range.low, digits);
  const target = round(range.target, digits);
  const high = round(range.high, digits);
  return {
    low: Math.min(low, target),
    target,
    high: Math.max(high, target),
  };
}

function scaleRange(range, factor) {
  return {
    low: range.low * factor,
    target: range.target * factor,
    high: range.high * factor,
  };
}

function clampRange(range, min, max) {
  return {
    low: clamp(range.low, min, max),
    target: clamp(range.target, min, max),
    high: clamp(range.high, min, max),
  };
}

module.exports = { clamp, round, roundRange, scaleRange, clampRange };
