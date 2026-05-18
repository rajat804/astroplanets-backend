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

// GET SUCCESS PAYMENT USERS
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


// Create Order
router.post("/create-order", async (req, res) => {
  try {
    const { courseId, userId, userEmail, userName, amount } = req.body;

    // Get course details
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
      },
    };

    const order = await razorpay.orders.create(options);

    // Save payment record
    const payment = new Payment({
      courseId: courseId,
      userId: userId,
      userEmail: userEmail,
      userName: userName,
      amount: amount,
      currency: "INR",
      razorpayOrderId: order.id,
      status: "pending",
    });
    await payment.save();

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify Payment
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      userId,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // Update payment record
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "success",
        enrolledAt: new Date(),
      }
    );

    // Update course enrollment count
    await Course.findByIdAndUpdate(courseId, {
      $inc: { enrolledStudents: 1 },
    });

    res.json({
      success: true,
      message: "Payment verified successfully",
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});



// UPDATE GOOGLE MEET LINK
router.put("/update-meet-link/:paymentId", async (req, res) => {

  try {

    const { paymentId } = req.params;

    const { meetLink } = req.body;

    const updatedPayment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        meetLink,
      },
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