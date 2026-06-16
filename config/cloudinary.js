const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for Course Images
const courseStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "course-images",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 800, height: 600, crop: "fill" }]
  }
});

// Storage for Hero Slides
const heroStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "hero-slides",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

// Create multer instances
const upload = multer({ storage: heroStorage });
const courseUpload = multer({ storage: courseStorage });

// For social content - memory storage for documents
const memoryStorage = multer.memoryStorage();

const uploadDocument = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Word documents are allowed'), false);
    }
  }
});

const uploadImage = multer({ 
  storage: heroStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

module.exports = { 
  cloudinary,
  heroStorage,
  courseStorage,
  upload,
  courseUpload,
  uploadDocument,
  uploadImage
};