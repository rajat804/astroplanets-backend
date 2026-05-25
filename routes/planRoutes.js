// routes/planRoutes.js
const express = require("express");
const {
  createPlan,
  getAllPlansAdmin,
  getActivePlans,
  getSinglePlan,
  updatePlan,
  deletePlan,
} = require("../controllers/planController");

const router = express.Router();

// CREATE PLAN
router.post("/", createPlan);

// GET ALL PLANS ADMIN
router.get("/admin/all", getAllPlansAdmin);

// GET ACTIVE PLANS
router.get("/", getActivePlans);

// GET SINGLE PLAN
router.get("/:id", getSinglePlan);

// UPDATE PLAN
router.put("/:id", updatePlan);

// DELETE PLAN
router.delete("/:id", deletePlan);

module.exports = router;