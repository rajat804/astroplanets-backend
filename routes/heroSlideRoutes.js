const express = require("express");
const router = express.Router();

const multer = require("multer");
const { storage } = require("../config/cloudinary");

const upload = multer({ storage });

const {
  createSlide,
  getSlides,
  deleteSlide,
  updateSlide,
} = require("../controllers/heroSlideController");

// CREATE SLIDE
router.post(
  "/create",
  upload.single("image"),
  createSlide
);

// GET ALL SLIDES
router.get("/", getSlides);

// DELETE SLIDE
router.delete("/:id", deleteSlide);

// UPDATE SLIDE
router.put(
  "/:id",
  upload.single("image"),
  updateSlide
);

module.exports = router;