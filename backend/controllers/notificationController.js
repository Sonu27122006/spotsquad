const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Public / Private
exports.getNotifications = async (req, res, next) => {
  try {
    let query = {};
    if (req.user) {
      query.$or = [{ userId: req.user._id }, { userId: null }];
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(30);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Public / Private
exports.markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Public / Private
exports.markAllRead = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user) {
      filter.$or = [{ userId: req.user._id }, { userId: null }];
    }
    await Notification.updateMany(filter, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// @desc    Send SMS simulation
// @route   POST /api/notifications/send-sms
// @access  Public / Private
exports.sendSms = async (req, res, next) => {
  try {
    const { phone, message } = req.body;
    console.log(`[SMS SIMULATION] To: ${phone} | Content: ${message}`);
    res.json({
      success: true,
      message: `SMS simulated and delivered to ${phone}`,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Fast2SMS wallet balance simulation
// @route   GET /api/notifications/fast2sms-wallet
// @access  Public / Private
exports.getWalletBalance = async (req, res, next) => {
  res.json({
    success: true,
    wallet: {
      balance: 150.0,
      currency: 'INR',
      status: 'ACTIVE',
    },
  });
};
