// controllers/heroSlideController.js
const HeroSlide = require("../models/HeroSlide");
const { cloudinary } = require("../config/cloudinary");

// CREATE
exports.createSlide = async (req, res) => {
  try {
    console.log("Create slide request received");

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

    // Upload to Cloudinary from memory buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "hero-slides",
          allowed_formats: ["jpg", "png", "jpeg", "webp"],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const slide = await HeroSlide.create({
      image: result.secure_url,
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
        const publicId = slide.image.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
        console.log("Deleted from Cloudinary:", publicId);
      } catch (cloudinaryError) {
        console.error("Cloudinary delete error:", cloudinaryError);
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

// UPDATE - Image is now OPTIONAL
exports.updateSlide = async (req, res) => {
  try {
    console.log("Update slide request received");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file ? "File present" : "No file");

    const slide = await HeroSlide.findById(req.params.id);

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: "Slide not found",
      });
    }

    // Update image ONLY IF new file is uploaded
    if (req.file) {
      // Delete old image from Cloudinary
      if (slide.image) {
        try {
          const publicId = slide.image.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId);
          console.log("Deleted old image:", publicId);
        } catch (cloudinaryError) {
          console.error("Cloudinary delete error:", cloudinaryError);
        }
      }

      // Upload new image from memory buffer
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "hero-slides",
            allowed_formats: ["jpg", "png", "jpeg", "webp"],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      slide.image = result.secure_url;
    }

    // Update link - ALWAYS update if provided
    if (req.body.link !== undefined) {
      slide.link = req.body.link || "";
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