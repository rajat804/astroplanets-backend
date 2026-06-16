const SocialContent = require('../models/SocialContent');
const { cloudinary } = require('../config/cloudinary');

// Get all social content
const getAllSocialContent = async (req, res) => {
  try {
    const content = await SocialContent.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');
    
    res.json({
      success: true,
      content,
      count: content.length
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({
      success: false,
      msg: 'Failed to fetch content'
    });
  }
};

// Get active social content (for frontend)
const getActiveSocialContent = async (req, res) => {
  try {
    const content = await SocialContent.find({ isActive: true })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error fetching active content:', error);
    res.status(500).json({
      success: false,
      msg: 'Failed to fetch content'
    });
  }
};

// Get single social content
const getSocialContentById = async (req, res) => {
  try {
    const content = await SocialContent.findById(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        msg: 'Content not found'
      });
    }
    
    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({
      success: false,
      msg: 'Failed to fetch content'
    });
  }
};

// Create social content
const createSocialContent = async (req, res) => {
  try {
    const { type, title, url, description, fileUrl, fileName, imageUrl } = req.body;
    
    const content = new SocialContent({
      type,
      title,
      url: url || '',
      description: description || '',
      fileUrl: fileUrl || '',
      fileName: fileName || '',
      imageUrl: imageUrl || '',
      createdBy: req.admin?._id || req.user?._id
    });
    
    await content.save();
    
    res.status(201).json({
      success: true,
      msg: 'Content created successfully',
      content
    });
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({
      success: false,
      msg: 'Failed to create content'
    });
  }
};

// Upload file (Word document or image)
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        msg: 'No file uploaded'
      });
    }
    
    // Get file URL from Cloudinary
    let fileUrl = req.file.path;
    
    // For Cloudinary, you might want to use secure_url
    if (req.file.secure_url) {
      fileUrl = req.file.secure_url;
    }
    
    res.json({
      success: true,
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      msg: 'Failed to upload file'
    });
  }
};

// Update social content
const updateSocialContent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const content = await SocialContent.findById(id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        msg: 'Content not found'
      });
    }
    
    // Update fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        content[key] = updates[key];
      }
    });
    
    await content.save();
    
    res.json({
      success: true,
      msg: 'Content updated successfully',
      content
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({
      success: false,
      msg: 'Failed to update content'
    });
  }
};

// Delete social content
const deleteSocialContent = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await SocialContent.findById(id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        msg: 'Content not found'
      });
    }
    
    // Delete file from Cloudinary if exists
    if (content.fileUrl) {
      try {
        const publicId = content.fileUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`social-content/blogs/${publicId}`, {
          resource_type: 'raw'
        });
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
    
    // Delete image from Cloudinary if exists
    if (content.imageUrl) {
      try {
        const publicId = content.imageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`social-content/gallery/${publicId}`);
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }
    
    await SocialContent.findByIdAndDelete(id);
    
    res.json({
      success: true,
      msg: 'Content deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({
      success: false,
      msg: 'Failed to delete content'
    });
  }
};

// Increment view count
const incrementViewCount = async (req, res) => {
  try {
    const { id } = req.params;
    await SocialContent.findByIdAndUpdate(id, {
      $inc: { views: 1 }
    });
    
    res.json({
      success: true,
      msg: 'View count updated'
    });
  } catch (error) {
    console.error('Error updating view count:', error);
    res.status(500).json({
      success: false,
      msg: 'Failed to update view count'
    });
  }
};

// Toggle like
const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await SocialContent.findById(id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        msg: 'Content not found'
      });
    }
    
    content.likes += 1;
    await content.save();
    
    res.json({
      success: true,
      likes: content.likes,
      msg: 'Liked successfully'
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      msg: 'Failed to update like'
    });
  }
};

module.exports = {
  getAllSocialContent,
  getActiveSocialContent,
  getSocialContentById,
  createSocialContent,
  uploadFile,
  updateSocialContent,
  deleteSocialContent,
  incrementViewCount,
  toggleLike
};