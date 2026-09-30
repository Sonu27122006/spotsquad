const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect, optionalAuth } = require('../middleware/auth');

router.post('/', protect, bookingController.createBooking);
router.get('/', protect, bookingController.getBookings);
router.get('/:id', optionalAuth, bookingController.getBookingById);
router.put('/:id/cancel', protect, bookingController.cancelBooking);
router.post('/:id/checkin', protect, bookingController.checkIn);
router.post('/:id/checkout', optionalAuth, bookingController.checkOut);

module.exports = router;
