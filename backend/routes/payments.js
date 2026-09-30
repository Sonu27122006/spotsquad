const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, optionalAuth } = require('../middleware/auth');

router.post('/create', optionalAuth, paymentController.createOrder);
router.post('/verify', optionalAuth, paymentController.verifyPayment);
router.get('/', protect, paymentController.getPayments);

// Legacy POST /api/payments support
router.post('/', optionalAuth, async (req, res, next) => {
  const { parkingRecordId, amount, paymentMethod, transactionId } = req.body;
  req.body.bookingId = parkingRecordId;
  req.body.razorpay_payment_id = transactionId;
  req.body.razorpay_order_id = `order_${Date.now()}`;
  return paymentController.verifyPayment(req, res, next);
});

module.exports = router;
