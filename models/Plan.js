// models/Plan.js
const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["Starter", "Premium", "Elite"],
    },
    mrpPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: String,
      required: true,
    },
    durationDays: {
      type: Number,
      default: 30,
      min: 1,
    },
    features: {
      type: [String],
      required: true,
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: "At least one feature is required"
      }
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    sessionsIncluded: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Ensure only one popular plan exists
planSchema.pre('save', async function(next) {
  if (this.isPopular) {
    const Plan = mongoose.model('Plan');
    await Plan.updateMany(
      { _id: { $ne: this._id }, isPopular: true },
      { isPopular: false }
    );
  }
  next();
});

const Plan = mongoose.model("Plan", planSchema);

module.exports = Plan;