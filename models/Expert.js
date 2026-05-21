const mongoose = require("mongoose");

const expertSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  expertise: { type: String, trim: true },
  image: { type: String, required: true },
  icon: { type: String, default: "Compass" },
  intro: { type: String, required: true },
  color: { type: String, default: "from-orange-500 to-red-600" },
  bgColor: { type: String, default: "bg-orange-50" },
  iconColor: { type: String, default: "text-orange-600" },
  stats: { type: Object, default: {} },
  specialties: [{ type: String }],
  isActive: { type: Boolean, default: true },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Expert", expertSchema);