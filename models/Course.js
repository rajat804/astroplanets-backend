const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  type: {
    type: String,
    default: "numerology"
  },
  title: { 
    type: String, 
    required: true,
    trim: true 
  },
  level: { 
    type: String, 
    default: "Diploma"
  },
  duration: { 
    type: String, 
    default: "3 Months"
  },
  sessions: { 
    type: String, 
    default: "30+"
  },
  courseLanguage: { 
    type: String, 
    default: "Hindi, English"
  },
  mode: { 
    type: String, 
    default: "Live Online"
  },
  mrpPrice: { 
    type: String, 
    default: ""
  },
  price: { 
    type: String, 
    required: true
  },
  gstPercentage: { 
    type: Number, 
    default: 18
  },
  extraDiscount: { 
    type: Number, 
    default: 0
  },
  rating: { 
    type: Number, 
    default: 0
  },
  image: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true
  },
  longDescription: { 
    type: String, 
    default: ""
  },
  syllabus: [{ 
    type: String
  }],
  includes: [{ 
    type: String
  }],
  isActive: { 
    type: Boolean, 
    default: true 
  },
  enrolledStudents: { 
    type: Number, 
    default: 0
  }
}, { 
  timestamps: true 
});

courseSchema.index({ title: 1 });
courseSchema.index({ type: 1 });

module.exports = mongoose.model("Course", courseSchema);