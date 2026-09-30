const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
const { connectDB, closeDB } = require('./config/db');
const User = require('./models/User');
const ParkingLot = require('./models/ParkingLot');
const Booking = require('./models/Booking');

async function testPersistence() {
  await connectDB();
  const users = await User.countDocuments();
  const lots = await ParkingLot.countDocuments();
  const bookings = await Booking.countDocuments();
  console.log(`[PERSISTENCE VERIFICATION] Users: ${users}, Lots: ${lots}, Bookings: ${bookings}`);
  if (users > 0 && lots > 0 && bookings > 0) {
    console.log('\x1b[32m[SUCCESS] Real MongoDB data persisted successfully!\x1b[0m');
  } else {
    console.error('\x1b[31m[FAIL] Data did not persist!\x1b[0m');
  }
  await closeDB();
}

testPersistence();
