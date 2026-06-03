const SENSITIVE_KEY_PATTERN = /(password|passcode|passwd|pwd|hash|salt|token|secret|api[_-]?key|apikey|authorization|cookie|session|jwt|refresh|access|client[_-]?secret|private[_-]?key|stravaAccessToken|stravaRefreshToken)/i;

const SECRET_VALUE_PATTERN = /\b(Bearer\s+[A-Za-z0-9._~+/=-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]{16,}|[A-Fa-f0-9]{32,}:[A-Fa-f0-9]{32,})\b/;

const DEFAULT_MAX_DEPTH = 8;
const DEFAULT_MAX_ARRAY_LENGTH = 100;
const REDACTED = '[REDACTED]';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function toPlainValue(value) {
  if (!value) return value;

  if (typeof value.toJSON === 'function') {
    return value.toJSON();
  }

  if (value.dataValues && isPlainObject(value.dataValues)) {
    return value.dataValues;
  }

  return value;
}

function isSensitiveKey(key = '') {
  return SENSITIVE_KEY_PATTERN.test(String(key));
}

function redactString(value) {
  if (typeof value !== 'string') return value;
  return SECRET_VALUE_PATTERN.test(value) ? REDACTED : value;
}

function sanitizeMetadata(value, options = {}, depth = 0, seen = new WeakSet()) {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxArrayLength = options.maxArrayLength ?? DEFAULT_MAX_ARRAY_LENGTH;
  const pruneEmptyObjects = options.pruneEmptyObjects ?? true;

  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return redactString(value);
  if (typeof value !== 'object') return value;
  if (depth >= maxDepth) return '[TRUNCATED]';

  const plainValue = toPlainValue(value);
  if (plainValue !== value) {
    return sanitizeMetadata(plainValue, options, depth, seen);
  }

  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, maxArrayLength)
      .map(item => sanitizeMetadata(item, options, depth + 1, seen));
  }

  return Object.entries(value).reduce((safe, [key, entry]) => {
    if (isSensitiveKey(key)) {
      if (options.keepSensitiveKeys === true) safe[key] = REDACTED;
      return safe;
    }

    const sanitizedEntry = sanitizeMetadata(entry, options, depth + 1, seen);
    if (
      pruneEmptyObjects &&
      isPlainObject(sanitizedEntry) &&
      Object.keys(sanitizedEntry).length === 0
    ) {
      return safe;
    }

    safe[key] = sanitizedEntry;
    return safe;
  }, {});
}

function sanitizeUserForSuperAdmin(user) {
  const safe = sanitizeMetadata(user);
  if (!safe || typeof safe !== 'object') return safe;

  delete safe.password;
  delete safe.stravaAccessToken;
  delete safe.stravaRefreshToken;
  delete safe.stravaApiKey;

  safe.stravaConnected = Boolean(
    user?.stravaAccessToken ||
    user?.dataValues?.stravaAccessToken ||
    safe.stravaAthleteId
  );

  return safe;
}

function looksLikeUser(value) {
  const plain = toPlainValue(value);
  return Boolean(
    plain &&
    typeof plain === 'object' &&
    (
      'password' in plain ||
      'stravaAccessToken' in plain ||
      'stravaRefreshToken' in plain ||
      'email' in plain ||
      'role' in plain
    )
  );
}

function sanitizeForSuperAdmin(value) {
  if (Array.isArray(value)) return value.map(item => sanitizeForSuperAdmin(item));

  if (looksLikeUser(value)) {
    return sanitizeUserForSuperAdmin(value);
  }

  const safe = sanitizeMetadata(value);
  if (!safe || typeof safe !== 'object') return safe;

  return safe;
}

function assertNoSecrets(value) {
  const serialized = JSON.stringify(sanitizeMetadata(value, { keepSensitiveKeys: true }));
  if (serialized && SECRET_VALUE_PATTERN.test(serialized)) {
    throw new Error('Sensitive value detected after sanitization');
  }
  return true;
}

module.exports = {
  REDACTED,
  SENSITIVE_KEY_PATTERN,
  SECRET_VALUE_PATTERN,
  isSensitiveKey,
  sanitizeMetadata,
  sanitizeUserForSuperAdmin,
  sanitizeForSuperAdmin,
  assertNoSecrets,
};
