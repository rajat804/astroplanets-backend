const express = require("express");
const router = express.Router();
const multer = require("multer");
const Course = require("../models/Course");
const { cloudinary } = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "course-images",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 800, height: 600, crop: "fill" }]
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Upload single image endpoint
router.post("/upload/single", upload.single("image"), (req, res) => {
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

// Get unique course types
router.get("/types", async (req, res) => {
  try {
    const types = await Course.distinct("type");
    res.json({ 
      success: true, 
      types: types.filter(type => type && type !== null)
    });
  } catch (error) {
    console.error("Error fetching course types:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all courses
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json({ success: true, courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single course
router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    res.json({ success: true, course });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE Course
router.post("/", async (req, res) => {
  try {
    const {
      type,
      title,
      level,
      duration,
      sessions,
      courseLanguage,
      mode,
      mrpPrice,
      price,
      gstPercentage,
      extraDiscount,
      rating,
      image,
      description,
      longDescription,
      syllabus,
      includes,
      isActive,
      enrolledStudents
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!price) {
      return res.status(400).json({ success: false, message: "Price is required" });
    }
    if (!image) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }
    if (!description) {
      return res.status(400).json({ success: false, message: "Description is required" });
    }

    // Parse syllabus and includes
    let parsedSyllabus = [];
    let parsedIncludes = [];
    
    if (syllabus) {
      if (Array.isArray(syllabus)) {
        parsedSyllabus = syllabus.filter(s => s && s.trim());
      } else if (typeof syllabus === "string") {
        try {
          parsedSyllabus = JSON.parse(syllabus);
        } catch (e) {
          parsedSyllabus = [syllabus];
        }
      }
    }
    
    if (includes) {
      if (Array.isArray(includes)) {
        parsedIncludes = includes.filter(i => i && i.trim());
      } else if (typeof includes === "string") {
        try {
          parsedIncludes = JSON.parse(includes);
        } catch (e) {
          parsedIncludes = [includes];
        }
      }
    }

    const courseData = {
      type: type || "numerology",
      title: title.trim(),
      level: level || "Diploma",
      duration: duration || "3 Months",
      sessions: sessions || "30+",
      courseLanguage: courseLanguage || "Hindi, English",
      mode: mode || "Live Online",
      mrpPrice: mrpPrice || "",
      price: price.trim(),
      gstPercentage: gstPercentage ? Number(gstPercentage) : 18,
      extraDiscount: extraDiscount ? Number(extraDiscount) : 0,
      rating: rating ? Number(rating) : 0,
      image: image.trim(),
      description: description.trim(),
      longDescription: longDescription || "",
      syllabus: parsedSyllabus,
      includes: parsedIncludes,
      isActive: isActive === true || isActive === "true",
      enrolledStudents: enrolledStudents ? Number(enrolledStudents) : 0
    };

    const course = new Course(courseData);
    await course.save();

    res.status(201).json({ 
      success: true, 
      course,
      message: "Course created successfully"
    });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message
    });
  }
});

// UPDATE Course
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    const updateData = {};
    
    // Map all fields
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.level !== undefined) updateData.level = req.body.level;
    if (req.body.duration !== undefined) updateData.duration = req.body.duration;
    if (req.body.sessions !== undefined) updateData.sessions = req.body.sessions;
    
    if (req.body.courseLanguage !== undefined) {
      updateData.courseLanguage = req.body.courseLanguage;
    } else if (req.body.language !== undefined) {
      updateData.courseLanguage = req.body.language;
    }
    
    if (req.body.mode !== undefined) updateData.mode = req.body.mode;
    if (req.body.mrpPrice !== undefined) updateData.mrpPrice = req.body.mrpPrice;
    if (req.body.price !== undefined) updateData.price = req.body.price;
    if (req.body.gstPercentage !== undefined) updateData.gstPercentage = Number(req.body.gstPercentage);
    if (req.body.extraDiscount !== undefined) updateData.extraDiscount = Number(req.body.extraDiscount);
    if (req.body.rating !== undefined) updateData.rating = Number(req.body.rating);
    if (req.body.image !== undefined) updateData.image = req.body.image;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.longDescription !== undefined) updateData.longDescription = req.body.longDescription;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    if (req.body.enrolledStudents !== undefined) updateData.enrolledStudents = Number(req.body.enrolledStudents);
    
    // Handle syllabus
    if (req.body.syllabus !== undefined) {
      let syllabus = req.body.syllabus;
      if (typeof syllabus === "string") {
        try {
          syllabus = JSON.parse(syllabus);
        } catch (e) {
          syllabus = [syllabus];
        }
      }
      updateData.syllabus = Array.isArray(syllabus) ? syllabus.filter(s => s && s.trim()) : [];
    }
    
    // Handle includes
    if (req.body.includes !== undefined) {
      let includes = req.body.includes;
      if (typeof includes === "string") {
        try {
          includes = JSON.parse(includes);
        } catch (e) {
          includes = [includes];
        }
      }
      updateData.includes = Array.isArray(includes) ? includes.filter(i => i && i.trim()) : [];
    }
    
    const updatedCourse = await Course.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: false }
    );
    
    res.json({ 
      success: true, 
      course: updatedCourse, 
      message: "Course updated successfully" 
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// DELETE Course
router.delete("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    await course.deleteOne();
    res.json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;