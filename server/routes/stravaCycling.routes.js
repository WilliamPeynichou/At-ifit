const express = require('express');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');
const {
  getCyclingAnalysis,
  getCyclingActivities,
  getCyclingWeeklyStats,
  getCyclingDashboardInsights,
  syncCyclingData,
} = require('../services/stravaCycling.service');

const router = express.Router();

router.get('/activities', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getCyclingActivities(req.userId, req.query));
}));

router.get('/stats', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getCyclingAnalysis(req.userId, req.query));
}));

router.get('/weekly', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getCyclingWeeklyStats(req.userId, req.query));
}));

router.get('/insights', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getCyclingDashboardInsights(req.userId, req.query));
}));

router.post('/sync', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await syncCyclingData(req.userId), 'Cycling sync started');
}));

module.exports = router;
