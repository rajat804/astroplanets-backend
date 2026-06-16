// routes/rashiFalRoutes.js
const express = require('express');
const router = express.Router();
const RashiFal = require('../models/RashiFal');

// ==================== PUBLIC ROUTES ====================

// GET - All rashis
router.get('/', async (req, res) => {
  try {
    const rashis = await RashiFal.find({ is_active: true }).sort({ name: 1 });
    res.json({ success: true, rashis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Single rashi by slug
router.get('/:slug', async (req, res) => {
  try {
    const rashi = await RashiFal.findOne({ slug: req.params.slug, is_active: true });
    if (!rashi) {
      return res.status(404).json({ success: false, message: 'Rashi not found' });
    }
    res.json({ success: true, rashi });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Yearly prediction for a rashi
router.get('/:slug/yearly', async (req, res) => {
  try {
    const rashi = await RashiFal.findOne({ slug: req.params.slug });
    if (!rashi) {
      return res.status(404).json({ success: false, message: 'Rashi not found' });
    }
    res.json({ 
      success: true, 
      rashi: rashi.name,
      yearly_predictions: rashi.yearly_predictions,
      year: new Date().getFullYear()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Monthly prediction for a rashi
router.get('/:slug/monthly/:month', async (req, res) => {
  try {
    const { slug, month } = req.params;
    const rashi = await RashiFal.findOne({ slug });
    if (!rashi) {
      return res.status(404).json({ success: false, message: 'Rashi not found' });
    }
    
    const monthMap = {
      'january': 'january', 'february': 'february', 'march': 'march',
      'april': 'april', 'may': 'may', 'june': 'june',
      'july': 'july', 'august': 'august', 'september': 'september',
      'october': 'october', 'november': 'november', 'december': 'december'
    };
    
    const monthlyData = rashi.monthly_predictions[monthMap[month.toLowerCase()]] || '';
    
    res.json({ 
      success: true, 
      rashi: rashi.name,
      month: month,
      prediction: monthlyData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

// GET - All rashis (admin)
router.get('/admin/all', async (req, res) => {
  try {
    const rashis = await RashiFal.find().sort({ name: 1 });
    res.json({ success: true, rashis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Single rashi by id (admin)
router.get('/admin/:id', async (req, res) => {
  try {
    const rashi = await RashiFal.findById(req.params.id);
    if (!rashi) {
      return res.status(404).json({ success: false, message: 'Rashi not found' });
    }
    res.json({ success: true, rashi });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Create new rashi fal
router.post('/admin/create', async (req, res) => {
  try {
    const {
      name, name_hi, symbol, slug, color, element,
      ruling_planet, lucky_color, lucky_number,
      yearly_predictions, monthly_predictions,
      weekly_predictions, daily_predictions,
      health, career, love, finance, remedies,
      mantra, image_url, meta_title, meta_description
    } = req.body;

    // Check if slug already exists
    const existingRashi = await RashiFal.findOne({ slug });
    if (existingRashi) {
      return res.status(400).json({ success: false, message: 'Slug already exists' });
    }

    const rashiFal = new RashiFal({
      name, name_hi, symbol, slug, color, element,
      ruling_planet, lucky_color, lucky_number,
      yearly_predictions, monthly_predictions,
      weekly_predictions, daily_predictions,
      health, career, love, finance, remedies,
      mantra, image_url, meta_title, meta_description
    });

    await rashiFal.save();
    res.json({ success: true, message: 'Rashi Fal created successfully', rashiFal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Update rashi fal
router.put('/admin/update/:id', async (req, res) => {
  try {
    const updatedRashi = await RashiFal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedRashi) {
      return res.status(404).json({ success: false, message: 'Rashi not found' });
    }
    
    res.json({ success: true, message: 'Rashi Fal updated successfully', rashi: updatedRashi });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Delete rashi fal
router.delete('/admin/delete/:id', async (req, res) => {
  try {
    const deletedRashi = await RashiFal.findByIdAndDelete(req.params.id);
    if (!deletedRashi) {
      return res.status(404).json({ success: false, message: 'Rashi not found' });
    }
    res.json({ success: true, message: 'Rashi Fal deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;