const HeroSlide = require('../models/HeroSlide');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// ✅ CREATE - Using helper function
exports.createSlide = async (req, res) => {
  try {
    console.log('📝 Creating slide');
    console.log('📄 Request file:', req.file ? 'File received' : 'No file');

    // ✅ Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image is required. Please select an image file.',
      });
    }

    // ✅ Check if file buffer exists
    if (!req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file data. Please try again.',
      });
    }

    // ✅ Check slide limit
    const totalSlides = await HeroSlide.countDocuments();
    if (totalSlides >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Only 10 slides allowed',
      });
    }

    // ✅ Upload to Cloudinary using helper
    console.log('📤 Uploading to Cloudinary...');
    const uploadResult = await uploadToCloudinary(req.file.buffer, 'hero-slides');

    // ✅ Create slide in database
    const slide = await HeroSlide.create({
      image: uploadResult.secure_url,
      link: req.body.link || '',
    });

    console.log('✅ Slide created:', slide._id);

    res.status(201).json({
      success: true,
      message: 'Slide created successfully',
      slide,
    });
  } catch (error) {
    console.error('❌ Create slide error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create slide',
    });
  }
};

// ✅ UPDATE - Using helper function
exports.updateSlide = async (req, res) => {
  try {
    console.log('📝 Updating slide - ID:', req.params.id);
    console.log('📄 Request file:', req.file ? 'File received' : 'No file');

    const slide = await HeroSlide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({
        success: false,
        message: 'Slide not found',
      });
    }

    // ✅ Update image if new file uploaded
    if (req.file && req.file.buffer) {
      console.log('📤 Uploading new image to Cloudinary...');
      
      // Delete old image from Cloudinary
      if (slide.image) {
        try {
          const publicId = slide.image.split('/').slice(-2).join('/').split('.')[0];
          await deleteFromCloudinary(publicId);
          console.log('✅ Old image deleted:', publicId);
        } catch (deleteError) {
          console.warn('⚠️ Could not delete old image:', deleteError.message);
        }
      }

      // Upload new image
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'hero-slides');
      slide.image = uploadResult.secure_url;
    }

    // ✅ Update link if provided
    if (req.body.link !== undefined) {
      slide.link = req.body.link;
    }

    await slide.save();
    console.log('✅ Slide updated:', slide._id);

    res.status(200).json({
      success: true,
      message: 'Slide updated successfully',
      slide,
    });
  } catch (error) {
    console.error('❌ Update slide error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update slide',
    });
  }
};

// ✅ GET ALL
exports.getSlides = async (req, res) => {
  try {
    const slides = await HeroSlide.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      slides,
    });
  } catch (error) {
    console.error('Get slides error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ DELETE - Using helper
exports.deleteSlide = async (req, res) => {
  try {
    const slide = await HeroSlide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({
        success: false,
        message: 'Slide not found',
      });
    }

    // ✅ Delete from Cloudinary
    if (slide.image) {
      try {
        const publicId = slide.image.split('/').slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(publicId);
        console.log('✅ Image deleted from Cloudinary:', publicId);
      } catch (deleteError) {
        console.warn('⚠️ Could not delete image from Cloudinary:', deleteError.message);
      }
    }

    await slide.deleteOne();
    console.log('✅ Slide deleted:', slide._id);

    res.status(200).json({
      success: true,
      message: 'Slide deleted successfully',
    });
  } catch (error) {
    console.error('Delete slide error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};