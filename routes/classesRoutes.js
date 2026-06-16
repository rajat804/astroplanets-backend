// routes/classesRoutes.js

const express = require('express');
const router = express.Router();
const Class = require('../models/Class');

// ==================== ADMIN ENDPOINTS ====================

// GET - Get all classes
router.get('/admin/all', async (req, res) => {
  try {
    const classes = await Class.find().sort({ date: 1, time: 1 });
    res.json({ success: true, classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Create new class
router.post('/admin/create', async (req, res) => {
  try {
    const { title, description, date, time, duration, meetLink, teacher, maxStudents, status } = req.body;
    
    const newClass = new Class({
      title,
      description,
      date,
      time,
      duration: parseInt(duration),
      meetLink,
      teacher,
      maxStudents: parseInt(maxStudents),
      status: status || 'upcoming'
    });
    
    await newClass.save();
    res.json({ success: true, class: newClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Update class
router.put('/admin/update/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const updatedClass = await Class.findByIdAndUpdate(classId, req.body, { new: true });
    
    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    
    res.json({ success: true, class: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Update class status
router.put('/admin/update-status/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const { status } = req.body;
    
    const updatedClass = await Class.findByIdAndUpdate(classId, { status }, { new: true });
    res.json({ success: true, class: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Delete class
router.delete('/admin/delete/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    await Class.findByIdAndDelete(classId);
    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== USER ENDPOINTS ====================

// GET - Get upcoming classes for users
router.get('/upcoming', async (req, res) => {
  try {
    const classes = await Class.find({ 
      status: 'upcoming',
      date: { $gte: new Date() }
    }).sort({ date: 1, time: 1 });
    res.json({ success: true, classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;