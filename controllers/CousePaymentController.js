// controllers/coursePaymentController.js

const Razorpay = require("razorpay");
const Payment = require("../models/CoursePayment");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

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

// ============================================
// 1. CREATE ORDER - UPDATED
// ============================================
exports.createOrder = async (req, res) => {
  try {
    const { 
      courseId,
      preferredDate,
      preferredTime,
      duration,
      userPhone
    } = req.body;
    
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = req.user.fullName || req.user.name || "User";

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: "Course not found" 
      });
    }

    const amount = parseInt(course.price.replace(/[^0-9]/g, "")) * 100;

    const options = {
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        courseId: courseId,
        courseTitle: course.title,
        preferredDate: preferredDate || "",
        preferredTime: preferredTime || "",
      },
    };

    const order = await razorpay.orders.create(options);

    // ✅ Save payment with schedule fields
    const payment = await Payment.create({
      courseId: courseId,
      userId: userId,
      userEmail: userEmail,
      userName: userName,
      userPhone: userPhone || "",
      amount: amount / 100,
      razorpayOrderId: order.id,
      status: "pending",
      classStatus: "scheduled",
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || "",
      duration: duration || "60",
      meetLink: "",
    });

    res.json({ 
      success: true, 
      orderId: order.id, 
      amount: amount / 100, 
      course,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ============================================
// 2. VERIFY PAYMENT - UPDATED
// ============================================
exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature,
      preferredDate,
      preferredTime,
      duration,
    } = req.body;

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid signature" 
      });
    }

    // ✅ Update payment with schedule fields
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { 
        status: "success", 
        razorpayPaymentId, 
        enrolledAt: new Date(),
        updatedAt: new Date(),
        ...(preferredDate && { preferredDate: new Date(preferredDate) }),
        ...(preferredTime && { preferredTime: preferredTime }),
        ...(duration && { duration: duration }),
        classStatus: preferredDate ? getClassStatusFromDate(preferredDate) : "scheduled",
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    await Enrollment.create({
      user: payment.userId,
      course: payment.courseId,
      payment: payment._id,
      status: "active",
      enrolledAt: new Date(),
    });

    await Course.findByIdAndUpdate(payment.courseId, {
      $inc: { enrolledStudents: 1 },
    });

    res.json({ 
      success: true, 
      message: "Payment verified & enrolled successfully!",
      payment: {
        _id: payment._id,
        courseId: payment.courseId,
        userName: payment.userName,
        userEmail: payment.userEmail,
        amount: payment.amount,
        classStatus: payment.classStatus,
        preferredDate: payment.preferredDate,
        preferredTime: payment.preferredTime,
        meetLink: payment.meetLink,
      }
    });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};