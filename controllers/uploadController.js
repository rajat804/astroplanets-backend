const { cloudinary, uploadImage, uploadDocument } = require('../config/cloudinary');
const multer = require('multer');

// Upload single image
const uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, msg: 'No file uploaded' });
    }
    
    res.json({
      success: true,
      msg: 'Image uploaded successfully',
      imageUrl: req.file.path,
      publicId: req.file.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, msg: 'Upload failed', error: error.message });
  }
};

// Upload multiple images
const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, msg: 'No files uploaded' });
    }
    
    const images = req.files.map(file => ({
      url: file.path,
      publicId: file.filename
    }));
    
    res.json({
      success: true,
      msg: 'Images uploaded successfully',
      images: images
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, msg: 'Upload failed', error: error.message });
  }
};

// Upload single document (Word file)
const uploadSingleDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, msg: 'No file uploaded' });
    }
    
    res.json({
      success: true,
      msg: 'Document uploaded successfully',
      fileUrl: req.file.path,
      fileName: req.file.originalname,
      publicId: req.file.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, msg: 'Upload failed', error: error.message });
  }
};

// Delete image from Cloudinary
const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ success: false, msg: 'Public ID is required' });
    }
    
    await cloudinary.uploader.destroy(publicId);
    
    res.json({ success: true, msg: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, msg: 'Delete failed', error: error.message });
  }
};

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  uploadSingleDocument,
  deleteImage,
  uploadImage,
  uploadDocument
};