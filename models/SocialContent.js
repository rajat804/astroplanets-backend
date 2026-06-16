const mongoose = require('mongoose');

const socialContentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['youtube', 'instagram', 'blog', 'gallery'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    trim: true
  },
  embedId: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  fileUrl: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Extract embed ID from YouTube URL
socialContentSchema.pre('save', function(next) {
  if (this.type === 'youtube' && this.url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = this.url.match(regExp);
    if (match && match[2].length === 11) {
      this.embedId = match[2];
    }
  }
  next();
});

module.exports = mongoose.model('SocialContent', socialContentSchema);