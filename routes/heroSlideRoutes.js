// routes/heroSlideRoutes.js
const express = require("express");
const router = express.Router();
const { upload } = require("../config/cloudinary");

const {
  createSlide,
  getSlides,
  deleteSlide,
  updateSlide,
} = require("../controllers/heroSlideController");

// CREATE - Image is REQUIRED
router.post("/create", upload.single("image"), createSlide);

// GET ALL SLIDES
router.get("/", getSlides);

// DELETE SLIDE
router.delete("/:id", deleteSlide);

// UPDATE - Image is OPTIONAL (can update link only)
router.put("/:id", upload.single("image"), updateSlide);

module.exports = router;