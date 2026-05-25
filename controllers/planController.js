// controllers/planController.js
const Plan = require("../models/Plan");

// CREATE PLAN
const createPlan = async (req, res) => {
  try {
    // Validate required fields
    const { name, mrpPrice, sellingPrice, duration, features } = req.body;
    
    if (!name || !mrpPrice || !sellingPrice || !duration || !features || features.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, mrpPrice, sellingPrice, duration, and features are required"
      });
    }

    // Validate prices
    if (sellingPrice > mrpPrice) {
      return res.status(400).json({
        success: false,
        message: "Selling price cannot be greater than MRP"
      });
    }

    const newPlan = new Plan(req.body);
    await newPlan.save();

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      plan: newPlan,
    });
  } catch (error) {
    console.log("CREATE PLAN ERROR =>", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Plan with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create plan",
      error: error.message,
    });
  }
};

// GET ALL PLANS (ADMIN)
const getAllPlansAdmin = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (error) {
    console.log("GET ALL PLANS ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch plans",
    });
  }
};

// GET ACTIVE PLANS (USER)
const getActivePlans = async (req, res) => {
  try {
    const plans = await Plan.find({ status: "active" }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (error) {
    console.log("GET ACTIVE PLANS ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active plans",
    });
  }
};

// GET SINGLE PLAN
const getSinglePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    console.log("GET SINGLE PLAN ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch plan",
    });
  }
};

// UPDATE PLAN
const updatePlan = async (req, res) => {
  try {
    // Validate prices if provided
    if (req.body.sellingPrice && req.body.mrpPrice) {
      if (req.body.sellingPrice > req.body.mrpPrice) {
        return res.status(400).json({
          success: false,
          message: "Selling price cannot be greater than MRP"
        });
      }
    }

    const updatedPlan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Plan updated successfully",
      plan: updatedPlan,
    });
  } catch (error) {
    console.log("UPDATE PLAN ERROR =>", error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Plan with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update plan",
    });
  }
};

// DELETE PLAN
const deletePlan = async (req, res) => {
  try {
    const deletedPlan = await Plan.findByIdAndDelete(req.params.id);

    if (!deletedPlan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    console.log("DELETE PLAN ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete plan",
    });
  }
};

module.exports = {
  createPlan,
  getAllPlansAdmin,
  getActivePlans,
  getSinglePlan,
  updatePlan,
  deletePlan,
};