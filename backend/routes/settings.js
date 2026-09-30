const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

router.get('/', settingsController.getSettings);
router.put('/', protect, authorize('ADMIN'), settingsController.updateSettings);

module.exports = router;
