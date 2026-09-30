const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    parkingName: {
      type: String,
      default: 'ParkingSpot – Smart Parking Reservation Platform',
    },
    defaultHourlyRate: {
      type: Number,
      default: 10,
    },
    defaultDailyRate: {
      type: Number,
      default: 50,
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
    contactPhone: {
      type: String,
      default: '+91 98765 43210',
    },
    contactEmail: {
      type: String,
      default: 'support@parkingspot.in',
    },
    upiId: {
      type: String,
      default: 'parkingspot@upi',
    },
    cancellationWindowHours: {
      type: Number,
      default: 1, // Can cancel up to 1 hour before start
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
