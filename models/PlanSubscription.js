// models/PlanSubscription.js
const mongoose = require("mongoose");

const planSubscriptionSchema = new mongoose.Schema({
  // User details (stored directly for easy access)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  userPhone: {
    type: String,
    default: "",
  },
  
  // Plan details
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan",
  },
  planName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  mrpAmount: {
    type: Number,
    default: 0,
  },
  duration: {
    type: String,
    required: true,
  },
  durationDays: {
    type: Number,
    default: 30,
  },
  features: [{
    type: String,
  }],
  sessionsIncluded: {
    type: Number,
    default: 0,
  },
  sessionsUsed: {
    type: Number,
    default: 0,
  },
  
  // Subscription dates
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  },
  
  // Status and payment
  status: {
    type: String,
    enum: ["pending", "active", "expired", "cancelled"],
    default: "pending",
  },
    classStatus: {
    type: String,
    enum: ["upcoming", "ongoing", "completed", "cancelled", "scheduled"],
    default: "scheduled",
  },
  meetLink: {
    type: String,
    default: "",
  },
  razorpayOrderId: {
    type: String,
  },
  razorpayPaymentId: {
    type: String,
  },
  razorpaySignature: {
    type: String,
  },
  cancellationReason: {
    type: String,
  },
  cancelledAt: {
    type: Date,
  },
  
  // Session scheduling fields
  preferredDate: {
    type: Date,
  },
  preferredTime: {
    type: String,
  },
  message: {
    type: String,
    default: "",
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Index for faster queries
planSubscriptionSchema.index({ userId: 1 });
planSubscriptionSchema.index({ userEmail: 1 });
planSubscriptionSchema.index({ status: 1 });
planSubscriptionSchema.index({ classStatus: 1 });
planSubscriptionSchema.index({ endDate: 1 });

module.exports = mongoose.model("PlanSubscription", planSubscriptionSchema);