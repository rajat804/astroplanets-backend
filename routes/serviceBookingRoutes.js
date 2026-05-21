const express = require("express");
const router = express.Router();
const ServiceBooking = require("../models/ServiceBooking");
const Service = require("../models/Service");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send email function
const sendBookingEmails = async (bookingData, service, paymentId) => {
  // Email to Admin
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: "contact.astroplanets@gmail.com",
    subject: `💰 New Paid Booking: ${service.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; }
          .info-row { margin-bottom: 12px; padding: 10px; background: white; border-radius: 8px; border-left: 3px solid #764ba2; }
          .label { font-weight: bold; color: #764ba2; min-width: 120px; display: inline-block; }
          .payment-status { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; }
          .footer { text-align: center; padding: 15px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>💰 New Paid Booking Request 💰</h2>
          </div>
          <div class="content">
            <div class="payment-status">✅ Payment Received</div>
            <h3>📋 Service Details:</h3>
            <div class="info-row"><span class="label">Service:</span> ${service.title}</div>
            <div class="info-row"><span class="label">Duration:</span> ${service.duration}</div>
            <div class="info-row"><span class="label">Amount Paid:</span> ₹${bookingData.amount}</div>
            <div class="info-row"><span class="label">Payment ID:</span> ${paymentId}</div>
            
            <h3>👤 Customer Details:</h3>
            <div class="info-row"><span class="label">Name:</span> ${bookingData.userName}</div>
            <div class="info-row"><span class="label">Email:</span> ${bookingData.userEmail}</div>
            <div class="info-row"><span class="label">Phone:</span> ${bookingData.userPhone}</div>
            
            <h3>📅 Booking Details:</h3>
            <div class="info-row"><span class="label">Preferred Date:</span> ${bookingData.preferredDate}</div>
            <div class="info-row"><span class="label">Preferred Time:</span> ${bookingData.preferredTime}</div>
            <div class="info-row"><span class="label">Message:</span> ${bookingData.message || "No message provided"}</div>
          </div>
          <div class="footer">
            <p>Please contact the customer within 24 hours to confirm the appointment.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  // Email to Customer
  const customerMailOptions = {
    from: process.env.EMAIL_USER,
    to: bookingData.userEmail,
    subject: `✨ Booking Confirmed: ${service.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; text-align: center; }
          .payment-status { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✨ Payment Successful! Booking Confirmed ✨</h2>
          </div>
          <div class="content">
            <div class="payment-status">✅ Payment Received - ₹${bookingData.amount}</div>
            <p>Dear <strong>${bookingData.userName}</strong>,</p>
            <p>Thank you for booking <strong>${service.title}</strong> with us!</p>
            <p>Your payment has been received successfully. We will contact you within <strong>24 hours</strong> to confirm your appointment.</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>📅 Preferred Date:</strong> ${bookingData.preferredDate}</p>
              <p><strong>⏰ Preferred Time:</strong> ${bookingData.preferredTime}</p>
              <p><strong>💰 Amount Paid:</strong> ₹${bookingData.amount}</p>
              <p><strong>💳 Payment ID:</strong> ${paymentId}</p>
            </div>
            
            <p>If you have any questions, feel free to reply to this email.</p>
            <br>
            <p>With gratitude,<br><strong>Astrology Platform Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(adminMailOptions);
  await transporter.sendMail(customerMailOptions);
};

// CREATE ORDER
router.post("/create-order", async (req, res) => {
  try {
    const { serviceId, userId, userEmail, userName, amount } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `service_${Date.now()}`,
      payment_capture: 1,
      notes: {
        serviceId: serviceId,
        serviceTitle: service.title,
        userId: userId,
      },
    };

    const order = await razorpay.orders.create(options);

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

// VERIFY PAYMENT AND CREATE BOOKING
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      serviceId,
      userId,
      userName,
      userEmail,
      userPhone,
      preferredDate,
      preferredTime,
      message,
      amount
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

    // Get service details
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    // Create booking record
    const booking = new ServiceBooking({
      serviceId,
      serviceTitle: service.title,
      userId,
      userName,
      userEmail,
      userPhone,
      preferredDate,
      preferredTime,
      message: message || "",
      amount,
      status: "confirmed",
      paymentId: razorpay_payment_id
    });

    await booking.save();

    // Send emails
    await sendBookingEmails({
      userName,
      userEmail,
      userPhone,
      preferredDate,
      preferredTime,
      message,
      amount
    }, service, razorpay_payment_id);

    res.json({
      success: true,
      booking,
      paymentId: razorpay_payment_id,
      message: "Payment verified and booking confirmed!"
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all bookings for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const bookings = await ServiceBooking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all bookings (admin)
router.get("/all", async (req, res) => {
  try {
    const bookings = await ServiceBooking.find().sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// GET CONFIRMED SERVICE BOOKINGS ONLY
router.get("/confirmed", async (req, res) => {
  try {
    const bookings = await ServiceBooking.find({ 
      status: { $in: ["confirmed", "success"] }
    }).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching confirmed bookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET CONFIRMED SERVICE BOOKINGS BY USER
router.get("/user/:userId/confirmed", async (req, res) => {
  try {
    const bookings = await ServiceBooking.find({ 
      userId: req.params.userId,
      status: { $in: ["confirmed", "success"] }
    }).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching user confirmed bookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// UPDATE SERVICE MEET LINK
router.put("/update-meet-link/:id", async (req, res) => {
  try {
    const { meetLink } = req.body;
    const booking = await ServiceBooking.findByIdAndUpdate(
      req.params.id,
      { meetLink },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    res.json({ success: true, booking, message: "Meet link updated successfully" });
  } catch (error) {
    console.error("Error updating meet link:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;