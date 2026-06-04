const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const serverRoot = path.resolve(__dirname, '..');
const clientRoot = path.join(repoRoot, 'client', 'src');

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function readAllFiles(dir, matcher = () => true) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return readAllFiles(full, matcher);
    return matcher(full) ? [full] : [];
  });
}

describe('super admin backend contract', () => {
  test('le modèle User expose un rôle sécurisé avec user par défaut', () => {
    const User = require('../models/User');

    expect(User.rawAttributes.role).toBeDefined();
    expect(User.rawAttributes.role.defaultValue).toBe('user');
    expect(String(User.rawAttributes.role.allowNull)).toBe('false');

    const allowedValues = User.rawAttributes.role.values || User.rawAttributes.role.validate?.isIn?.[0];
    expect(allowedValues).toEqual(expect.arrayContaining(['user', 'admin', 'super_admin']));
  });

  test('la migration ajoute les rôles, promeut wili et crée les journaux observabilité', () => {
    const migrationSources = readAllFiles(path.join(serverRoot, 'migrations'), (file) => file.endsWith('.js'))
      .map(readIfExists)
      .join('\n');

    expect(migrationSources).toMatch(/(?:addColumn|addColumnIfMissing)\(['"]Users['"],\s*['"]role['"]/);
    expect(migrationSources).toMatch(/defaultValue:\s*['"]user['"]/);
    expect(migrationSources).toMatch(/super_admin/);
    expect(migrationSources).toMatch(/wili/i);
    expect(migrationSources).toMatch(/createTable\(['"]AuditLogs['"]/);
    expect(migrationSources).toMatch(/createTable\(['"]StravaApiLogs['"]/);
    expect(migrationSources).toMatch(/createTable\(['"]AiUsageLogs['"]/);
  });

  test('le middleware requireSuperAdmin refuse user/admin et autorise super_admin', async () => {
    const { requireRole, requireSuperAdmin } = require('../middleware/roles');

    expect(typeof requireRole).toBe('function');
    expect(typeof requireSuperAdmin).toBe('function');

    const buildRes = () => {
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
      return res;
    };

    let next = jest.fn();
    let res = buildRes();
    await requireSuperAdmin({ user: { id: 1, role: 'user' }, ip: '127.0.0.1' }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);

    next = jest.fn();
    res = buildRes();
    await requireSuperAdmin({ user: { id: 2, role: 'admin' }, ip: '127.0.0.1' }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);

    next = jest.fn();
    res = buildRes();
    await requireSuperAdmin({ user: { id: 3, role: 'super_admin' }, ip: '127.0.0.1' }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('les routes super admin existent, sont protégées et paginées', () => {
    const routeSource = readIfExists(path.join(serverRoot, 'routes', 'superAdmin.js'));
    const indexSource = readIfExists(path.join(serverRoot, 'index.js'));

    expect(indexSource).toMatch(/\/api\/super-admin/);
    expect(routeSource).toMatch(/requireSuperAdmin/);

    for (const fragment of [
      '/overview',
      '/users',
      '/users/:id',
      '/users/:id/activities',
      '/audit-logs',
      '/strava-logs',
      '/ai-logs',
      '/usage',
    ]) {
      expect(routeSource).toContain(fragment);
    }
    expect(routeSource).toMatch(/patch\(['"]\/users\/:id\/role['"]/i);
    expect(routeSource).toMatch(/limit|page|offset/i);
    expect(routeSource).toMatch(/role|strava|status|eventType|usageType|sport|search/i);
  });

  test('les réponses super admin ne sélectionnent pas de secrets bruts', () => {
    const routeSource = readIfExists(path.join(serverRoot, 'routes', 'superAdmin.js'));
    const serviceSources = readAllFiles(path.join(serverRoot, 'services'), (file) => /audit|usage|observability|super/i.test(file) && file.endsWith('.js'))
      .map(readIfExists)
      .join('\n');
    const combined = `${routeSource}\n${serviceSources}`;

    expect(combined).toMatch(/password|stravaAccessToken|stravaRefreshToken|refreshToken|token|secret/i);
    expect(combined).toMatch(/sanitizeForSuperAdmin|sanitize|redact|mask/i);
    expect(combined).not.toMatch(/attributes:\s*\[[^\]]*['"]password['"][^\]]*\]/i);
    expect(routeSource).toMatch(/sanitizeForSuperAdmin/);
    expect(routeSource).toMatch(/tokenStatus|reconnect_required/);
  });

  test('la route /api/user sanitise les tokens Strava et expose seulement un statut de connexion', () => {
    const userRouteSource = readIfExists(path.join(serverRoot, 'routes', 'user.js'));

    expect(userRouteSource).toMatch(/sanitizeUserForSuperAdmin/);
    expect(userRouteSource).toMatch(/stravaConnected/);
    expect(userRouteSource).toMatch(/stravaTokenStatus|reconnect_required/);
    expect(userRouteSource).not.toMatch(/sendSuccess\(res,\s*user\s*\)/);
  });

  test('la rétrogradation du dernier super admin est bloquée et auditée', () => {
    const routeSource = readIfExists(path.join(serverRoot, 'routes', 'superAdmin.js'));

    expect(routeSource).toMatch(/super_admin/);
    expect(routeSource).toMatch(/count/);
    expect(routeSource).toMatch(/last|dernier|seul|unique/i);
    expect(routeSource).toMatch(/role_change|ROLE_CHANGE|changement de rôle|audit/i);
  });
});

describe('super admin observability services contract', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('auditService journalise les connexions sans secrets dans metadata', async () => {
    jest.doMock('../models/AuditLog', () => ({ create: jest.fn(async (payload) => payload) }));
    const AuditLog = require('../models/AuditLog');
    const auditService = require('../services/auditService');

    expect(typeof auditService.logAuditEvent).toBe('function');

    await auditService.logAuditEvent({
      userId: 7,
      actorUserId: 7,
      eventType: 'login_success',
      status: 'success',
      ip: '127.0.0.1',
      userAgent: 'jest',
      message: 'Connexion réussie',
      metadata: {
        method: 'password',
        password: 'plain-secret',
        stravaAccessToken: 'strava-secret',
        refreshToken: 'jwt-refresh-secret',
        nested: { apiKey: 'provider-secret', safe: 'ok' },
      },
      riskLevel: 'low',
    });

    expect(AuditLog.create).toHaveBeenCalledTimes(1);
    const payload = AuditLog.create.mock.calls[0][0];
    expect(JSON.stringify(payload)).toMatch(/login_success|Connexion réussie/);
    expect(JSON.stringify(payload)).toMatch(/safe/);
    expect(JSON.stringify(payload)).not.toMatch(/plain-secret|strava-secret|jwt-refresh-secret|provider-secret/);
  });

  test('les services Strava et IA exposent un logger instrumenté et expurgent les secrets', async () => {
    jest.doMock('../models/StravaApiLog', () => ({ create: jest.fn(async (payload) => payload) }));
    jest.doMock('../models/AiUsageLog', () => ({ create: jest.fn(async (payload) => payload) }));

    const StravaApiLog = require('../models/StravaApiLog');
    const AiUsageLog = require('../models/AiUsageLog');
    const stravaApiLog = require('../services/stravaApiLogService');
    const aiUsage = require('../services/aiUsageService');

    expect(typeof stravaApiLog.logStravaApiCall).toBe('function');
    expect(typeof aiUsage.logAiUsage).toBe('function');

    await stravaApiLog.logStravaApiCall({
      userId: 9,
      callType: 'activity_detail',
      endpoint: '/activities/:id',
      method: 'GET',
      status: 'success',
      durationMs: 123,
      attempts: 1,
      itemCount: 1,
      metadata: { accessToken: 'strava-token', refresh_token: 'refresh-token', activityId: 'abc' },
    });
    await aiUsage.logAiUsage({
      userId: 9,
      provider: 'anthropic',
      model: 'claude-test',
      usageType: 'agent_message',
      status: 'success',
      durationMs: 456,
      userMessageLength: 12,
      responseLength: 34,
      dataUsed: ['profile_without_secrets'],
      metadata: { apiKey: 'ai-secret', prompt: 'short non secret summary' },
    });

    expect(StravaApiLog.create).toHaveBeenCalledTimes(1);
    expect(AiUsageLog.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(StravaApiLog.create.mock.calls[0][0])).not.toMatch(/strava-token|refresh-token/);
    expect(JSON.stringify(AiUsageLog.create.mock.calls[0][0])).not.toMatch(/ai-secret/);
  });
});

describe('super admin frontend contract', () => {
  test('la navigation et la route React sont conditionnées au rôle super_admin', () => {
    const appSource = readIfExists(path.join(clientRoot, 'App.jsx'));
    const protectedRouteSource = readIfExists(path.join(clientRoot, 'components', 'ProtectedRoute.jsx'));
    const layoutSource = readIfExists(path.join(clientRoot, 'components', 'Layout.jsx'));

    expect(appSource).toMatch(/\/super-admin/);
    expect(appSource).toMatch(/requiredRole=['"]super_admin['"]/);
    expect(protectedRouteSource).toMatch(/requiredRole/);
    expect(protectedRouteSource).toMatch(/super_admin|role/);
    expect(layoutSource).toMatch(/super_admin/);
    expect(layoutSource).toMatch(/\/super-admin/);
  });

  test('la page super admin rend liste, fiche utilisateur et sections observabilité sans tokens', () => {
    const pageSource = readIfExists(path.join(clientRoot, 'pages', 'SuperAdmin.jsx'));

    expect(pageSource).toMatch(/overview|Vue d’ensemble|Utilisateurs/i);
    expect(pageSource).toMatch(/audit-logs|Audit/i);
    expect(pageSource).toMatch(/strava-logs|Strava/i);
    expect(pageSource).toMatch(/ai-logs|IA|AI/i);
    expect(pageSource).toMatch(/users\/\$\{.*id.*\}|selectedUser|userDetail/i);
    expect(pageSource).toMatch(/activities/i);
    expect(pageSource).toMatch(/page|limit|pagination/i);
    expect(pageSource).not.toMatch(/stravaAccessToken|stravaRefreshToken|refreshToken|passwordHash|JWT_SECRET|API_KEY/);
  });
});
