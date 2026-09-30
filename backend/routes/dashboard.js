const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

router.get('/commuter', protect, authorize('COMMUTER', 'ADMIN'), dashboardController.getCommuterDashboard);
router.get('/owner', protect, authorize('OWNER', 'ADMIN'), dashboardController.getOwnerDashboard);
router.get('/admin', protect, authorize('ADMIN'), dashboardController.getAdminDashboard);

// Legacy dashboard endpoints
router.get('/stats', optionalAuth, dashboardController.getLegacyStats);
router.get('/recent-activity', optionalAuth, dashboardController.getRecentActivity);

module.exports = router;
