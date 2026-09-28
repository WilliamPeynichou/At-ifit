const fs = require('fs');
const path = require('path');

jest.mock('../database', () => ({ transaction: jest.fn(async fn => fn('tx')) }));
const mockModel = () => ({ findAll: jest.fn(), findByPk: jest.fn(), destroy: jest.fn(async () => 1), update: jest.fn(async () => [1]) });
jest.mock('../models/User', () => mockModel());
jest.mock('../models/Activity', () => mockModel());
jest.mock('../models/ActivityStream', () => mockModel());
jest.mock('../models/Weight', () => mockModel());
jest.mock('../models/Goal', () => mockModel());
jest.mock('../models/RefreshToken', () => mockModel());
jest.mock('../models/AuditLog', () => mockModel());
jest.mock('../models/StravaApiLog', () => mockModel());
jest.mock('../models/AiUsageLog', () => mockModel());

const { Op } = require('sequelize');
const User = require('../models/User');
const Activity = require('../models/Activity');
const ActivityStream = require('../models/ActivityStream');
const AuditLog = require('../models/AuditLog');
const StravaApiLog = require('../models/StravaApiLog');
const AiUsageLog = require('../models/AiUsageLog');
const { deleteAccount, EXPORT_USER_FIELDS } = require('../services/userDataService');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('RGPD : droits des utilisateurs', () => {
  test('deleteAccount efface données, journaux et compte', async () => {
    Activity.findAll.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    await deleteAccount(42);

    expect(ActivityStream.destroy).toHaveBeenCalledWith({ where: { activityId: [10, 11] }, transaction: 'tx' });
    expect(Activity.destroy).toHaveBeenCalledWith({ where: { userId: 42 }, transaction: 'tx' });
    expect(AuditLog.destroy).toHaveBeenCalledWith({ where: { [Op.or]: [{ userId: 42 }, { actorUserId: 42 }] }, transaction: 'tx' });
    expect(StravaApiLog.destroy).toHaveBeenCalledWith({ where: { userId: 42 }, transaction: 'tx' });
    expect(AiUsageLog.destroy).toHaveBeenCalledWith({ where: { userId: 42 }, transaction: 'tx' });
    expect(User.destroy).toHaveBeenCalledWith({ where: { id: 42 }, transaction: 'tx' });
  });

  test('export ne contient jamais mot de passe ni jetons Strava', () => {
    expect(EXPORT_USER_FIELDS).not.toEqual(expect.arrayContaining(['password']));
    expect(EXPORT_USER_FIELDS.some(f => /token|password|apikey/i.test(f))).toBe(false);
  });

  test('routes utilisateur : export et suppression protégés, mot de passe requis, pas de 401 ambigu', () => {
    const src = read('routes/user.js');
    expect(src).toMatch(/router\.get\('\/export',\s*auth/);
    expect(src).toMatch(/router\.delete\('\/',\s*auth/);
    expect(src).toMatch(/comparePassword\(password\)/);
    expect(src).toMatch(/confirmation !== 'SUPPRIMER'/);
    expect(src).toMatch(/'Invalid password', 403/);
    expect(src).toMatch(/revokeStravaToken/);
  });

  test('inscription : consentement explicite santé et âge requis et journalisés', () => {
    const src = read('routes/auth.js');
    expect(src).toMatch(/healthDataConsent !== true \|\| ageConfirmed !== true/);
    expect(src).toMatch(/health_data_consent_granted/);
  });
});
