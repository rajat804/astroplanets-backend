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
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending"
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
  }
});

module.exports = mongoose.model("ServiceBooking", serviceBookingSchema);