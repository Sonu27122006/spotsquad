const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const parkingRoutes = require('./routes/parking');
const slotsRoutes = require('./routes/slots');
const bookingsRoutes = require('./routes/bookings');
const paymentsRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');
const hardwareRoutes = require('./routes/hardware');
const leaderboardRoutes = require('./routes/leaderboard');

const app = express();

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    project: 'ParkingSpot – Smart Parking Reservation',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Fallback 404 for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`,
  });
});

// Central Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Check if initial seed is needed
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[INIT] Fresh database detected. Running initial seed...');
      const seedData = require('./scripts/seed');
      // Pass without closing DB connection
      await seedData();
    }

    const server = app.listen(PORT, () => {
      console.log('==========================================================');
      console.log(`  ParkingSpot REST API Server running on port ${PORT}      `);
      console.log(`  Health Check: http://localhost:${PORT}/api/health         `);
      console.log('==========================================================');
    });

    return server;
  } catch (err) {
    console.error('[FATAL] Failed to start backend server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
