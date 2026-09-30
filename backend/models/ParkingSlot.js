const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema(
  {
    slotNumber: {
      type: String,
      required: [true, 'Slot number is required (e.g. A-01)'],
      trim: true,
      uppercase: true,
    },
    parkingLotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLot',
      required: true,
    },
    vehicleType: {
      type: String,
      enum: ['TWO_WHEELER', 'FOUR_WHEELER', 'EV'],
      default: 'TWO_WHEELER',
    },
    isEVChargingSlot: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE'],
      default: 'AVAILABLE',
    },
    floor: {
      type: String,
      default: 'Ground Level',
      trim: true,
    },
    currentBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure slot numbers are unique within a parking lot
parkingSlotSchema.index({ parkingLotId: 1, slotNumber: 1 }, { unique: true });
parkingSlotSchema.index({ parkingLotId: 1, status: 1 });

module.exports = mongoose.model('ParkingSlot', parkingSlotSchema);
