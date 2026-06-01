const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  titleKey: {
    type: String,
    enum: ["palmistry", "vastu", "numerology", "yoga", ""],
    default: ""
  },
  category: {
    type: String,
    trim: true
  },
  categoryDescription: {
    type: String,
    default: ""
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: String,
    default: ""
  },
  price: {
    type: String,
    required: true
  },
  mrpPrice: {
    type: String,
    default: ""
  },
  discount: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: "GiCrystalBall"
  },
  iconColor: {
    type: String,
    default: "text-purple-500"
  },
  gradientKey: {
    type: String,
    enum: ["purple", "blue", "green", "orange", "red", "indigo", "teal", "yellow"],
    default: "purple"
  },
  benefits: [{
    type: String
  }],
  symbols: [{
    type: String
  }],
  symbolType: {
    type: String,
    enum: ["zodiac", "planets", "directions", "numbers", "elements", "none"],
    default: "zodiac"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Service", serviceSchema);