const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

router.get('/', async (req, res, next) => {
  try {
    const topVehicles = await Booking.aggregate([
      {
        $group: {
          _id: '$vehicleNumber',
          visits: { $sum: 1 },
          totalSpent: { $sum: '$amount' },
          lastVisit: { $max: '$createdAt' },
        },
      },
      { $sort: { visits: -1 } },
      { $limit: 10 },
    ]);

    const mapped = topVehicles.map((v, idx) => ({
      rank: idx + 1,
      vehicleNumber: v._id,
      visits: v.visits,
      points: v.visits * 50,
      totalSpent: v.totalSpent,
      lastVisit: v.lastVisit,
    }));

    res.json({
      success: true,
      data: mapped,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
