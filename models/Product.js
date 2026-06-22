const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    oldPrice: {
      type: Number,
      default: null,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    image: {
      type: String,
      required: [true, 'Main image is required'],
    },
    images: {
      type: [String],
      default: [],
    },
    type: {
      type: String,
      required: [true, 'Product type is required'],
      trim: true,
      // ⚠️ REMOVE enum - koi bhi type allowed
    },
    gemstone: {
      type: String,
      default: 'Rudraksha',
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Number,
      default: 10,
      min: [0, 'Stock cannot be negative'],
    },
    sold: {
      type: Number,
      default: 0,
    },
    discount: {
      type: String,
      default: null,
    },
    subtitle: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    designerNote: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '',
    },
    material: {
      type: String,
      default: 'Authentic Rudraksha',
    },
    weight: {
      type: String,
      default: '',
    },
    dimensions: {
      type: String,
      default: '',
    },
    origin: {
      type: String,
      default: 'Nepal / India',
    },
    category: {
      type: String,
      default: 'Rudraksha',
      trim: true,
      // ⚠️ REMOVE enum - koi bhi category allowed
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
productSchema.index({ name: 1, type: 1 });
productSchema.index({ price: 1, createdAt: -1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;