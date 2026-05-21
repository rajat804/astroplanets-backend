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
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending"
  },
  meetLink: {
  type: String,
  default: ""
},
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ServiceBooking", serviceBookingSchema);