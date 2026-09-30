const Booking = require('../models/Booking');
const ParkingLot = require('../models/ParkingLot');
const ParkingSlot = require('../models/ParkingSlot');
const Notification = require('../models/Notification');
const crypto = require('crypto');

// Generate unique booking ID (e.g. PK-2026-X9B2F)
function generateBookingId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PK-${new Date().getFullYear()}-${rand}`;
}

// Generate unique QR token
function generateQrToken() {
  return `QR-PASS-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

// @desc    Create a new booking/reservation with double-booking prevention
// @route   POST /api/bookings
// @access  Private (Commuter / Admin)
exports.createBooking = async (req, res, next) => {
  try {
    const {
      parkingLotId,
      slotId,
      vehicleNumber,
      vehicleType = 'TWO_WHEELER',
      customerName,
      customerPhone,
      startTime,
      endTime,
      durationHours,
    } = req.body;

    if (!parkingLotId || !slotId || !vehicleNumber || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Parking lot, slot, vehicle number, start time, and end time are required.',
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start or end date/time format.',
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time.',
      });
    }

    // Verify Parking Lot exists
    const lot = await ParkingLot.findById(parkingLotId);
    if (!lot) {
      return res.status(404).json({ success: false, message: 'Parking location not found' });
    }

    // Verify Slot exists and belongs to this lot
    const slot = await ParkingSlot.findOne({ _id: slotId, parkingLotId });
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Parking slot not found in this lot' });
    }

    if (slot.status === 'MAINTENANCE') {
      return res.status(400).json({
        success: false,
        message: `Slot ${slot.slotNumber} is currently under maintenance. Please choose another slot.`,
      });
    }

    // =========================================================================
    // CRITICAL: Prevent Double Booking (Backend Validation for Overlapping Slots)
    // Overlap condition: (existing.startTime < new.endTime) AND (existing.endTime > new.startTime)
    // =========================================================================
    const overlappingBooking = await Booking.findOne({
      slotId,
      bookingStatus: { $in: ['CONFIRMED', 'ACTIVE'] },
      $or: [
        {
          startTime: { $lt: end },
          endTime: { $gt: start },
        },
      ],
    });

    if (overlappingBooking) {
      return res.status(409).json({
        success: false,
        message: `Slot ${slot.slotNumber} is already booked for the selected time range (${new Date(overlappingBooking.startTime).toLocaleTimeString()} - ${new Date(overlappingBooking.endTime).toLocaleTimeString()}). Please choose another slot or time.`,
      });
    }

    // Calculate duration in hours
    const calcHours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
    const hours = durationHours ? Math.max(1, parseInt(durationHours, 10)) : calcHours;

    // Calculate pricing (hourly or daily)
    let amount = 0;
    if (hours >= 24) {
      const days = Math.ceil(hours / 24);
      amount = days * (lot.pricePerDay || 50);
    } else {
      amount = hours * (lot.pricePerHour || 10);
    }

    // Validate mobile number and customer name
    const cleanMobile = (customerPhone || req.body.mobileNumber || req.user.phone || '').replace(/[^0-9]/g, '');
    if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).',
      });
    }

    const cName = (customerName || req.user.name || 'Commuter').trim();
    if (!cName || cName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid customer name.',
      });
    }

    // Generate unique booking ID and QR token
    let bookingId = generateBookingId();
    while (await Booking.findOne({ bookingId })) {
      bookingId = generateBookingId();
    }
    const qrToken = generateQrToken();

    // Create the booking record with authoritative PENDING payment state
    const booking = await Booking.create({
      bookingId,
      userId: req.user._id,
      ownerId: lot.ownerId,
      parkingLotId: lot._id,
      slotId: slot._id,
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      vehicleType,
      customerName: cName,
      customerPhone: cleanMobile,
      bookingDate: new Date(),
      startTime: start,
      endTime: end,
      durationHours: hours,
      amount,
      paidAmount: 0,
      paymentStatus: 'PENDING',
      bookingStatus: 'CONFIRMED',
      qrToken,
      paymentMethod: 'RAZORPAY',
      transactionId: '',
    });

    // Update slot status to RESERVED if booking is starting soon or immediately
    const now = new Date();
    if (start <= now && end > now) {
      slot.status = 'RESERVED';
      slot.currentBookingId = booking._id;
      await slot.save();
    }

    // Recalculate available slots for the lot
    const availableCount = await ParkingSlot.countDocuments({
      parkingLotId: lot._id,
      status: 'AVAILABLE',
    });
    lot.availableSlots = availableCount;
    await lot.save();

    // Create user notification
    await Notification.create({
      userId: req.user._id,
      title: 'Parking Slot Reserved!',
      message: `Your booking ${booking.bookingId} for slot ${slot.slotNumber} at ${lot.name} is confirmed.`,
      type: 'BOOKING',
      link: `/pass/${booking.bookingId}`,
    });

    // Create owner notification
    await Notification.create({
      userId: lot.ownerId,
      title: 'New Reservation Received',
      message: `New reservation ${booking.bookingId} for vehicle ${booking.vehicleNumber} at ${slot.slotNumber}.`,
      type: 'BOOKING',
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('parkingLotId', 'name address city latitude longitude pricePerHour pricePerDay')
      .populate('slotId', 'slotNumber vehicleType floor')
      .populate('userId', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Slot successfully reserved.',
      data: populatedBooking,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get bookings (role-aware: commuter gets theirs, owner gets for their lots, admin gets all)
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res, next) => {
  try {
    const { status, parkingLotId } = req.query;
    let query = {};

    if (req.user.role === 'COMMUTER') {
      query.userId = req.user._id;
    } else if (req.user.role === 'OWNER') {
      query.ownerId = req.user._id;
    } // ADMIN gets all bookings

    if (status) {
      if (status === 'UPCOMING') {
        query.bookingStatus = 'CONFIRMED';
        query.startTime = { $gt: new Date() };
      } else if (status === 'ACTIVE') {
        query.bookingStatus = { $in: ['ACTIVE', 'CONFIRMED'] };
      } else {
        query.bookingStatus = status;
      }
    }

    if (parkingLotId) {
      query.parkingLotId = parkingLotId;
    }

    const bookings = await Booking.find(query)
      .populate('parkingLotId', 'name address city pricePerHour pricePerDay latitude longitude')
      .populate('slotId', 'slotNumber vehicleType floor')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single booking by ID or bookingId
// @route   GET /api/bookings/:id
// @access  Public / Private
exports.getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let booking = await Booking.findOne({
      $or: [{ bookingId: id }, { qrToken: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    })
      .populate('parkingLotId')
      .populate('slotId')
      .populate('userId', 'name email phone');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel a booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Commuter / Admin)
exports.cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const { id } = req.params;

    const booking = await Booking.findOne({
      $or: [{ bookingId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check ownership
    if (req.user.role !== 'ADMIN' && booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    if (booking.bookingStatus === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
    }

    if (booking.bookingStatus === 'COMPLETED' || booking.bookingStatus === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking that is already ${booking.bookingStatus}. Please complete exit instead.`,
      });
    }

    // Update booking status
    booking.bookingStatus = 'CANCELLED';
    booking.cancellationReason = reason || 'Cancelled by user';
    booking.refundAmount = booking.amount; // 100% refund on pre-cancellation
    if (booking.paymentStatus === 'PAID') {
      booking.paymentStatus = 'REFUNDED';
    }
    await booking.save();

    // Release slot
    await ParkingSlot.findByIdAndUpdate(booking.slotId, {
      status: 'AVAILABLE',
      currentBookingId: null,
    });

    // Update lot availability
    const available = await ParkingSlot.countDocuments({
      parkingLotId: booking.parkingLotId,
      status: 'AVAILABLE',
    });
    await ParkingLot.findByIdAndUpdate(booking.parkingLotId, { availableSlots: available });

    // Send notification
    await Notification.create({
      userId: booking.userId,
      title: 'Booking Cancelled',
      message: `Your booking ${booking.bookingId} was cancelled. Refund of ₹${booking.refundAmount} has been processed.`,
      type: 'ALERT',
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully and refund initiated.',
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Check-in vehicle (Session start: RESERVED -> OCCUPIED)
// @route   POST /api/bookings/:id/checkin
// @access  Private (Commuter / Owner / Admin)
exports.checkIn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({
      $or: [{ bookingId: id }, { qrToken: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.bookingStatus === 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Vehicle is already checked in.' });
    }

    booking.bookingStatus = 'ACTIVE';
    booking.checkInTime = new Date();
    await booking.save();

    await ParkingSlot.findByIdAndUpdate(booking.slotId, {
      status: 'OCCUPIED',
      currentBookingId: booking._id,
    });

    // Recalculate available slots
    const available = await ParkingSlot.countDocuments({
      parkingLotId: booking.parkingLotId,
      status: 'AVAILABLE',
    });
    await ParkingLot.findByIdAndUpdate(booking.parkingLotId, { availableSlots: available });

    res.json({
      success: true,
      message: 'Vehicle checked in successfully. Slot status is now OCCUPIED.',
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Check-out / Exit vehicle (Session end: OCCUPIED -> AVAILABLE)
// @route   POST /api/bookings/:id/checkout, POST /api/parking/:id/exit
// @access  Private / Operator / Public
exports.checkOut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'CASH', transactionId, finalAmount } = req.body;

    const booking = await Booking.findOne({
      $or: [{ bookingId: id }, { qrToken: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    })
      .populate('parkingLotId')
      .populate('slotId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Parking session not found.' });
    }

    // Prevent duplicate exit
    if (booking.bookingStatus === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `Vehicle ${booking.vehicleNumber} has already completed exit settlement and exited the facility.`,
      });
    }

    const checkIn = new Date(booking.checkInTime || booking.startTime || booking.createdAt);
    const checkOutTime = new Date();
    const diffHours = Math.max(0.1, (checkOutTime.getTime() - checkIn.getTime()) / (1000 * 60 * 60));
    const dailyRate = Number(booking.parkingLotId?.pricePerDay || 20);
    const durationDays = Math.max(1, Math.ceil(diffHours / 24));
    
    // Dynamic final amount calculation
    const calculatedAmount = Number(finalAmount !== undefined && finalAmount !== null
      ? finalAmount
      : (durationDays * dailyRate));

    const methodUpper = (paymentMethod || 'CASH').toUpperCase();
    const payRef = transactionId && transactionId.trim()
      ? transactionId.trim()
      : `${methodUpper}_${Date.now().toString().slice(-8)}`;

    booking.amount = calculatedAmount;
    booking.paidAmount = calculatedAmount;
    booking.paymentStatus = 'PAID';
    booking.bookingStatus = 'COMPLETED';
    booking.checkOutTime = checkOutTime;
    booking.paymentMethod = methodUpper;
    booking.transactionId = payRef;
    await booking.save();

    // Release parking slot
    if (booking.slotId) {
      await ParkingSlot.findByIdAndUpdate(booking.slotId._id || booking.slotId, {
        status: 'AVAILABLE',
        currentBookingId: null,
      });
    }

    // Update lot available slots
    const lotId = booking.parkingLotId?._id || booking.parkingLotId;
    if (lotId) {
      const available = await ParkingSlot.countDocuments({
        parkingLotId: lotId,
        status: 'AVAILABLE',
      });
      await ParkingLot.findByIdAndUpdate(lotId, {
        availableSlots: available,
      });
    }

    // Record Payment in database
    try {
      const Payment = require('../models/Payment');
      await Payment.create({
        bookingId: booking._id,
        userId: booking.userId || booking.ownerId,
        amount: calculatedAmount,
        currency: 'INR',
        gateway: methodUpper,
        orderId: `ORDER_EXIT_${Date.now()}`,
        paymentId: payRef,
        status: 'SUCCESS',
      });
    } catch (payErr) {
      console.warn('Payment record creation error in checkOut:', payErr.message);
    }

    // Create Notification
    try {
      const Notification = require('../models/Notification');
      if (booking.userId) {
        await Notification.create({
          userId: booking.userId,
          title: 'Vehicle Exited Facility',
          message: `Vehicle ${booking.vehicleNumber} successfully checked out. Fee paid: ₹${calculatedAmount}.`,
          type: 'PAYMENT',
          link: `/pass/${booking.bookingId}`,
        });
      }
    } catch (notifErr) {
      console.warn('Notification error in checkOut:', notifErr.message);
    }

    const formattedReceipt = {
      _id: booking._id,
      id: booking.bookingId,
      parkingId: booking.bookingId,
      tokenId: booking.bookingId,
      bookingId: booking.bookingId,
      vehicleNumber: booking.vehicleNumber,
      vehicleType: booking.vehicleType || 'TWO_WHEELER',
      customerName: booking.customerName || 'Customer',
      mobileNumber: booking.customerPhone || '',
      customerPhone: booking.customerPhone || '',
      parkingSlot: booking.slotId?.slotNumber || 'A-01',
      parkingBay: booking.slotId?.slotNumber || 'A-01',
      entryTime: booking.checkInTime || booking.startTime,
      exitTime: booking.checkOutTime,
      parkingDurationDays: durationDays,
      dailyRate: dailyRate,
      finalAmount: calculatedAmount,
      totalAmount: calculatedAmount,
      paidAmount: calculatedAmount,
      amountDue: 0,
      paymentStatus: 'PAID',
      paymentMethod: booking.paymentMethod,
      transactionId: booking.transactionId,
      status: 'PAID',
      vehicleStatus: 'EXITED',
      bookingStatus: 'COMPLETED',
      parkingLotName: booking.parkingLotId?.name || 'Central Bus Stand Parking Hub',
    };

    res.json({
      success: true,
      message: 'Vehicle exit completed and slot released.',
      data: formattedReceipt,
    });
  } catch (err) {
    next(err);
  }
};
