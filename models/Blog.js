const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    tag: {
      type: String,
      required: [true, 'Tag is required'],
      enum: ['Astrology', 'Wellness', 'Crystals', 'Numerology', 'Spiritual', 'Meditation', 'Vastu', 'Tarot'],
    },
    image: {
      type: String,
      required: [true, 'Image is required'],
    },
    excerpt: {
      type: String,
      required: [true, 'Excerpt is required'],
      maxlength: [200, 'Excerpt cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    author: {
      type: String,
      default: 'AstroPlanets Team',
    },
    readTime: {
      type: Number,
      default: 5,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    tags: [{
      type: String,
    }],
    seoTitle: {
      type: String,
    },
    seoDescription: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug before saving
blogSchema.pre('save', function (next) {
  if (this.title && (!this.slug || this.isModified('title'))) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;