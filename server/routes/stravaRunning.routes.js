const express = require('express');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');
const {
  getRunningAnalysis,
  getRunningActivities,
  getRunningWeeklyStats,
  getRunningInsights,
  syncRunningData,
} = require('../services/stravaRunning.service');

const router = express.Router();

router.get('/activities', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getRunningActivities(req.userId, req.query));
}));

router.get('/stats', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getRunningAnalysis(req.userId, req.query));
}));

router.get('/weekly', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getRunningWeeklyStats(req.userId, req.query));
}));

router.get('/insights', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getRunningInsights(req.userId, req.query));
}));

router.post('/sync', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await syncRunningData(req.userId), 'Running sync started');
}));

module.exports = router;
