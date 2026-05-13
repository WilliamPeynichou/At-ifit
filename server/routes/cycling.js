const express = require('express');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess } = require('../middleware/errorHandler');
const {
  getCyclingProfile,
  getCyclingRides,
  getCyclingProgress,
  getCyclingRecovery,
  getCyclingInsights,
} = require('../services/cyclingProfileService');

const router = express.Router();

router.get('/profile', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getCyclingProfile(req.userId));
}));

router.get('/rides', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getCyclingRides(req.userId, req.query.limit));
}));

router.get('/progress', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getCyclingProgress(req.userId));
}));

router.get('/recovery', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getCyclingRecovery(req.userId));
}));

router.get('/insights', auth, asyncHandler(async (req, res) => {
  sendSuccess(res, await getCyclingInsights(req.userId));
}));

module.exports = router;
