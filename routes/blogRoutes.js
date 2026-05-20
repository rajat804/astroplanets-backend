const express = require('express');
const router = express.Router();
const {
  getAllBlogs,
  getBlogBySlug,
  getAllBlogsAdmin,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  togglePublish,
  likeBlog,
} = require('../controllers/blogController');
const { protectAdmin } = require('../middleware/adminAuth');

// Public routes
// Public routes
router.get('/', getAllBlogs);
router.put('/:id/like', likeBlog);

// Admin routes
router.get('/admin/all', protectAdmin, getAllBlogsAdmin);
router.get('/admin/:id', protectAdmin, getBlogById);
router.post('/admin', protectAdmin, createBlog);
router.put('/admin/:id', protectAdmin, updateBlog);
router.delete('/admin/:id', protectAdmin, deleteBlog);
router.patch('/admin/:id/toggle', protectAdmin, togglePublish);

// KEEP THIS LAST
router.get('/:slug', getBlogBySlug);

module.exports = router;