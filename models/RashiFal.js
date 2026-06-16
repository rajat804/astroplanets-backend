// models/RashiFal.js
const mongoose = require('mongoose');

const rashiFalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
  },
  name_hi: {
    type: String,
    default: ''
  },
  symbol: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  color: {
    type: String,
    default: '#E74C3C'
  },
  element: {
    type: String,
    enum: ['Fire', 'Earth', 'Air', 'Water'],
    default: 'Fire'
  },
  ruling_planet: {
    type: String,
    default: ''
  },
  lucky_color: {
    type: String,
    default: ''
  },
  lucky_number: {
    type: Number,
    default: 0
  },
  // Yearly Predictions
  yearly_predictions: {
    type: String,
    default: ''
  },
  // Monthly Predictions (12 months)
  monthly_predictions: {
    january: { type: String, default: '' },
    february: { type: String, default: '' },
    march: { type: String, default: '' },
    april: { type: String, default: '' },
    may: { type: String, default: '' },
    june: { type: String, default: '' },
    july: { type: String, default: '' },
    august: { type: String, default: '' },
    september: { type: String, default: '' },
    october: { type: String, default: '' },
    november: { type: String, default: '' },
    december: { type: String, default: '' }
  },
  // Weekly Predictions
  weekly_predictions: {
    type: String,
    default: ''
  },
  // Daily Predictions
  daily_predictions: {
    type: String,
    default: ''
  },
  // Health Predictions
  health: {
    type: String,
    default: ''
  },
  // Career Predictions
  career: {
    type: String,
    default: ''
  },
  // Love & Relationship
  love: {
    type: String,
    default: ''
  },
  // Finance
  finance: {
    type: String,
    default: ''
  },
  // Remedies
  remedies: {
    type: String,
    default: ''
  },
  // Mantra
  mantra: {
    type: String,
    default: ''
  },
  // Image URL
  image_url: {
    type: String,
    default: ''
  },
  // SEO
  meta_title: {
    type: String,
    default: ''
  },
  meta_description: {
    type: String,
    default: ''
  },
  // Status
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RashiFal', rashiFalSchema);