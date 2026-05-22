const express = require('express');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');
const {
  getSwimmingAnalysis,
  getSwimmingActivities,
  getSwimmingWeeklyStats,
  getSwimmingInsights,
  syncSwimmingData,
} = require('../services/stravaSwimming.service');

const router = express.Router();

router.get('/activities', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getSwimmingActivities(req.userId, req.query));
}));

router.get('/stats', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getSwimmingAnalysis(req.userId, req.query));
}));

router.get('/weekly', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getSwimmingWeeklyStats(req.userId, req.query));
}));

router.get('/insights', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getSwimmingInsights(req.userId, req.query));
}));

router.post('/sync', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await syncSwimmingData(req.userId), 'Swimming sync started');
}));

module.exports = router;
