// controllers/heroSlideController.js
const HeroSlide = require("../models/HeroSlide");

// CREATE
exports.createSlide = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const totalSlides = await HeroSlide.countDocuments();

    if (totalSlides >= 10) {
      return res.status(400).json({
        success: false,
        message: "Only 10 slides allowed",
      });
    }

    const slide = await HeroSlide.create({
      image: req.file.path, // Cloudinary URL
      link: req.body.link || "",
    });

    res.status(201).json({
      success: true,
      slide,
    });
  } catch (error) {
    console.error("Create slide error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create slide",
    });
  }
};

// GET ALL
exports.getSlides = async (req, res) => {
  try {
    const slides = await HeroSlide.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      slides,
    });
  } catch (error) {
    console.error("Get slides error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch slides",
    });
  }
};

// DELETE
exports.deleteSlide = async (req, res) => {
  try {
    const slide = await HeroSlide.findById(req.params.id);

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: "Slide not found",
      });
    }

    // Delete from Cloudinary
    if (slide.image) {
      try {
        // Extract public ID from Cloudinary URL
        const urlParts = slide.image.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const publicId = `hero-slides/${fileName.split('.')[0]}`;
        
        await cloudinary.uploader.destroy(publicId);
        console.log("Deleted from Cloudinary:", publicId);
      } catch (cloudinaryError) {
        console.error("Cloudinary delete error:", cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    await HeroSlide.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Slide deleted successfully",
    });
  } catch (error) {
    console.error("Delete slide error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete slide",
    });
  }
};

// UPDATE
exports.updateSlide = async (req, res) => {
  try {
    console.log("Update - Request body:", req.body);
    console.log("Update - Request file:", req.file);

    const slide = await HeroSlide.findById(req.params.id);

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: "Slide not found",
      });
    }

    // Update image if new file uploaded
    if (req.file) {
      // Delete old image from Cloudinary
      if (slide.image) {
        try {
          const urlParts = slide.image.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const publicId = `hero-slides/${fileName.split('.')[0]}`;
          
          await cloudinary.uploader.destroy(publicId);
          console.log("Deleted old image from Cloudinary:", publicId);
        } catch (cloudinaryError) {
          console.error("Cloudinary delete error:", cloudinaryError);
        }
      }
      slide.image = req.file.path;
    }

    // Update link
    if (req.body.link !== undefined) {
      slide.link = req.body.link;
    }

    await slide.save();

    res.status(200).json({
      success: true,
      slide,
    });
  } catch (error) {
    console.error("Update slide error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update slide",
    });
  }
};