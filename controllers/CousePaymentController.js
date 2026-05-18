const Razorpay = require("razorpay");
const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const amount = parseInt(course.price.replace(/[^0-9]/g, "")) * 100;

    const options = {
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    const payment = await Payment.create({
      course: courseId,
      user: userId,
      amount: amount / 100,
      razorpayOrderId: order.id,
      status: "pending"
    });

    res.json({ success: true, orderId: order.id, amount: amount / 100, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { status: "paid", razorpayPaymentId, enrolledAt: new Date() },
      { new: true }
    );

    await Enrollment.create({
      user: payment.user,
      course: payment.course,
      payment: payment._id,
      status: "active"
    });

    res.json({ success: true, message: "Payment verified & enrolled successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};