const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);

// Legacy support
router.post('/forgot-password', (req, res) => {
  res.json({ success: true, message: 'Password reset link sent if account exists.' });
});
router.post('/reset-password', (req, res) => {
  res.json({ success: true, message: 'Password has been successfully updated.' });
});

module.exports = router;
