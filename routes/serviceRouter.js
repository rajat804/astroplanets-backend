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

// ==================== DYNAMIC API ENDPOINTS ====================

// GET all service titles (dynamic dropdown options)
router.get("/titles", async (req, res) => {
  try {
    const titles = await Service.aggregate([
      { $match: { isActive: true } },
      { $group: { 
        _id: "$titleKey", 
        label: { $first: "$title" },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    const titleOptions = titles
      .filter(t => t._id && t._id !== "")
      .map(title => ({
        value: title._id,
        label: title.label || `${title._id.charAt(0).toUpperCase() + title._id.slice(1)} Online Consultation`,
        count: title.count
      }));
    
    res.json({ success: true, titles: titleOptions });
  } catch (error) {
    console.error("Error fetching titles:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET categories by title key (dynamic categories)
router.get("/categories/:titleKey", async (req, res) => {
  try {
    const { titleKey } = req.params;
    
    const services = await Service.find({ 
      titleKey: titleKey,
      isActive: true 
    }).select("category categoryDescription");
    
    // Get unique categories with their descriptions
    const categoryMap = new Map();
    services.forEach(service => {
      if (service.category && !categoryMap.has(service.category)) {
        categoryMap.set(service.category, {
          value: service.category,
          label: getCategoryLabel(service.category),
          description: service.categoryDescription || getDefaultDescription(service.category, titleKey)
        });
      }
    });
    
    const categories = Array.from(categoryMap.values());
    
    res.json({ success: true, categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to get category label
function getCategoryLabel(categoryValue) {
  const labelMap = {
    // Palmistry
    career_counselling: "Career Counselling",
    relationship_counselling: "Relationship Counselling",
    all_over_guidance: "All Over Guidance",
    // Vastu
    home_vastu_1bhk: "Home Vastu (1BHK)",
    home_vastu_2bhk: "Home Vastu (2BHK)",
    home_vastu_other: "Home Vastu (Other)",
    plot_vastu: "Plot Vastu",
    factory_vastu: "Factory Vastu",
    // Numerology
    name_numerology: "Name Numerology",
    marriage_compatibility: "Marriage Compatibility",
    vehicle_number_selection: "Vehicle Number Selection",
    // Yoga
    counselling: "Counselling",
  };
  return labelMap[categoryValue] || categoryValue.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

// Helper function to get default description
function getDefaultDescription(category, titleKey) {
  const descriptions = {
    palmistry: {
      career_counselling: "Get guidance on career path, job changes, promotions, and professional growth based on your palm lines.",
      relationship_counselling: "Understand relationship dynamics, compatibility, and solutions for love, marriage, and family matters.",
      all_over_guidance: "Complete palmistry analysis covering career, relationships, health, wealth, and life predictions."
    },
    vastu: {
      home_vastu_1bhk: "Vastu analysis and remedies for 1BHK apartments/homes to enhance positive energy flow.",
      home_vastu_2bhk: "Complete Vastu consultation for 2BHK homes including room placements, directions, and remedies.",
      home_vastu_other: "Custom Vastu solutions for 3BHK, 4BHK, villas, and other residential properties.",
      plot_vastu: "Vastu guidance for plot selection, shape analysis, direction planning, and construction advice.",
      factory_vastu: "Industrial Vastu for factories, warehouses, and manufacturing units to improve productivity."
    },
    numerology: {
      name_numerology: "Analyze your name numbers for success, compatibility, and life path corrections.",
      marriage_compatibility: "Numerology-based compatibility check for marriage, partnerships, and relationships.",
      vehicle_number_selection: "Select lucky vehicle numbers for safety, success, and positive journeys."
    },
    yoga: {
      counselling: "Personalized yoga counselling for mental peace, stress relief, and holistic wellness."
    }
  };
  
  return descriptions[titleKey]?.[category] || "Professional consultation service with detailed analysis and personalized guidance.";
}

// GET all services (public) - Active only
router.get("/", async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, services });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET services by titleKey (dynamic)
router.get("/by-title/:titleKey", async (req, res) => {
  try {
    const { titleKey } = req.params;
    const services = await Service.find({ 
      isActive: true, 
      titleKey: titleKey 
    }).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, services });
  } catch (error) {
    console.error("Error fetching services by title:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET services by category (dynamic)
router.get("/by-category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const services = await Service.find({ 
      isActive: true, 
      category: category 
    }).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, services });
  } catch (error) {
    console.error("Error fetching services by category:", error);
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

// CREATE service (dynamic)
router.post("/", async (req, res) => {
  try {
    const serviceData = req.body;
    
    // Validate required fields
    if (!serviceData.titleKey) {
      return res.status(400).json({ success: false, message: "Service title key is required" });
    }
    if (!serviceData.category) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }
    if (!serviceData.description) {
      return res.status(400).json({ success: false, message: "Description is required" });
    }
    if (!serviceData.price) {
      return res.status(400).json({ success: false, message: "Price is required" });
    }
    if (!serviceData.image) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }
    
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
    const { id } = req.params;
    const updateData = req.body;
    
    const service = await Service.findByIdAndUpdate(
      id,
      updateData,
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

// BULK UPDATE - Update order/featured status for multiple services
router.patch("/bulk-update", async (req, res) => {
  try {
    const { updates } = req.body;
    const promises = updates.map(update => 
      Service.findByIdAndUpdate(update.id, update.data, { new: true })
    );
    const updatedServices = await Promise.all(promises);
    res.json({ success: true, services: updatedServices, message: "Services updated successfully" });
  } catch (error) {
    console.error("Error bulk updating services:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET featured services
router.get("/featured/all", async (req, res) => {
  try {
    const services = await Service.find({ isActive: true, featured: true }).sort({ order: 1 });
    res.json({ success: true, services });
  } catch (error) {
    console.error("Error fetching featured services:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET service statistics for admin dashboard
router.get("/admin/stats", async (req, res) => {
  try {
    const total = await Service.countDocuments();
    const active = await Service.countDocuments({ isActive: true });
    const inactive = await Service.countDocuments({ isActive: false });
    const featured = await Service.countDocuments({ featured: true });
    
    // Count by titleKey (dynamic)
    const titleKeys = await Service.distinct("titleKey");
    const byTitle = {};
    for (const key of titleKeys) {
      if (key && key !== "") {
        byTitle[key] = await Service.countDocuments({ titleKey: key });
      }
    }
    
    res.json({
      success: true,
      stats: {
        total,
        active,
        inactive,
        featured,
        byTitle
      }
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;