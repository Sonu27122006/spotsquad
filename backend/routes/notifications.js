const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, notificationController.getNotifications);
router.put('/:id/read', optionalAuth, notificationController.markRead);
router.put('/read-all', optionalAuth, notificationController.markAllRead);
router.post('/send-sms', optionalAuth, notificationController.sendSms);
router.get('/fast2sms-wallet', optionalAuth, notificationController.getWalletBalance);

module.exports = router;
