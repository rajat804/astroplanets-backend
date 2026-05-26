// routes/planPaymentRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createOrder,
  verifyPayment,
  getUserSubscriptions,
  getAllSubscriptions,
  updateMeetLink,
  updateSubscriptionDetails,
} = require("../controllers/planPaymentController");

// USER ROUTES
router.post("/create-order", protect, createOrder);
router.post("/verify-payment", protect, verifyPayment);
router.get("/my-subscriptions", protect, getUserSubscriptions);

// ADMIN ROUTES
router.get("/admin/all-subscriptions", getAllSubscriptions);
router.put("/update-meet-link/:id", updateMeetLink);
router.put("/update-details/:id", updateSubscriptionDetails);
// UPDATE PLAN STATUS
router.put("/update-status/:id", async (req, res) => {
  try {
    const PlanSubscription = require("../models/PlanSubscription");
    const { status } = req.body;
    
    const subscription = await PlanSubscription.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Plan status updated to ${status} successfully`,
      subscription,
    });
  } catch (error) {
    console.log("UPDATE PLAN STATUS ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to update plan status",
    });
  }
});

module.exports = router;