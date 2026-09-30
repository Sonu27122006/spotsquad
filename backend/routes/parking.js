const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const bookingController = require('../controllers/bookingController');
const { protect, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const Booking = require('../models/Booking');

// Nearby shortcut
router.get('/nearby', parkingController.getParkingLots);

// Active parking sessions (compatibility with old prototype)
router.get('/active', optionalAuth, parkingController.getActiveParking);

// Digital Pass Public View
router.get('/pass/:id', parkingController.getPublicPass);

// Helper to construct flexible search condition across vehicle number, token ID, mobile, and name
function buildFlexibleSearchFilter(q) {
  const rawQ = (q || '').trim();
  if (!rawQ) return null;

  const cleanAlphaNum = rawQ.replace(/[^a-zA-Z0-9]/g, '');
  const cleanDigits = rawQ.replace(/[^0-9]/g, '');

  const orConditions = [
    { vehicleNumber: new RegExp(rawQ, 'i') },
    { bookingId: new RegExp(rawQ, 'i') },
    { qrToken: new RegExp(rawQ, 'i') },
    { customerName: new RegExp(rawQ, 'i') },
    { customerPhone: new RegExp(rawQ, 'i') },
  ];

  // Flexible alphanumeric regex: "TN30AB1234" matches "TN 30 AB 1234", "PK202666380" matches "PK-2026-66380"
  if (cleanAlphaNum.length >= 3) {
    const flexiblePattern = cleanAlphaNum.split('').join('[\\s\\-]*');
    orConditions.push(
      { vehicleNumber: new RegExp(flexiblePattern, 'i') },
      { bookingId: new RegExp(flexiblePattern, 'i') },
      { qrToken: new RegExp(flexiblePattern, 'i') }
    );
  }

  // 10-digit or partial mobile search
  if (cleanDigits.length >= 7) {
    orConditions.push({ customerPhone: new RegExp(cleanDigits) });
  }

  return { $or: orConditions };
}

function mapBookingToRecord(b) {
  const totalAmount = Number(b.amount || 20);
  const rawPaid = Number(b.paidAmount || 0);

  // ONE RELIABLE SOURCE OF TRUTH:
  // A booking is ONLY considered PAID if paidAmount >= totalAmount AND paidAmount > 0 AND paymentStatus === 'PAID'
  const isPaid = (b.paymentStatus === 'PAID' && rawPaid >= totalAmount && rawPaid > 0);
  const paidAmount = isPaid ? totalAmount : rawPaid;
  const amountDue = isPaid ? 0 : Math.max(0, totalAmount - paidAmount);
  const paymentStatus = isPaid ? 'PAID' : 'PENDING';
  const transactionId = isPaid ? (b.transactionId || '') : '';

  return {
    _id: b._id,
    id: b.bookingId,
    parkingId: b.bookingId,
    tokenId: b.bookingId,
    bookingId: b.bookingId,
    qrToken: b.qrToken,
    vehicleNumber: b.vehicleNumber,
    vehicleType: b.vehicleType,
    customerName: b.customerName || b.userId?.name || 'Customer',
    mobile: b.customerPhone || b.userId?.phone || '',
    mobileNumber: b.customerPhone || b.userId?.phone || '',
    customerPhone: b.customerPhone || b.userId?.phone || '',
    parkingBay: b.slotId?.slotNumber || 'A-01',
    parkingSlot: b.slotId?.slotNumber || 'A-01',
    parkingLotName: b.parkingLotId?.name || 'Main Parking',
    entryTime: b.checkInTime || b.startTime,
    exitTime: b.checkOutTime || null,
    vehicleStatus: b.bookingStatus === 'COMPLETED' ? 'EXITED' : 'PARKED',
    status: b.bookingStatus === 'COMPLETED' ? 'EXITED' : 'PARKED',
    dailyRate: b.parkingLotId?.pricePerDay || 20,
    hourlyRate: b.parkingLotId?.pricePerHour || 10,
    totalAmount,
    paidAmount,
    amountDue,
    currentAmount: totalAmount,
    finalAmount: totalAmount,
    paymentStatus,
    paymentMethod: b.paymentMethod || 'RAZORPAY',
    transactionId,
  };
}

// Search endpoint (searches vehicles/tokens/mobile and fallback to parking locations)
router.get('/search', optionalAuth, async (req, res, next) => {
  try {
    const q = req.query.query || req.query.search || '';
    if (!q.trim()) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const searchFilter = buildFlexibleSearchFilter(q);

    // Search in bookings first (for vehicle / token / mobile lookup)
    const bookings = await Booking.find(searchFilter)
      .populate('parkingLotId')
      .populate('slotId')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    if (bookings.length > 0) {
      const mapped = bookings.map(mapBookingToRecord);
      return res.json({
        success: true,
        count: mapped.length,
        data: mapped,
      });
    }

    // If no vehicles found, fallback to location search
    req.query.search = q;
    return parkingController.getParkingLots(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Parking history (compatibility with old prototype and unified search)
router.get('/history', optionalAuth, async (req, res, next) => {
  try {
    const { status, query, search } = req.query;
    const q = query || search;
    let filter = {};

    if (req.user && req.user.role === 'COMMUTER') {
      filter.userId = req.user._id;
    } else if (req.user && req.user.role === 'OWNER') {
      filter.ownerId = req.user._id;
    }

    if (status) {
      if (status === 'PARKED' || status === 'ACTIVE') {
        filter.bookingStatus = { $in: ['ACTIVE', 'CONFIRMED'] };
      } else if (status === 'EXITED' || status === 'COMPLETED') {
        filter.bookingStatus = 'COMPLETED';
      } else {
        filter.bookingStatus = status;
      }
    }

    if (q && q.trim()) {
      const flex = buildFlexibleSearchFilter(q);
      if (flex) {
        filter = { ...filter, ...flex };
      }
    }

    const bookings = await Booking.find(filter)
      .populate('parkingLotId', 'name address city pricePerDay pricePerHour')
      .populate('slotId', 'slotNumber vehicleType')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    const mapped = bookings.map(mapBookingToRecord);

    res.json({
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (err) {
    next(err);
  }
});

// Single lot by ID
router.get('/:id', parkingController.getParkingLotById);

// Real-time slots for a lot
router.get('/:id/slots', parkingController.getSlots);

// Nearby alternatives within 3 km when full
router.get('/:id/alternatives', parkingController.getNearbyAlternatives);

// Add slots to lot
router.post('/:id/slots', protect, authorize('OWNER', 'ADMIN'), parkingController.addSlots);

// Vehicle Exit endpoint (compatibility with old prototype)
router.post('/:id/exit', optionalAuth, bookingController.checkOut);

// Time simulation for demo testing (preserving duration & long stay test)
router.post('/:id/simulate-time', async (req, res, next) => {
  try {
    const { addedDays = 1 } = req.body;
    const booking = await Booking.findOne({
      $or: [{ bookingId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const currentStart = new Date(booking.startTime || booking.createdAt);
    currentStart.setDate(currentStart.getDate() - Number(addedDays));
    booking.startTime = currentStart;
    booking.durationHours = (booking.durationHours || 1) + Number(addedDays) * 24;
    booking.amount = (booking.amount || 20) + Number(addedDays) * 50;
    await booking.save();

    res.json({
      success: true,
      message: `Simulated +${addedDays} day(s) for booking ${booking.bookingId}`,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
});

// Main CRUD for Parking Lots
router.get('/', parkingController.getParkingLots);
router.post('/', protect, authorize('OWNER', 'ADMIN'), parkingController.createParkingLot);
router.put('/:id', protect, authorize('OWNER', 'ADMIN'), parkingController.updateParkingLot);
router.delete('/:id', protect, authorize('OWNER', 'ADMIN'), parkingController.deleteParkingLot);

module.exports = router;
