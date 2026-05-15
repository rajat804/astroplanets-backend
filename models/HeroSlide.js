const mongoose = require("mongoose");

const heroSlideSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "HeroSlide",
  heroSlideSchema
);