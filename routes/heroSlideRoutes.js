// routes/heroSlideRoutes.js
const express = require("express");
const router = express.Router();
const { upload } = require("../config/cloudinary"); // This uses heroStorage by default

const {
  createSlide,
  getSlides,
  deleteSlide,
  updateSlide,
} = require("../controllers/heroSlideController");

// CREATE SLIDE - Use upload.single('image')
router.post("/create", upload.single("image"), createSlide);

// GET ALL SLIDES
router.get("/", getSlides);

// DELETE SLIDE
router.delete("/:id", deleteSlide);

// UPDATE SLIDE - Use upload.single('image')
router.put("/:id", upload.single("image"), updateSlide);

module.exports = router;