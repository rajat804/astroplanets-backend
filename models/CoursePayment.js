// models/CoursePayment.js

const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  // ============================================
  // COURSE & USER DETAILS
  // ============================================
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userPhone: {
    type: String,
    default: "",
  },

  // ============================================
  // PAYMENT DETAILS
  // ============================================
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "INR",
  },
  razorpayOrderId: {
    type: String,
    required: true,
  },
  razorpayPaymentId: {
    type: String,
  },
  razorpaySignature: {
    type: String,
  },

  // ============================================
  // PAYMENT STATUS
  // ============================================
  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },

  // ============================================
  // CLASS/SCHEDULE STATUS - NEW
  // ============================================
  classStatus: {
    type: String,
    enum: ["upcoming", "ongoing", "completed", "cancelled", "scheduled"],
    default: "scheduled",
  },

  // ============================================
  // SCHEDULE FIELDS - NEW (For Schedule Page)
  // ============================================
  preferredDate: {
    type: Date,
    default: null,
  },
  preferredTime: {
    type: String,
    default: "",
  },
  duration: {
    type: String,
    default: "60",
  },

  // ============================================
  // MEET LINK - NEW (For Join Button)
  // ============================================
  meetLink: {
    type: String,
    default: "",
  },

  // ============================================
  // COURSE ENROLLMENT
  // ============================================
  enrolledAt: {
    type: Date,
  },

  // ============================================
  // TIMESTAMPS
  // ============================================
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// ============================================
// INDEXES FOR FASTER QUERIES
// ============================================
paymentSchema.index({ userId: 1 });
paymentSchema.index({ courseId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ classStatus: 1 }); // ✅ For Schedule page filtering
paymentSchema.index({ preferredDate: 1 }); // ✅ For date filtering
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("CoursePayment", paymentSchema);