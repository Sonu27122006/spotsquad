const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { connectDB, closeDB } = require('../config/db');
const User = require('../models/User');
const ParkingLot = require('../models/ParkingLot');
const ParkingSlot = require('../models/ParkingSlot');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');

async function seedData() {
  try {
    console.log('[SEED] Connecting to database...');
    await connectDB();

    console.log('[SEED] Clearing old data...');
    await Promise.all([
      User.deleteMany({}),
      ParkingLot.deleteMany({}),
      ParkingSlot.deleteMany({}),
      Booking.deleteMany({}),
      Payment.deleteMany({}),
      Notification.deleteMany({}),
      Settings.deleteMany({}),
    ]);

    console.log('[SEED] Creating Users (ADMIN, OWNER, COMMUTER)...');
    const admin = await User.create({
      name: 'Platform Administrator',
      email: 'admin@parkingspot.com',
      password: 'admin123',
      role: 'ADMIN',
      phone: '+91 98765 00001',
      defaultVehicleNumber: 'TN 38 AA 1000',
    });

    const owner = await User.create({
      name: 'Kavitha Parking Operations',
      email: 'owner@parkingspot.com',
      password: 'owner123',
      role: 'OWNER',
      phone: '+91 98765 00002',
      defaultVehicleNumber: 'TN 38 BK 9021',
    });

    const commuter = await User.create({
      name: 'Vigash Commuter',
      email: 'commuter@parkingspot.com',
      password: 'commuter123',
      role: 'COMMUTER',
      phone: '+91 98765 43210',
      defaultVehicleNumber: 'TN 38 CM 2026',
      defaultVehicleType: 'TWO_WHEELER',
    });

    console.log('[SEED] Creating Parking Locations...');
    const lotsData = [
      {
        name: 'Gandhipuram Central Bus Stand Parking Complex',
        description: 'Prime 24/7 dedicated two-wheeler and commuter parking bay adjacent to the central bus terminal with fast automated entry.',
        address: 'Gandhipuram Bus Stand Road, Cross Cut Central, Coimbatore, Tamil Nadu 641012',
        city: 'Coimbatore',
        latitude: 11.0168,
        longitude: 76.9688,
        ownerId: owner._id,
        totalSlots: 20,
        availableSlots: 15,
        pricePerHour: 10,
        pricePerDay: 50,
        operatingHours: '24 Hours Open',
        amenities: ['CCTV Surveillance', '24/7 Security Guard', 'Covered Bay', 'EV Charging', 'Helmet Locker'],
        imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Coimbatore Junction Multi-Level Smart Parking',
        description: 'Multi-level parking structure right opposite Platform 1 entrance. Safe overnight parking for train travelers.',
        address: 'Railway Station Road, Gopalapuram, Coimbatore, Tamil Nadu 641018',
        city: 'Coimbatore',
        latitude: 10.9972,
        longitude: 76.9634,
        ownerId: owner._id,
        totalSlots: 20,
        availableSlots: 16,
        pricePerHour: 15,
        pricePerDay: 60,
        operatingHours: '24 Hours Open',
        amenities: ['CCTV Surveillance', 'Covered Bay', 'Fire Protection', 'Elevator Access'],
        imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Town Hall City Center Transit Hub',
        description: 'Rapid parking facility in the commercial heart of town hall, near bazaar and bus stops.',
        address: 'Opposite Clock Tower, Town Hall, Coimbatore, Tamil Nadu 641001',
        city: 'Coimbatore',
        latitude: 10.9935,
        longitude: 76.9592,
        ownerId: owner._id,
        totalSlots: 15,
        availableSlots: 12,
        pricePerHour: 10,
        pricePerDay: 40,
        operatingHours: '06:00 AM - 11:30 PM',
        amenities: ['CCTV Surveillance', 'Security Guard', 'Digital UPI Pass'],
        imageUrl: 'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'RS Puram High Street Parking Deck',
        description: 'Organized parking deck behind DB Road shopping district with automated QR ticketing and shade nets.',
        address: 'Diwan Bahadur Road, RS Puram, Coimbatore, Tamil Nadu 641002',
        city: 'Coimbatore',
        latitude: 11.0089,
        longitude: 76.9515,
        ownerId: owner._id,
        totalSlots: 15,
        availableSlots: 14,
        pricePerHour: 15,
        pricePerDay: 70,
        operatingHours: '08:00 AM - 11:00 PM',
        amenities: ['Covered Bay', 'CCTV Surveillance', 'Fast EV Charging Point'],
        imageUrl: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=700&q=80',
      },
      {
        name: 'Gandhipuram Express Bay (FULL - Demo)',
        description: 'Popular high-frequency express parking right at the bus stand entrance. Currently at 100% capacity.',
        address: 'Terminal Gate 1, Gandhipuram Central, Coimbatore, Tamil Nadu 641012',
        city: 'Coimbatore',
        latitude: 11.0175,
        longitude: 76.9692,
        ownerId: owner._id,
        totalSlots: 6,
        availableSlots: 0,
        pricePerHour: 12,
        pricePerDay: 55,
        operatingHours: '24 Hours Open',
        amenities: ['CCTV Surveillance', 'EV Charging', 'Express Turnstile'],
        imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=700&q=80',
      },
    ];

    const createdLots = await ParkingLot.insertMany(lotsData);
    console.log(`[SEED] Created ${createdLots.length} parking locations.`);

    console.log('[SEED] Creating Parking Slots for each location...');
    const allSlots = [];
    for (const lot of createdLots) {
      const letters = ['A', 'B'];
      for (let i = 0; i < lot.totalSlots; i++) {
        const section = letters[Math.floor(i / 10)] || 'A';
        const num = String((i % 10) + 1).padStart(2, '0');
        const slotNumber = `${section}-${num}`;
        let vType = 'TWO_WHEELER';
        let isEVChargingSlot = false;
        if (i >= lot.totalSlots - 2) {
          vType = 'EV';
          isEVChargingSlot = true;
        } else if (i >= lot.totalSlots - 5) {
          vType = 'FOUR_WHEELER';
        }

        const isFullLot = lot.availableSlots === 0;

        allSlots.push({
          slotNumber,
          parkingLotId: lot._id,
          vehicleType: vType,
          isEVChargingSlot,
          status: isFullLot ? 'OCCUPIED' : 'AVAILABLE',
          floor: section === 'A' ? 'Ground Floor' : 'Upper Deck',
        });
      }
    }

    const createdSlots = await ParkingSlot.insertMany(allSlots);
    console.log(`[SEED] Created ${createdSlots.length} parking slots.`);

    // Pick slots to mark as Occupied / Reserved for realistic demonstration
    const primeLot = createdLots[0];
    const primeSlots = createdSlots.filter((s) => s.parkingLotId.toString() === primeLot._id.toString());

    console.log('[SEED] Creating sample Bookings & Passes...');
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Active Parking Session (Checked-in)
    const booking1 = await Booking.create({
      bookingId: 'PK-2026-A101',
      userId: commuter._id,
      ownerId: owner._id,
      parkingLotId: primeLot._id,
      slotId: primeSlots[0]._id,
      vehicleNumber: 'TN 38 CM 2026',
      vehicleType: 'TWO_WHEELER',
      customerName: 'Vigash Commuter',
      customerPhone: '+91 98765 43210',
      bookingDate: twoHoursAgo,
      startTime: twoHoursAgo,
      endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      durationHours: 6,
      amount: 50,
      paymentStatus: 'PAID',
      bookingStatus: 'ACTIVE',
      checkInTime: twoHoursAgo,
      qrToken: 'QR-PASS-LIVE-DEMO-001',
      paymentMethod: 'UPI_QR',
      transactionId: 'UPI_TXN_77491028',
    });

    // Mark slot as OCCUPIED
    primeSlots[0].status = 'OCCUPIED';
    primeSlots[0].currentBookingId = booking1._id;
    await primeSlots[0].save();

    // 2. Upcoming Reservation (Confirmed)
    const booking2 = await Booking.create({
      bookingId: 'PK-2026-B202',
      userId: commuter._id,
      ownerId: owner._id,
      parkingLotId: primeLot._id,
      slotId: primeSlots[1]._id,
      vehicleNumber: 'TN 37 CL 4040',
      vehicleType: 'TWO_WHEELER',
      customerName: 'Suresh Kumar',
      customerPhone: '+91 98765 11223',
      bookingDate: now,
      startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 6 * 60 * 60 * 1000),
      durationHours: 4,
      amount: 40,
      paymentStatus: 'PAID',
      bookingStatus: 'CONFIRMED',
      qrToken: 'QR-PASS-LIVE-DEMO-002',
      paymentMethod: 'RAZORPAY',
      transactionId: 'pay_rzp_88492019',
    });

    primeSlots[1].status = 'RESERVED';
    primeSlots[1].currentBookingId = booking2._id;
    await primeSlots[1].save();

    // 3. Past Completed Booking
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    await Booking.create({
      bookingId: 'PK-2026-C303',
      userId: commuter._id,
      ownerId: owner._id,
      parkingLotId: primeLot._id,
      slotId: primeSlots[2]._id,
      vehicleNumber: 'TN 38 CM 2026',
      vehicleType: 'TWO_WHEELER',
      customerName: 'Vigash Commuter',
      customerPhone: '+91 98765 43210',
      bookingDate: threeDaysAgo,
      startTime: threeDaysAgo,
      endTime: twoDaysAgo,
      durationHours: 24,
      amount: 50,
      paymentStatus: 'PAID',
      bookingStatus: 'COMPLETED',
      checkInTime: threeDaysAgo,
      checkOutTime: twoDaysAgo,
      qrToken: 'QR-PASS-COMPLETED-003',
      paymentMethod: 'UPI_QR',
      transactionId: 'UPI_TXN_66289012',
    });

    // Update real available count on lot
    const avail = await ParkingSlot.countDocuments({ parkingLotId: primeLot._id, status: 'AVAILABLE' });
    primeLot.availableSlots = avail;
    await primeLot.save();

    console.log('[SEED] Creating Platform Notifications & Settings...');
    await Notification.create([
      {
        userId: commuter._id,
        title: 'Active Parking Session in Progress',
        message: 'Your vehicle TN 38 CM 2026 is currently parked at Slot A-01 in Gandhipuram Central Complex.',
        type: 'BOOKING',
        link: '/pass/PK-2026-A101',
      },
      {
        userId: owner._id,
        title: 'Morning Occupancy Peak',
        message: 'Your Gandhipuram lot reached 85% occupancy during the 08:00 AM commute peak.',
        type: 'SYSTEM',
      },
    ]);

    await Settings.create({
      parkingName: 'ParkingSpot – Smart Parking Reservation',
      defaultHourlyRate: 10,
      defaultDailyRate: 50,
      currencySymbol: '₹',
      contactPhone: '+91 98765 43210',
      contactEmail: 'support@parkingspot.in',
      upiId: 'smartparking@upi',
      cancellationWindowHours: 1,
    });

    console.log('==========================================================');
    console.log('  SEEDING COMPLETED SUCCESSFULLY!                         ');
    console.log('==========================================================');
    console.log('Login credentials:');
    console.log('  COMMUTER : commuter@parkingspot.com / commuter123');
    console.log('  OWNER    : owner@parkingspot.com / owner123');
    console.log('  ADMIN    : admin@parkingspot.com / admin123');
    console.log('==========================================================');
  } catch (err) {
    console.error('[SEED ERROR]', err);
  } finally {
    await closeDB();
  }
}

if (require.main === module) {
  seedData().then(() => process.exit(0));
}

module.exports = seedData;
