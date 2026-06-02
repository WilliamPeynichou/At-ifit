const SENSITIVE_KEY_PATTERN = /(password|token|secret|api[_-]?key|authorization|cookie|session|refresh|access|email)/i;
const FORBIDDEN_REQUEST_PATTERN = /(ignore|oublie|bypass|contourne|désactive|desactive).*(règle|regle|instruction|validation|sécurité|securite)|token|secret|mot de passe|password|autre utilisateur|another user|user\s*id|modifie directement|crée directement|execute directement|exécute directement/i;

const ALLOWED_ACTIONS = Object.freeze({
  GENERATE_WEEKLY_REPORT: 'generate_weekly_report',
  REQUEST_STRAVA_SYNC: 'request_strava_sync',
  CREATE_SPORT_GOAL: 'create_sport_goal',
  SUGGEST_RECOVERY: 'suggest_recovery',
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeForAI(value, depth = 0) {
  if (depth > 5) return '[résumé limité]';
  if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitizeForAI(item, depth + 1));
  if (!isPlainObject(value)) return value;

  return Object.entries(value).reduce((safe, [key, entry]) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) return safe;
    safe[key] = sanitizeForAI(entry, depth + 1);
    return safe;
  }, {});
}

function sanitizeHistory(history = [], maxMessages = 8) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(message => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string')
    .slice(-maxMessages)
    .map(message => ({
      role: message.role,
      content: message.content.slice(0, 2000),
    }));
}

function detectUnsafeRequest(message = '') {
  const normalized = String(message || '').toLowerCase();
  if (!FORBIDDEN_REQUEST_PATTERN.test(normalized)) return null;

  return {
    success: false,
    refusal: true,
    error: 'Je ne peux pas contourner les règles de sécurité, révéler des secrets ou accéder aux données d’un autre utilisateur.',
  };
}

function createPendingAction({ type, reason, consequences = [], dataUsed = [], payload = {} }) {
  if (!Object.values(ALLOWED_ACTIONS).includes(type)) {
    throw new Error('Action non autorisée');
  }

  return {
    status: 'pending_confirmation',
    type,
    reason,
    consequences,
    dataUsed,
    payload: sanitizeForAI(payload),
    requiresConfirmation: true,
    createdAt: new Date().toISOString(),
  };
}

function canExecuteAction(action, confirmation) {
  return Boolean(
    action &&
    action.status === 'pending_confirmation' &&
    action.requiresConfirmation === true &&
    confirmation === true
  );
}

module.exports = {
  ALLOWED_ACTIONS,
  SENSITIVE_KEY_PATTERN,
  sanitizeForAI,
  sanitizeHistory,
  detectUnsafeRequest,
  createPendingAction,
  canExecuteAction,
};
