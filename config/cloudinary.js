const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================
// ✅ STORAGE 1: Course Images (CloudinaryStorage)
// ============================================
const courseStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "course-images",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 800, height: 600, crop: "fill" }]
  }
});

// ============================================
// ✅ STORAGE 2: Hero Slides (CloudinaryStorage) - FOR LOCAL DEVELOPMENT
// ============================================
const heroStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "hero-slides",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "gif"],
    transformation: [
      { width: 1920, height: 800, crop: "limit" }
    ]
  }
});

// ============================================
// ✅ STORAGE 3: Memory Storage - FOR VERCEL DEPLOYMENT
// ============================================
const memoryStorage = multer.memoryStorage();

// ✅ Create multer instance for memory storage (Vercel compatible)
const uploadMemory = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

// ============================================
// ✅ Multer Instances
// ============================================

// For Hero Slides (use memory storage for Vercel)
const upload = multer({
  storage: memoryStorage,  // ✅ Changed from heroStorage to memoryStorage
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

// For Course Images (use CloudinaryStorage - works locally)
const courseUpload = multer({ 
  storage: courseStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  }
});

// For Documents (memory storage)
const uploadDocument = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
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

// For General Image Upload (CloudinaryStorage)
const uploadImage = multer({ 
  storage: heroStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

// ============================================
// ✅ Helper function to upload from buffer (for Vercel)
// ============================================
const uploadToCloudinary = (buffer, folder = 'hero-slides', options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
        transformation: [
          { width: 1920, height: 800, crop: 'limit' }
        ],
        ...options
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Cloudinary upload success:', result.secure_url);
          resolve(result);
        }
      }
    );
    uploadStream.end(buffer);
  });
};

// ============================================
// ✅ Helper function to delete from Cloudinary
// ============================================
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ Cloudinary delete success:', result);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw error;
  }
};

// ============================================
// ✅ EXPORTS
// ============================================
module.exports = { 
  cloudinary,
  heroStorage,
  courseStorage,
  memoryStorage,
  upload,           // ✅ For hero slides (memory storage)
  courseUpload,     // ✅ For courses (CloudinaryStorage)
  uploadDocument,   // ✅ For documents (memory storage)
  uploadImage,      // ✅ For general images (CloudinaryStorage)
  uploadMemory,     // ✅ For other memory storage needs
  uploadToCloudinary, // ✅ Helper function for manual upload
  deleteFromCloudinary // ✅ Helper function for delete
};