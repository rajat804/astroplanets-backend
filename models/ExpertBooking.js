const mongoose = require("mongoose");

const expertBookingSchema = new mongoose.Schema({
  expertId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Expert",
    required: true
  },
  expertName: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userPhone: {
    type: String,
    required: true
  },
  preferredDate: {
    type: String,
    required: true
  },
  preferredTime: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ""
  },
  // ✅ PAYMENT STATUS (Payment se related)
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending"
  },
  // ✅ CLASS STATUS (Schedule/Class se related) - NEW
  classStatus: {
    type: String,
    enum: ["upcoming", "ongoing", "completed", "cancelled", "scheduled"],
    default: "scheduled"
  },
  meetLink: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes
expertBookingSchema.index({ userId: 1 });
expertBookingSchema.index({ expertId: 1 });
expertBookingSchema.index({ status: 1 });
expertBookingSchema.index({ classStatus: 1 }); 

module.exports = mongoose.model("ExpertBooking", expertBookingSchema);