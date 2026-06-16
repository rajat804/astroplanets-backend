// routes/coursePaymentRoutes.js

const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Course = require("../models/Course");
const Payment = require("../models/CoursePayment");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ============================================
// HELPER: Calculate class status from date
// ============================================
const getClassStatusFromDate = (preferredDate) => {
  if (!preferredDate) return 'scheduled';
  
  try {
    const now = new Date();
    const classDate = new Date(preferredDate);
    
    if (isNaN(classDate.getTime())) return 'scheduled';
    
    const diffDays = (classDate - now) / (1000 * 60 * 60 * 24);
    
    if (diffDays > 1) return 'upcoming';
    if (diffDays >= -1 && diffDays <= 1) return 'ongoing';
    return 'completed';
  } catch (error) {
    return 'scheduled';
  }
};

// ==================== ADMIN ENDPOINTS (NO TOKEN REQUIRED) ====================

// GET - Get all successful course purchases with stats (Admin)
router.get("/admin/success-users", async (req, res) => {
  try {
    console.log('🔍 Admin: Fetching all successful course purchases...');
    
    const payments = await Payment.find({ 
      status: "success" 
    })
      .populate("courseId")
      .sort({ createdAt: -1 });
    
    const uniqueUsers = new Set();
    let totalRevenue = 0;
    let meetLinksSet = 0;
    
    const usersData = payments.map(payment => {
      uniqueUsers.add(payment.userEmail);
      totalRevenue += (payment.amount || 0);
      if (payment.meetLink) meetLinksSet++;
      
      return {
        _id: payment._id,
        userName: payment.userName,
        userEmail: payment.userEmail,
        userPhone: payment.userPhone,
        courseId: payment.courseId,
        amount: payment.amount,
        meetLink: payment.meetLink,
        classStatus: payment.classStatus || "scheduled",
        preferredDate: payment.preferredDate || null,
        preferredTime: payment.preferredTime || "",
        duration: payment.duration || "60",
        createdAt: payment.createdAt,
        status: payment.status,
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpayOrderId: payment.razorpayOrderId
      };
    });
    
    console.log(`✅ Admin: Found ${payments.length} successful purchases`);
    console.log(`📊 Stats: ${uniqueUsers.size} unique users, Total Revenue: ₹${totalRevenue}`);
    
    res.status(200).json({
      success: true,
      users: usersData,
      stats: {
        total: payments.length,
        uniqueStudents: uniqueUsers.size,
        totalRevenue: totalRevenue,
        meetLinksSet: meetLinksSet
      }
    });
    
  } catch (error) {
    console.log("ADMIN FETCH USERS ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

// ✅ NEW - Update class status (Admin)
router.put("/admin/update-class-status/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { classStatus } = req.body;
    
    const validClassStatuses = ["upcoming", "ongoing", "completed", "cancelled", "scheduled"];
    if (!validClassStatuses.includes(classStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class status. Allowed: upcoming, ongoing, completed, cancelled, scheduled",
      });
    }
    
    const updatedPayment = await Payment.findByIdAndUpdate(
      paymentId,
      { 
        classStatus, 
        updatedAt: new Date() 
      },
      { new: true }
    ).populate("courseId");
    
    if (!updatedPayment) {
      return res.status(404).json({ 
        success: false, 
        message: "Payment record not found" 
      });
    }
    
    console.log(`✅ Admin: Class status updated to ${classStatus} for ${updatedPayment.userName}`);
    
    res.status(200).json({
      success: true,
      message: `Class status updated to ${classStatus} successfully`,
      payment: updatedPayment
    });
    
  } catch (error) {
    console.log("ADMIN UPDATE CLASS STATUS ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to update class status",
    });
  }
});

// ✅ NEW - Update schedule (Admin)
router.put("/admin/update-schedule/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { meetLink, preferredDate, preferredTime, duration, classStatus } = req.body;

    console.log(`🔄 Admin: Updating course schedule for ${paymentId}:`, { meetLink, preferredDate, preferredTime, duration, classStatus });

    const updateData = {};
    if (meetLink !== undefined) updateData.meetLink = meetLink;
    if (preferredDate) updateData.preferredDate = new Date(preferredDate);
    if (preferredTime) updateData.preferredTime = preferredTime;
    if (duration) updateData.duration = duration;
    if (classStatus) updateData.classStatus = classStatus;
    updateData.updatedAt = new Date();

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      updateData,
      { new: true, runValidators: true }
    ).populate("courseId");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    console.log(`✅ Course schedule updated successfully:`, payment);

    res.status(200).json({
      success: true,
      message: "Course schedule updated successfully",
      payment,
    });
  } catch (error) {
    console.error("❌ UPDATE COURSE SCHEDULE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update course schedule",
    });
  }
});

// PUT - Update meet link for a course purchase (Admin)
router.put("/admin/update-meet-link/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { meetLink } = req.body;
    
    console.log(`🔧 Admin: Updating meet link for payment ${paymentId}`);
    console.log(`📎 New meet link: ${meetLink}`);
    
    if (!meetLink) {
      return res.status(400).json({ 
        success: false, 
        message: "Meet link is required" 
      });
    }
    
    const isValidMeetLink = meetLink.includes('meet.google.com') || 
                           meetLink.includes('zoom.us') || 
                           meetLink.includes('meet') ||
                           meetLink.startsWith('https://');
    
    if (!isValidMeetLink) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid meeting link (Google Meet or Zoom)" 
      });
    }
    
    const updatedPayment = await Payment.findByIdAndUpdate(
      paymentId,
      { meetLink: meetLink.trim(), updatedAt: new Date() },
      { new: true }
    ).populate("courseId");
    
    if (!updatedPayment) {
      return res.status(404).json({ 
        success: false, 
        message: "Payment record not found" 
      });
    }
    
    console.log(`✅ Admin: Successfully updated meet link for ${updatedPayment.userName}`);
    
    res.status(200).json({
      success: true,
      message: "Meet link updated successfully",
      payment: {
        _id: updatedPayment._id,
        userName: updatedPayment.userName,
        userEmail: updatedPayment.userEmail,
        courseTitle: updatedPayment.courseId?.title,
        meetLink: updatedPayment.meetLink,
        classStatus: updatedPayment.classStatus
      }
    });
    
  } catch (error) {
    console.log("ADMIN UPDATE MEET LINK ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to update meet link",
    });
  }
});

// GET - Get specific payment details (Admin)
router.get("/admin/payment/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findById(paymentId)
      .populate("courseId");
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: "Payment record not found" 
      });
    }
    
    res.status(200).json({
      success: true,
      payment: {
        _id: payment._id,
        userName: payment.userName,
        userEmail: payment.userEmail,
        userPhone: payment.userPhone,
        courseId: payment.courseId,
        amount: payment.amount,
        meetLink: payment.meetLink,
        classStatus: payment.classStatus || "scheduled",
        preferredDate: payment.preferredDate || null,
        preferredTime: payment.preferredTime || "",
        duration: payment.duration || "60",
        status: payment.status,
        createdAt: payment.createdAt,
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpayOrderId: payment.razorpayOrderId
      }
    });
    
  } catch (error) {
    console.log("ADMIN FETCH PAYMENT ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
    });
  }
});

// DELETE - Delete a payment record (Admin)
router.delete("/admin/delete-payment/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const deletedPayment = await Payment.findByIdAndDelete(paymentId);
    
    if (!deletedPayment) {
      return res.status(404).json({ 
        success: false, 
        message: "Payment record not found" 
      });
    }
    
    console.log(`✅ Admin: Deleted payment record for ${deletedPayment.userName}`);
    
    res.status(200).json({
      success: true,
      message: "Payment record deleted successfully"
    });
    
  } catch (error) {
    console.log("ADMIN DELETE PAYMENT ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete payment record",
    });
  }
});

// GET - Get all payments with filters (Admin)
router.get("/admin/all-payments", async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    let filter = {};
    
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const payments = await Payment.find(filter)
      .populate("courseId")
      .sort({ createdAt: -1 });
    
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    res.status(200).json({
      success: true,
      payments,
      stats: {
        total: payments.length,
        totalRevenue: totalRevenue,
        pending: payments.filter(p => p.status === 'pending').length,
        success: payments.filter(p => p.status === 'success').length,
        failed: payments.filter(p => p.status === 'failed').length
      }
    });
    
  } catch (error) {
    console.log("ADMIN ALL PAYMENTS ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
});

// ==================== USER ENDPOINTS ====================

// GET SUCCESS PAYMENT USERS (Legacy - Keep for compatibility)
router.get("/success-users", async (req, res) => {
  try {
    const users = await Payment.find({
      status: "success",
    })
      .populate("courseId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

// GET user's purchased courses
router.get("/my-courses/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const courses = await Payment.find({
      userId,
      status: "success",
    })
      .populate({
        path: "courseId",
        model: "Course",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalCourses: courses.length,
      courses,
    });
  } catch (error) {
    console.log("MY COURSES ERROR =>", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
    });
  }
});

// ============================================
// CREATE ORDER - UPDATED
// ============================================
router.post("/create-order", async (req, res) => {
  try {
    const { 
      courseId, 
      userId, 
      userEmail, 
      userName, 
      userPhone,
      amount,
      preferredDate,
      preferredTime,
      duration
    } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
      notes: {
        courseId: courseId,
        courseTitle: course.title,
        userId: userId,
        preferredDate: preferredDate || "",
        preferredTime: preferredTime || "",
      },
    };

    const order = await razorpay.orders.create(options);

    // ✅ Save payment with schedule fields
    const payment = new Payment({
      courseId: courseId,
      userId: userId,
      userEmail: userEmail,
      userName: userName,
      userPhone: userPhone || "",
      amount: amount,
      currency: "INR",
      razorpayOrderId: order.id,
      status: "pending",
      classStatus: "scheduled",
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || "",
      duration: duration || "60",
      meetLink: "",
    });
    await payment.save();

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// VERIFY PAYMENT - UPDATED
// ============================================
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      userId,
      preferredDate,
      preferredTime,
      duration,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // ✅ Update payment with schedule fields
    const updatedPayment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "success",
        enrolledAt: new Date(),
        updatedAt: new Date(),
        ...(preferredDate && { preferredDate: new Date(preferredDate) }),
        ...(preferredTime && { preferredTime: preferredTime }),
        ...(duration && { duration: duration }),
        classStatus: preferredDate ? getClassStatusFromDate(preferredDate) : "scheduled",
      },
      { new: true }
    );

    await Course.findByIdAndUpdate(courseId, {
      $inc: { enrolledStudents: 1 },
    });

    res.json({
      success: true,
      message: "Payment verified successfully",
      paymentId: razorpay_payment_id,
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE GOOGLE MEET LINK (User)
router.put("/update-meet-link/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { meetLink } = req.body;

    const updatedPayment = await Payment.findByIdAndUpdate(
      paymentId,
      { meetLink, updatedAt: new Date() },
      { new: true }
    );

    res.status(200).json({
      success: true,
      payment: updatedPayment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to update meet link",
    });
  }
});

module.exports = router;