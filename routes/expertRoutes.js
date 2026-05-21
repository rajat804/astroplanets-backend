const express = require("express");
const router = express.Router();
const Expert = require("../models/Expert");
const { cloudinary } = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary Storage for expert images
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "experts",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill" }]
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Upload image endpoint
router.post("/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    res.json({
      success: true,
      imageUrl: req.file.path,
      public_id: req.file.filename
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all experts (public)
router.get("/", async (req, res) => {
  try {
    const experts = await Expert.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, experts });
  } catch (error) {
    console.error("Error fetching experts:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all experts for admin
router.get("/admin/all", async (req, res) => {
  try {
    const experts = await Expert.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, experts });
  } catch (error) {
    console.error("Error fetching experts:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single expert
router.get("/:id", async (req, res) => {
  try {
    const expert = await Expert.findById(req.params.id);
    if (!expert) {
      return res.status(404).json({ success: false, message: "Expert not found" });
    }
    res.json({ success: true, expert });
  } catch (error) {
    console.error("Error fetching expert:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE expert
router.post("/", async (req, res) => {
  try {
    const expertData = req.body;
    const expert = new Expert(expertData);
    await expert.save();
    res.status(201).json({ success: true, expert, message: "Expert created successfully" });
  } catch (error) {
    console.error("Error creating expert:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE expert
router.put("/:id", async (req, res) => {
  try {
    const expert = await Expert.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!expert) {
      return res.status(404).json({ success: false, message: "Expert not found" });
    }
    res.json({ success: true, expert, message: "Expert updated successfully" });
  } catch (error) {
    console.error("Error updating expert:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE expert
router.delete("/:id", async (req, res) => {
  try {
    const expert = await Expert.findByIdAndDelete(req.params.id);
    if (!expert) {
      return res.status(404).json({ success: false, message: "Expert not found" });
    }
    res.json({ success: true, message: "Expert deleted successfully" });
  } catch (error) {
    console.error("Error deleting expert:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;