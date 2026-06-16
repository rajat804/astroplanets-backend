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
    updateSchedule,
    updateClassStatus,  // ✅ NEW
    updatePlanStatus,
} = require("../controllers/planPaymentController");

// ============================================
// USER ROUTES
// ============================================
router.post("/create-order", protect, createOrder);
router.post("/verify-payment", protect, verifyPayment);
router.get("/my-subscriptions", protect, getUserSubscriptions);

// ============================================
// ADMIN ROUTES
// ============================================

// Get all subscriptions
router.get("/admin/all-subscriptions", getAllSubscriptions);

// Update meet link only
router.put("/update-meet-link/:id", updateMeetLink);

// Update subscription details (full update - both payment & class status)
router.put("/update-details/:id", updateSubscriptionDetails);

// ✅ Update plan schedule (date, time, meet link, class status)
router.put("/admin/update-schedule/:id", updateSchedule);

// ✅ Update only class status (NEW)
router.put("/admin/update-class-status/:id", updateClassStatus);

// ✅ Update only payment status
router.put("/update-status/:id", updatePlanStatus);

module.exports = router;