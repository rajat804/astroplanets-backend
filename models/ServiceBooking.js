const mongoose = require("mongoose");

const serviceBookingSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true
  },
  serviceTitle: {
    type: String,
    required: true
  },
  serviceTitleKey: {
    type: String,
    default: ""
  },
  serviceCategory: {
    type: String,
    default: ""
  },
  serviceCategoryDescription: {
    type: String,
    default: ""
  },
  serviceDuration: {
    type: String,
    default: ""
  },
  serviceIcon: {
    type: String,
    default: "GiCrystalBall"
  },
  serviceGradientKey: {
    type: String,
    default: "purple"
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
  amount: {
    type: Number,
    required: true
  },
  paymentId: {
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
  notes: {
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

// Indexes for faster queries
serviceBookingSchema.index({ userId: 1 });
serviceBookingSchema.index({ serviceId: 1 });
serviceBookingSchema.index({ status: 1 });
serviceBookingSchema.index({ classStatus: 1 }); 
serviceBookingSchema.index({ serviceTitleKey: 1 });
serviceBookingSchema.index({ serviceCategory: 1 });
serviceBookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ServiceBooking", serviceBookingSchema);