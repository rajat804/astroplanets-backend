const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminAuth');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary'); // Make sure this path is correct
const {
  getAllSocialContent,
  getActiveSocialContent,
  getSocialContentById,
  createSocialContent,
  uploadFile,
  updateSocialContent,
  deleteSocialContent,
  incrementViewCount,
  toggleLike
} = require('../controllers/socialContentController');

// Public routes (for frontend)
router.get('/active', getActiveSocialContent);
router.get('/:id', getSocialContentById);
router.put('/:id/view', incrementViewCount);
router.put('/:id/like', toggleLike);

// Admin routes
router.get('/', protectAdmin, getAllSocialContent);
router.post('/', protectAdmin, createSocialContent);
router.post('/upload', protectAdmin, upload.single('file'), uploadFile);
router.put('/:id', protectAdmin, updateSocialContent);
router.delete('/:id', protectAdmin, deleteSocialContent);

module.exports = router;