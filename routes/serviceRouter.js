const express = require("express");
const router = express.Router();
const Service = require("../models/Service");
const { cloudinary } = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary Storage for service images
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "services",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 800, height: 600, crop: "fill" }]
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

// GET all services (public)
router.get("/", async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, services });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all services for admin (including inactive)
router.get("/admin/all", async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json({ success: true, services });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single service
router.get("/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    res.json({ success: true, service });
  } catch (error) {
    console.error("Error fetching service:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE service
router.post("/", async (req, res) => {
  try {
    const serviceData = req.body;
    const service = new Service(serviceData);
    await service.save();
    res.status(201).json({ success: true, service, message: "Service created successfully" });
  } catch (error) {
    console.error("Error creating service:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE service
router.put("/:id", async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    res.json({ success: true, service, message: "Service updated successfully" });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE service
router.delete("/:id", async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    res.json({ success: true, message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;