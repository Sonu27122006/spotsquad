const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

router.put('/:id', protect, authorize('OWNER', 'ADMIN'), parkingController.updateSlot);

module.exports = router;
