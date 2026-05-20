const HeroSlide = require("../models/HeroSlide");

// CREATE
exports.createSlide = async (req, res) => {
  try {
    const totalSlides = await HeroSlide.countDocuments();

    if (totalSlides >= 10) {
      return res.status(400).json({
        success: false,
        message: "Only 10 slides allowed",
      });
    }

    const slide = await HeroSlide.create({
      image: req.file.path,

      link: req.body.link,
    });

    res.status(201).json({
      success: true,
      slide,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE
exports.deleteSlide = async (req, res) => {
  try {
    await HeroSlide.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Slide deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE
exports.updateSlide = async (req, res) => {
  try {
    const slide = await HeroSlide.findById(req.params.id);

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: "Slide not found",
      });
    }

    if (req.file) {
      slide.image = req.file.path;
    }

    slide.link = req.body.link || slide.link;

    await slide.save();

    res.status(200).json({
      success: true,
      slide,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};