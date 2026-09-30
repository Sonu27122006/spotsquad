const ParkingLot = require('../models/ParkingLot');
const ParkingSlot = require('../models/ParkingSlot');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

// Haversine distance calculator in kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// @desc    Get all parking locations (with search & nearby geo-calculation)
// @route   GET /api/parking
// @access  Public
exports.getParkingLots = async (req, res, next) => {
  try {
    const { search, city, lat, lng, radius, status } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'INACTIVE' };
    }

    if (city) {
      query.city = new RegExp(city, 'i');
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { address: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }

    let lots = await ParkingLot.find(query).populate('ownerId', 'name email phone').lean();

    // If user provided latitude and longitude, calculate distance and sort
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxRadius = radius ? parseFloat(radius) : 50; // default 50km

      lots = lots
        .map((lot) => {
          const distance = calculateDistanceKm(userLat, userLng, lot.latitude, lot.longitude);
          return { ...lot, distanceKm: distance };
        })
        .filter((lot) => isNaN(maxRadius) || lot.distanceKm <= maxRadius)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    // Ensure real-time slot counts are accurate
    const lotsWithRealtimeSlots = await Promise.all(
      lots.map(async (lot) => {
        const total = await ParkingSlot.countDocuments({ parkingLotId: lot._id });
        const available = await ParkingSlot.countDocuments({
          parkingLotId: lot._id,
          status: 'AVAILABLE',
        });
        const occupied = await ParkingSlot.countDocuments({
          parkingLotId: lot._id,
          status: 'OCCUPIED',
        });
        const reserved = await ParkingSlot.countDocuments({
          parkingLotId: lot._id,
          status: 'RESERVED',
        });

        return {
          ...lot,
          totalSlots: total || lot.totalSlots,
          availableSlots: available,
          occupiedSlots: occupied,
          reservedSlots: reserved,
        };
      })
    );

    res.json({
      success: true,
      count: lotsWithRealtimeSlots.length,
      data: lotsWithRealtimeSlots,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single parking location
// @route   GET /api/parking/:id
// @access  Public
exports.getParkingLotById = async (req, res, next) => {
  try {
    const lot = await ParkingLot.findById(req.params.id).populate('ownerId', 'name email phone').lean();
    if (!lot) {
      return res.status(404).json({ success: false, message: 'Parking location not found' });
    }

    const total = await ParkingSlot.countDocuments({ parkingLotId: lot._id });
    const available = await ParkingSlot.countDocuments({ parkingLotId: lot._id, status: 'AVAILABLE' });
    const occupied = await ParkingSlot.countDocuments({ parkingLotId: lot._id, status: 'OCCUPIED' });
    const reserved = await ParkingSlot.countDocuments({ parkingLotId: lot._id, status: 'RESERVED' });

    res.json({
      success: true,
      data: {
        ...lot,
        totalSlots: total || lot.totalSlots,
        availableSlots: available,
        occupiedSlots: occupied,
        reservedSlots: reserved,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create parking location & initialize slots
// @route   POST /api/parking
// @access  Private (Owner / Admin)
exports.createParkingLot = async (req, res, next) => {
  try {
    // Branch 1: Operator Drive-in Entry (Backward Compatibility with NewParkingEntry)
    if (req.body.vehicleNumber) {
      const {
        vehicleNumber,
        customerName,
        mobileNumber,
        vehicleType = 'TWO_WHEELER',
        parkingSlot: requestedSlot,
        customDailyRate,
      } = req.body;

      if (!vehicleNumber || vehicleNumber.trim().length < 4) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid vehicle registration number.',
        });
      }

      // Requirement 1: Required Mobile Number with 10-digit Indian validation (starts with 6-9)
      const cleanMobile = (mobileNumber || '').replace(/[^0-9]/g, '');
      if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit mobile number (starts with 6, 7, 8, or 9).',
        });
      }

      // Find first active lot or default lot
      let lot = await ParkingLot.findOne({ status: 'ACTIVE' });
      if (!lot) {
        lot = await ParkingLot.findOne();
      }

      // Find available slot in lot
      let slot = null;
      if (requestedSlot && requestedSlot !== 'Auto-Assign' && requestedSlot !== 'General Bay') {
        slot = await ParkingSlot.findOne({
          parkingLotId: lot?._id,
          slotNumber: requestedSlot.toUpperCase().trim(),
          status: 'AVAILABLE',
        });
      }
      if (!slot && lot) {
        slot = await ParkingSlot.findOne({
          parkingLotId: lot._id,
          status: 'AVAILABLE',
        });
      }

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let rand = '';
      for (let i = 0; i < 5; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
      const bookingId = `PK-${new Date().getFullYear()}-${rand}`;
      const crypto = require('crypto');
      const qrToken = `QR-PASS-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      const now = new Date();
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dailyRateVal = Number(customDailyRate || lot?.pricePerDay || 20);
      const isPaid = req.body.paymentStatus === 'PAID';

      const booking = await Booking.create({
        bookingId,
        userId: req.user ? req.user._id : (lot ? lot.ownerId : null),
        ownerId: lot ? lot.ownerId : (req.user ? req.user._id : null),
        parkingLotId: lot ? lot._id : null,
        slotId: slot ? slot._id : null,
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        vehicleType: vehicleType.toUpperCase().includes('FOUR') ? 'FOUR_WHEELER' : 'TWO_WHEELER',
        customerName: customerName || 'Walk-in Commuter',
        customerPhone: cleanMobile,
        bookingDate: now,
        startTime: now,
        endTime: endTime,
        durationHours: 24,
        amount: dailyRateVal,
        paidAmount: isPaid ? dailyRateVal : 0,
        paymentStatus: isPaid ? 'PAID' : 'PENDING',
        bookingStatus: 'ACTIVE',
        checkInTime: now,
        qrToken,
        paymentMethod: isPaid ? (req.body.paymentMethod || 'CASH') : 'RAZORPAY',
        transactionId: isPaid ? (req.body.transactionId || `CASH_${Date.now()}`) : '',
      });

      if (slot) {
        slot.status = 'OCCUPIED';
        slot.currentBookingId = booking._id;
        await slot.save();
      }

      if (lot) {
        const avail = await ParkingSlot.countDocuments({ parkingLotId: lot._id, status: 'AVAILABLE' });
        lot.availableSlots = avail;
        await lot.save();
      }

      const amountDue = Math.max(0, dailyRateVal - booking.paidAmount);

      return res.status(201).json({
        success: true,
        message: 'Vehicle parked successfully.',
        data: {
          id: booking.bookingId,
          parkingId: booking.bookingId,
          tokenId: booking.bookingId,
          bookingId: booking.bookingId,
          qrToken: booking.qrToken,
          vehicleNumber: booking.vehicleNumber,
          customerName: booking.customerName,
          mobile: booking.customerPhone,
          mobileNumber: booking.customerPhone,
          customerPhone: booking.customerPhone,
          parkingBay: slot ? slot.slotNumber : 'General Bay',
          parkingSlot: slot ? slot.slotNumber : 'General Bay',
          entryTime: booking.checkInTime,
          dailyRate: dailyRateVal,
          totalAmount: dailyRateVal,
          paidAmount: booking.paidAmount,
          amountDue,
          paymentStatus: booking.paymentStatus,
          vehicleStatus: 'PARKED',
          status: 'PARKED',
        },
      });
    }

    // Branch 2: Create New Parking Location
    const {
      name,
      description,
      address,
      city,
      latitude,
      longitude,
      totalSlots = 20,
      pricePerHour = 10,
      pricePerDay = 50,
      operatingHours = '24/7',
      amenities,
      imageUrl,
    } = req.body;

    if (!name || !address || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, address, latitude, and longitude are required.',
      });
    }

    const ownerId = req.user.role === 'ADMIN' && req.body.ownerId ? req.body.ownerId : req.user._id;

    const lot = await ParkingLot.create({
      name: name.trim(),
      description: description || '',
      address: address.trim(),
      city: city || 'Coimbatore',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      ownerId,
      totalSlots: parseInt(totalSlots, 10),
      availableSlots: parseInt(totalSlots, 10),
      pricePerHour: parseFloat(pricePerHour),
      pricePerDay: parseFloat(pricePerDay),
      operatingHours: operatingHours || '24/7',
      amenities: amenities || ['CCTV Surveillance', '24/7 Guard', 'Covered Bay', 'EV Charging'],
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
    });

    // Auto-generate parking slots for this lot (e.g. A-01, A-02...)
    const slotsCount = parseInt(totalSlots, 10);
    const slotsToCreate = [];
    const letters = ['A', 'B', 'C', 'D', 'E'];

    for (let i = 0; i < slotsCount; i++) {
      const section = letters[Math.floor(i / 10)] || 'A';
      const num = String((i % 10) + 1).padStart(2, '0');
      const slotNum = `${section}-${num}`;
      
      let vType = 'TWO_WHEELER';
      if (i >= slotsCount - 2) vType = 'EV';
      else if (i >= slotsCount - 6) vType = 'FOUR_WHEELER';

      slotsToCreate.push({
        slotNumber: slotNum,
        parkingLotId: lot._id,
        vehicleType: vType,
        isEVChargingSlot: vType === 'EV',
        status: 'AVAILABLE',
        floor: section === 'A' || section === 'B' ? 'Ground Floor' : 'Level 1',
      });
    }

    await ParkingSlot.insertMany(slotsToCreate);

    res.status(201).json({
      success: true,
      message: 'Parking location created successfully with slots.',
      data: lot,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update parking location
// @route   PUT /api/parking/:id
// @access  Private (Owner / Admin)
exports.updateParkingLot = async (req, res, next) => {
  try {
    let lot = await ParkingLot.findById(req.params.id);
    if (!lot) {
      return res.status(404).json({ success: false, message: 'Parking location not found' });
    }

    // Ensure user owns this lot or is Admin
    if (req.user.role !== 'ADMIN' && lot.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this parking location' });
    }

    lot = await ParkingLot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Parking location updated.',
      data: lot,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete parking location
// @route   DELETE /api/parking/:id
// @access  Private (Owner / Admin)
exports.deleteParkingLot = async (req, res, next) => {
  try {
    const lot = await ParkingLot.findById(req.params.id);
    if (!lot) {
      return res.status(404).json({ success: false, message: 'Parking location not found' });
    }

    if (req.user.role !== 'ADMIN' && lot.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this parking location' });
    }

    await ParkingSlot.deleteMany({ parkingLotId: lot._id });
    await ParkingLot.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Parking location and associated slots removed.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get real-time slots for a parking location with schedule-awareness
// @route   GET /api/parking/:id/slots
// @access  Public
exports.getSlots = async (req, res, next) => {
  try {
    const { startTime, endTime, vehicleType, isEVCharging, evOnly } = req.query;
    const filter = { parkingLotId: req.params.id };

    if (vehicleType) {
      filter.vehicleType = vehicleType;
    }
    const requireEV = isEVCharging === 'true' || evOnly === 'true';
    if (requireEV) {
      filter.isEVChargingSlot = true;
    }

    const slots = await ParkingSlot.find(filter).sort({ slotNumber: 1 }).lean();

    // If time window is specified, dynamically determine each slot's availability
    if (startTime && endTime) {
      const requestedStart = new Date(startTime);
      const requestedEnd = new Date(endTime);

      // Find all overlapping active/confirmed bookings
      const overlappingBookings = await Booking.find({
        parkingLotId: req.params.id,
        bookingStatus: { $in: ['CONFIRMED', 'ACTIVE'] },
        $or: [
          { startTime: { $lt: requestedEnd }, endTime: { $gt: requestedStart } },
        ],
      }).select('slotId bookingStatus vehicleNumber startTime endTime');

      const bookedSlotMap = {};
      overlappingBookings.forEach((b) => {
        bookedSlotMap[b.slotId.toString()] = b;
      });

      let dynamicSlots = slots.map((slot) => {
        if (slot.status === 'MAINTENANCE') {
          return slot;
        }
        const activeBooking = bookedSlotMap[slot._id.toString()];
        if (activeBooking) {
          return {
            ...slot,
            status: activeBooking.bookingStatus === 'ACTIVE' ? 'OCCUPIED' : 'RESERVED',
            currentBooking: activeBooking,
          };
        }
        return {
          ...slot,
          status: 'AVAILABLE',
        };
      });

      // When EV charging only is enabled, show only available EV charging slots
      if (requireEV) {
        dynamicSlots = dynamicSlots.filter((slot) => slot.isEVChargingSlot && slot.status === 'AVAILABLE');
      }

      return res.json({
        success: true,
        count: dynamicSlots.length,
        data: dynamicSlots,
      });
    }

    let finalSlots = slots;
    if (requireEV) {
      finalSlots = slots.filter((slot) => slot.isEVChargingSlot && slot.status === 'AVAILABLE');
    }

    res.json({
      success: true,
      count: finalSlots.length,
      data: finalSlots,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add slots to a parking location
// @route   POST /api/parking/:id/slots
// @access  Private (Owner / Admin)
exports.addSlots = async (req, res, next) => {
  try {
    const { slots } = req.body; // array of { slotNumber, vehicleType, floor, isEVChargingSlot }
    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of slots to add' });
    }

    const lot = await ParkingLot.findById(req.params.id);
    if (!lot) {
      return res.status(404).json({ success: false, message: 'Parking location not found' });
    }

    if (req.user.role !== 'ADMIN' && lot.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const slotsToInsert = slots.map((s) => ({
      slotNumber: s.slotNumber.toUpperCase().trim(),
      parkingLotId: lot._id,
      vehicleType: s.vehicleType || 'TWO_WHEELER',
      isEVChargingSlot: Boolean(s.isEVChargingSlot || s.vehicleType === 'EV'),
      status: 'AVAILABLE',
      floor: s.floor || 'Ground Floor',
    }));

    await ParkingSlot.insertMany(slotsToInsert);

    // Update total slots
    const total = await ParkingSlot.countDocuments({ parkingLotId: lot._id });
    const available = await ParkingSlot.countDocuments({ parkingLotId: lot._id, status: 'AVAILABLE' });
    lot.totalSlots = total;
    lot.availableSlots = available;
    await lot.save();

    res.status(201).json({
      success: true,
      message: `${slotsToInsert.length} slots added successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update single slot status (e.g., MAINTENANCE, EV charging)
// @route   PUT /api/slots/:id
// @access  Private (Owner / Admin)
exports.updateSlot = async (req, res, next) => {
  try {
    const { status, vehicleType, floor, isEVChargingSlot } = req.body;
    const slot = await ParkingSlot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    if (status !== undefined) slot.status = status;
    if (vehicleType !== undefined) slot.vehicleType = vehicleType;
    if (floor !== undefined) slot.floor = floor;
    if (isEVChargingSlot !== undefined) slot.isEVChargingSlot = Boolean(isEVChargingSlot);

    await slot.save();

    // Recalculate available slots for the lot
    const available = await ParkingSlot.countDocuments({
      parkingLotId: slot.parkingLotId,
      status: 'AVAILABLE',
    });
    await ParkingLot.findByIdAndUpdate(slot.parkingLotId, { availableSlots: available });

    res.json({
      success: true,
      message: 'Slot updated successfully',
      data: slot,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get nearby parking alternatives within 3 km when a lot is full
// @route   GET /api/parking/:id/alternatives
// @access  Public
exports.getNearbyAlternatives = async (req, res, next) => {
  try {
    const lot = await ParkingLot.findById(req.params.id);
    if (!lot) {
      return res.status(404).json({ success: false, message: 'Parking location not found' });
    }

    const { latitude, longitude } = lot;
    if (latitude == null || longitude == null) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'No nearby parking alternatives available within 3 km.',
      });
    }

    // Find other active parking lots with available slots > 0
    const otherLots = await ParkingLot.find({
      _id: { $ne: lot._id },
      status: { $ne: 'INACTIVE' },
      availableSlots: { $gt: 0 },
    }).lean();

    const alternatives = [];
    for (const other of otherLots) {
      if (other.latitude != null && other.longitude != null) {
        const dist = calculateDistanceKm(latitude, longitude, other.latitude, other.longitude);
        if (dist <= 3.0) {
          alternatives.push({
            ...other,
            distanceKm: dist,
          });
        }
      }
    }

    // Sort by nearest distance first
    alternatives.sort((a, b) => a.distanceKm - b.distanceKm);

    if (alternatives.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'No nearby parking alternatives available within 3 km.',
      });
    }

    res.json({
      success: true,
      count: alternatives.length,
      data: alternatives,
      message: `Found ${alternatives.length} nearby alternative parking location(s) within 3 km.`,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get active parking sessions (compatibility with old prototype)
// @route   GET /api/parking/active
// @access  Public / Private
exports.getActiveParking = async (req, res, next) => {
  try {
    let filter = { bookingStatus: { $in: ['ACTIVE', 'CONFIRMED'] } };

    // If owner logged in, filter by their parking lots
    if (req.user && req.user.role === 'OWNER') {
      filter.ownerId = req.user._id;
    }

    const bookings = await Booking.find(filter)
      .populate('parkingLotId', 'name address city pricePerHour pricePerDay')
      .populate('slotId', 'slotNumber vehicleType')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    // Map to structure compatible with previous frontend
    const mapped = bookings.map((b) => ({
      _id: b._id,
      parkingId: b.bookingId,
      tokenId: b.bookingId,
      qrToken: b.qrToken,
      vehicleNumber: b.vehicleNumber,
      vehicleType: b.vehicleType,
      customerName: b.customerName || b.userId?.name || 'Customer',
      mobile: b.customerPhone || b.userId?.phone || '',
      parkingBay: b.slotId?.slotNumber || 'Slot',
      parkingSlot: b.slotId?.slotNumber || 'Slot',
      parkingLotName: b.parkingLotId?.name || 'Parking Location',
      entryTime: b.checkInTime || b.startTime,
      startTime: b.startTime,
      endTime: b.endTime,
      vehicleStatus: b.bookingStatus === 'ACTIVE' ? 'PARKED' : 'CONFIRMED',
      status: b.bookingStatus === 'ACTIVE' ? 'PARKED' : 'CONFIRMED',
      dailyRate: b.parkingLotId?.pricePerDay || 50,
      hourlyRate: b.parkingLotId?.pricePerHour || 10,
      currentAmount: b.amount,
      finalAmount: b.amount,
      paymentStatus: b.paymentStatus,
      paymentMethod: b.paymentMethod,
    }));

    res.json({
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get public parking pass by token or bookingId
// @route   GET /api/parking/pass/:id
// @access  Public
exports.getPublicPass = async (req, res, next) => {
  try {
    const id = (req.params.id || '').trim();
    const cleanAlphaNum = id.replace(/[^a-zA-Z0-9]/g, '');
    const flexiblePattern = cleanAlphaNum.length >= 3 ? cleanAlphaNum.split('').join('[\\s\\-]*') : id;

    const booking = await Booking.findOne({
      $or: [
        { bookingId: id },
        { bookingId: new RegExp(`^${flexiblePattern}$`, 'i') },
        { qrToken: id },
        { vehicleNumber: new RegExp(`^${flexiblePattern}$`, 'i') },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ].filter(Boolean),
    })
      .populate('parkingLotId')
      .populate('slotId')
      .populate('userId', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `Digital Parking Pass not found for reference '${id}'.`,
      });
    }

    // Check duration
    const now = new Date();
    const start = new Date(booking.checkInTime || booking.startTime);
    const durationHours = Math.max(1, (now.getTime() - start.getTime()) / (1000 * 60 * 60));
    const isOverOneDay = durationHours > 24;

    const totalAmount = Number(booking.amount || 20);
    const rawPaid = Number(booking.paidAmount || 0);

    // ONE RELIABLE SOURCE OF TRUTH:
    // A booking is ONLY considered PAID if paidAmount >= totalAmount AND paidAmount > 0 AND paymentStatus === 'PAID'
    const isPaid = (booking.paymentStatus === 'PAID' && rawPaid >= totalAmount && rawPaid > 0);
    const paidAmount = isPaid ? totalAmount : rawPaid;
    const amountDue = isPaid ? 0 : Math.max(0, totalAmount - paidAmount);
    const authoritativePaymentStatus = isPaid ? 'PAID' : 'PENDING';
    const authoritativeTransactionId = isPaid ? (booking.transactionId || '') : '';

    // Dynamic UPI payment URI for dynamic Scan to Pay QR
    const upiPayUri = amountDue > 0
      ? `upi://pay?pa=${encodeURIComponent(process.env.UPI_ID || 'smartparking@upi')}&pn=${encodeURIComponent(process.env.MERCHANT_NAME || 'ParkingSpot')}&am=${amountDue.toFixed(2)}&tn=${encodeURIComponent(`Parking Fee ${booking.bookingId}`)}`
      : '';

    const passData = {
      _id: booking._id,
      parkingId: booking.bookingId,
      tokenId: booking.bookingId,
      bookingId: booking.bookingId,
      qrToken: booking.qrToken,
      vehicleNumber: booking.vehicleNumber,
      vehicleType: booking.vehicleType,
      customerName: booking.customerName || booking.userId?.name || 'Customer',
      mobile: booking.customerPhone || booking.userId?.phone || '',
      mobileNumber: booking.customerPhone || booking.userId?.phone || '',
      customerPhone: booking.customerPhone || booking.userId?.phone || '',
      parkingBay: booking.slotId?.slotNumber || 'A-01',
      parkingSlot: booking.slotId?.slotNumber || 'A-01',
      parkingLotName: booking.parkingLotId?.name || 'ParkingSpot Hub',
      parkingLotAddress: booking.parkingLotId?.address || '',
      entryTime: booking.checkInTime || booking.startTime,
      startTime: booking.startTime,
      endTime: booking.endTime,
      exitTime: booking.checkOutTime,
      vehicleStatus: booking.bookingStatus === 'COMPLETED' ? 'EXITED' : 'PARKED',
      status: booking.bookingStatus === 'COMPLETED' ? 'EXITED' : 'PARKED',
      durationDays: Math.ceil(durationHours / 24),
      durationHours: Number(durationHours.toFixed(1)),
      isOverOneDay,
      dailyRate: booking.parkingLotId?.pricePerDay || 20,
      hourlyRate: booking.parkingLotId?.pricePerHour || 10,
      totalAmount,
      paidAmount,
      amountDue,
      currentAmount: totalAmount,
      finalAmount: totalAmount,
      paymentStatus: authoritativePaymentStatus,
      paymentMethod: booking.paymentMethod || 'RAZORPAY',
      transactionId: authoritativeTransactionId,
      upiPayUri,
      paymentLink: booking.paymentLink || '',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_parkingspot_demo',
    };

    res.json({
      success: true,
      data: passData,
    });
  } catch (err) {
    next(err);
  }
};
