const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

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
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "hero-slides",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
  


module.exports = { cloudinary, storage, courseStorage };