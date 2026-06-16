const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminAuth');
const {
  uploadImage,
  uploadDocument,
  uploadSingleImage,
  uploadMultipleImages,
  uploadSingleDocument,
  deleteImage
} = require('../controllers/uploadController');

// Image upload routes
router.post('/single', protectAdmin, uploadImage.single('image'), uploadSingleImage);
router.post('/multiple', protectAdmin, uploadImage.array('images', 10), uploadMultipleImages);
router.delete('/image', protectAdmin, deleteImage);

// Document upload route (for Word files)
router.post('/document', protectAdmin, uploadDocument.single('file'), uploadSingleDocument);

module.exports = router;