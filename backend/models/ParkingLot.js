const mongoose = require('mongoose');

const parkingLotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide parking location name'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Please provide an address'],
      trim: true,
    },
    city: {
      type: String,
      default: 'Coimbatore',
      trim: true,
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalSlots: {
      type: Number,
      default: 20,
      min: 1,
    },
    availableSlots: {
      type: Number,
      default: 20,
    },
    pricePerHour: {
      type: Number,
      default: 10,
      min: 0,
    },
    pricePerDay: {
      type: Number,
      default: 50,
      min: 0,
    },
    operatingHours: {
      type: String,
      default: '24/7',
      trim: true,
    },
    amenities: {
      type: [String],
      default: ['CCTV Surveillance', '24/7 Security Guard', 'Covered Bay', 'EV Charging'],
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

// Geo spatial index ready or standard compound index
parkingLotSchema.index({ latitude: 1, longitude: 1 });
parkingLotSchema.index({ city: 1, status: 1 });

module.exports = mongoose.model('ParkingLot', parkingLotSchema);
