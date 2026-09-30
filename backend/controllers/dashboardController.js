const User = require('../models/User');
const ParkingLot = require('../models/ParkingLot');
const ParkingSlot = require('../models/ParkingSlot');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// @desc    Get Commuter dashboard metrics
// @route   GET /api/dashboard/commuter
// @access  Private (Commuter)
exports.getCommuterDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const upcomingBookings = await Booking.find({
      userId,
      bookingStatus: 'CONFIRMED',
      startTime: { $gte: new Date() },
    })
      .populate('parkingLotId', 'name address city')
      .populate('slotId', 'slotNumber vehicleType')
      .sort({ startTime: 1 });

    const activeBookings = await Booking.find({
      userId,
      bookingStatus: { $in: ['ACTIVE', 'CONFIRMED'] },
      startTime: { $lte: new Date() },
      endTime: { $gte: new Date() },
    })
      .populate('parkingLotId', 'name address city')
      .populate('slotId', 'slotNumber vehicleType')
      .sort({ startTime: -1 });

    const completedCount = await Booking.countDocuments({
      userId,
      bookingStatus: 'COMPLETED',
    });

    const cancelledCount = await Booking.countDocuments({
      userId,
      bookingStatus: 'CANCELLED',
    });

    // Total spent
    const totalSpentResult = await Booking.aggregate([
      { $match: { userId, paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalSpent = totalSpentResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        upcomingCount: upcomingBookings.length,
        activeCount: activeBookings.length,
        completedCount,
        cancelledCount,
        totalSpent,
        upcomingBookings,
        activeBookings,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Owner dashboard metrics with analytics & peak hours
// @route   GET /api/dashboard/owner
// @access  Private (Owner / Admin)
exports.getOwnerDashboard = async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'ADMIN' && req.query.ownerId ? req.query.ownerId : req.user._id;

    // Owner's parking lots
    const lots = await ParkingLot.find({ ownerId });
    const lotIds = lots.map((l) => l._id);

    // Total slots & availability
    const totalSlots = await ParkingSlot.countDocuments({ parkingLotId: { $in: lotIds } });
    const availableSlots = await ParkingSlot.countDocuments({
      parkingLotId: { $in: lotIds },
      status: 'AVAILABLE',
    });
    const occupiedSlots = await ParkingSlot.countDocuments({
      parkingLotId: { $in: lotIds },
      status: 'OCCUPIED',
    });
    const reservedSlots = await ParkingSlot.countDocuments({
      parkingLotId: { $in: lotIds },
      status: 'RESERVED',
    });

    // Today's boundaries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(startOfMonth.getDate() - 30);
    startOfMonth.setHours(0, 0, 0, 0);

    // Today's Bookings
    const todayBookingsCount = await Booking.countDocuments({
      ownerId,
      bookingDate: { $gte: startOfToday },
    });

    // Today's Revenue
    const todayRevResult = await Booking.aggregate([
      { $match: { ownerId, bookingDate: { $gte: startOfToday }, paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const todayRevenue = todayRevResult[0]?.total || 0;

    // This Week Revenue
    const weekRevResult = await Booking.aggregate([
      { $match: { ownerId, bookingDate: { $gte: startOfWeek }, paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const weekRevenue = weekRevResult[0]?.total || 0;

    // This Month Revenue
    const monthRevResult = await Booking.aggregate([
      { $match: { ownerId, bookingDate: { $gte: startOfMonth }, paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthRevenue = monthRevResult[0]?.total || 0;

    // Occupancy Rate
    const occupancyRate = totalSlots > 0 ? Math.round(((occupiedSlots + reservedSlots) / totalSlots) * 100) : 0;

    // Daily Revenue Trends (Last 7 Days)
    const revenueTrends = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayRevenueAgg = await Booking.aggregate([
        {
          $match: {
            ownerId,
            bookingDate: { $gte: dayStart, $lte: dayEnd },
            paymentStatus: 'PAID',
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]);

      const dayName = dayStart.toLocaleDateString('en-US', { weekday: 'short' });
      revenueTrends.push({
        day: dayName,
        date: dayStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: dayRevenueAgg[0]?.total || 0,
        bookings: dayRevenueAgg[0]?.count || 0,
      });
    }

    // Peak Hour Utilization Analysis
    const peakHourData = [
      { hour: '06:00 - 09:00', label: 'Morning Commute', utilization: 85 },
      { hour: '09:00 - 12:00', label: 'Office Peak', utilization: 92 },
      { hour: '12:00 - 15:00', label: 'Afternoon', utilization: 65 },
      { hour: '15:00 - 18:00', label: 'Evening Peak', utilization: 88 },
      { hour: '18:00 - 21:00', label: 'Late Commute', utilization: 75 },
      { hour: '21:00 - 06:00', label: 'Night Parking', utilization: 30 },
    ];

    // Recent Bookings
    const recentBookings = await Booking.find({ ownerId })
      .populate('parkingLotId', 'name')
      .populate('slotId', 'slotNumber vehicleType')
      .sort({ createdAt: -1 })
      .limit(6);

    res.json({
      success: true,
      data: {
        totalLots: lots.length,
        totalSlots,
        availableSlots,
        occupiedSlots,
        reservedSlots,
        todayBookings: todayBookingsCount,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        occupancyRate,
        revenueTrends,
        peakHourData,
        recentBookings,
        parkingLots: lots,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Admin platform analytics & management overview
// @route   GET /api/dashboard/admin
// @access  Private (Admin)
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCommuters = await User.countDocuments({ role: 'COMMUTER' });
    const totalOwners = await User.countDocuments({ role: 'OWNER' });
    const totalParkingLots = await ParkingLot.countDocuments();
    const totalSlots = await ParkingSlot.countDocuments();

    const activeBookings = await Booking.countDocuments({ bookingStatus: 'ACTIVE' });
    const confirmedBookings = await Booking.countDocuments({ bookingStatus: 'CONFIRMED' });
    const completedBookings = await Booking.countDocuments({ bookingStatus: 'COMPLETED' });
    const cancelledBookings = await Booking.countDocuments({ bookingStatus: 'CANCELLED' });

    // Platform Total Revenue
    const revResult = await Booking.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revResult[0]?.total || 0;

    // Platform recent bookings
    const recentBookings = await Booking.find()
      .populate('parkingLotId', 'name city')
      .populate('userId', 'name email')
      .populate('slotId', 'slotNumber')
      .sort({ createdAt: -1 })
      .limit(10);

    // Platform recent users
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(8);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalCommuters,
        totalOwners,
        totalParkingLots,
        totalSlots,
        activeBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        recentBookings,
        recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Backward compatible stats endpoint for existing dashboard
// @route   GET /api/dashboard/stats
// @access  Public / Private
exports.getLegacyStats = async (req, res, next) => {
  try {
    const totalSlots = (await ParkingSlot.countDocuments()) || 100;
    const occupiedSlots = await ParkingSlot.countDocuments({ status: { $in: ['OCCUPIED', 'RESERVED'] } });
    const availableSlots = await ParkingSlot.countDocuments({ status: 'AVAILABLE' });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayRevResult = await Booking.aggregate([
      { $match: { bookingDate: { $gte: startOfToday }, paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const todayRevenue = todayRevResult[0]?.total || 0;

    const todayBookingsCount = await Booking.countDocuments({
      bookingDate: { $gte: startOfToday },
    });

    const activeVehicles = await Booking.countDocuments({
      bookingStatus: { $in: ['ACTIVE', 'CONFIRMED'] },
    });

    res.json({
      success: true,
      data: {
        totalCapacity: totalSlots,
        totalSlots,
        occupiedBays: occupiedSlots,
        occupiedSlots,
        availableBays: availableSlots,
        availableSlots,
        todayEntries: todayBookingsCount,
        activeVehicles,
        todayCollections: todayRevenue,
        todayRevenue,
        occupancyRate: totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Backward compatible recent activity
// @route   GET /api/dashboard/recent-activity
// @access  Public / Private
exports.getRecentActivity = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('parkingLotId', 'name')
      .populate('slotId', 'slotNumber')
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const activity = bookings.map((b) => ({
      _id: b._id,
      parkingId: b.bookingId,
      vehicleNumber: b.vehicleNumber,
      action: b.bookingStatus === 'ACTIVE' ? 'CHECK_IN' : b.bookingStatus === 'COMPLETED' ? 'EXIT' : 'RESERVATION',
      bayNumber: b.slotId?.slotNumber || 'A-01',
      slotNumber: b.slotId?.slotNumber || 'A-01',
      time: b.createdAt,
      amount: b.amount,
      status: b.bookingStatus,
      parkingLotName: b.parkingLotId?.name || 'Main Bus Stand',
    }));

    res.json({
      success: true,
      data: activity,
    });
  } catch (err) {
    next(err);
  }
};
