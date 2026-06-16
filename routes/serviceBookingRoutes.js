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

// Helper function to get category display name
const getCategoryDisplayName = (categoryValue) => {
  const categoryMap = {
    career_counselling: "Career Counselling",
    relationship_counselling: "Relationship Counselling",
    all_over_guidance: "All Over Guidance",
    home_vastu_1bhk: "Home Vastu (1BHK)",
    home_vastu_2bhk: "Home Vastu (2BHK)",
    home_vastu_other: "Home Vastu (Other)",
    plot_vastu: "Plot Vastu",
    factory_vastu: "Factory Vastu",
    name_numerology: "Name Numerology",
    marriage_compatibility: "Marriage Compatibility",
    vehicle_number_selection: "Vehicle Number Selection",
    counselling: "Counselling",
  };
  return categoryMap[categoryValue] || categoryValue || "General";
};

// Enhanced Send email function with all dynamic fields
const sendBookingEmails = async (bookingData, service, paymentId) => {
  const categoryDisplayName = getCategoryDisplayName(service.category);
  const serviceTypeDisplay = service.titleKey ? service.titleKey.charAt(0).toUpperCase() + service.titleKey.slice(1) : "Expert";

  // Email to Admin
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: "contact.astroplanets@gmail.com",
    subject: `💰 New Paid Booking: ${service.title} (${categoryDisplayName})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; padding: 25px; text-align: center; border-radius: 15px 15px 0 0; }
          .content { background: white; padding: 25px; border-radius: 0 0 15px 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .info-row { margin-bottom: 12px; padding: 10px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #8b5cf6; }
          .label { font-weight: bold; color: #8b5cf6; min-width: 140px; display: inline-block; }
          .payment-status { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; margin-bottom: 20px; font-weight: bold; }
          .category-badge { background: #8b5cf6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; margin-left: 10px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; margin-top: 20px; }
          h3 { color: #333; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>💰 New Paid Booking Request</h2>
            <p style="margin-top: 5px; opacity: 0.9;">${serviceTypeDisplay} Consultation</p>
          </div>
          <div class="content">
            <div class="payment-status">✅ Payment Received - ₹${bookingData.amount}</div>
            
            <h3>📋 Service Details:</h3>
            <div class="info-row"><span class="label">Service:</span> ${service.title}</div>
            <div class="info-row"><span class="label">Category:</span> ${categoryDisplayName}</div>
            <div class="info-row"><span class="label">Service Type:</span> ${serviceTypeDisplay}</div>
            <div class="info-row"><span class="label">Duration:</span> ${service.duration || "Not specified"}</div>
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
            <p style="margin-top: 10px;">🔮 Astrology Platform Team</p>
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
    subject: `✨ Booking Confirmed: ${service.title} - ${categoryDisplayName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; padding: 25px; text-align: center; border-radius: 15px 15px 0 0; }
          .content { background: white; padding: 25px; border-radius: 0 0 15px 15px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .payment-status { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; margin-bottom: 20px; font-weight: bold; }
          .info-card { background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: left; }
          .info-card p { margin: 10px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; margin-top: 20px; }
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
            <p><strong>Service Category:</strong> ${categoryDisplayName}</p>
            <p>Your payment has been received successfully. We will contact you within <strong>24 hours</strong> to confirm your appointment.</p>
            
            <div class="info-card">
              <p><strong>📅 Preferred Date:</strong> ${bookingData.preferredDate}</p>
              <p><strong>⏰ Preferred Time:</strong> ${bookingData.preferredTime}</p>
              <p><strong>💰 Amount Paid:</strong> ₹${bookingData.amount}</p>
              <p><strong>💳 Payment ID:</strong> ${paymentId}</p>
              ${service.duration ? `<p><strong>⏱️ Duration:</strong> ${service.duration}</p>` : ''}
            </div>
            
            <p><strong>What happens next?</strong></p>
            <ol style="text-align: left;">
              <li>Our team will review your booking</li>
              <li>You'll receive a confirmation call/message</li>
              <li>Meeting link will be shared before the session</li>
              <li>Get ready for your consultation</li>
            </ol>
            
            <p>If you have any questions, feel free to reply to this email.</p>
            <br>
            <p>With gratitude,<br><strong>Astrology Platform Team</strong></p>
          </div>
          <div class="footer">
            <p>🔮 Thank you for choosing us!</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(adminMailOptions);
  await transporter.sendMail(customerMailOptions);
};

// ============================================
// 1. CREATE ORDER
// ============================================
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
        serviceTitleKey: service.titleKey || "",
        serviceCategory: service.category || "",
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
      serviceDetails: {
        title: service.title,
        titleKey: service.titleKey,
        category: service.category,
        categoryDescription: service.categoryDescription,
        duration: service.duration,
        icon: service.icon,
        gradientKey: service.gradientKey
      }
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 2. VERIFY PAYMENT AND CREATE BOOKING
// ============================================
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

    // Get service details with all fields
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    // ✅ Create booking with both status and classStatus
    const booking = new ServiceBooking({
      serviceId,
      serviceTitle: service.title,
      serviceTitleKey: service.titleKey || "",
      serviceCategory: service.category || "",
      serviceCategoryDescription: service.categoryDescription || "",
      serviceDuration: service.duration || "",
      serviceIcon: service.icon || "GiCrystalBall",
      serviceGradientKey: service.gradientKey || "purple",
      userId,
      userName,
      userEmail,
      userPhone,
      preferredDate,
      preferredTime,
      message: message || "",
      amount,
      status: "confirmed",           // ✅ Payment status
      classStatus: "scheduled",      // ✅ Class status - NEW
      paymentId: razorpay_payment_id,
      meetLink: "",
      notes: ""
    });

    await booking.save();

    // Send enhanced emails with all service details
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

// ============================================
// 3. GET ALL BOOKINGS (Admin)
// ============================================
router.get("/all", async (req, res) => {
  try {
    const bookings = await ServiceBooking.find().sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 4. GET USER BOOKINGS
// ============================================
router.get("/user/:userId", async (req, res) => {
  try {
    const bookings = await ServiceBooking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 5. GET BOOKINGS BY SERVICE TITLE KEY
// ============================================
router.get("/by-title/:titleKey", async (req, res) => {
  try {
    const { titleKey } = req.params;
    const bookings = await ServiceBooking.find({ 
      serviceTitleKey: titleKey 
    }).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching bookings by title:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 6. GET BOOKINGS BY CATEGORY
// ============================================
router.get("/by-category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const bookings = await ServiceBooking.find({ 
      serviceCategory: category 
    }).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching bookings by category:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 7. GET CONFIRMED SERVICE BOOKINGS ONLY
// ============================================
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

// ============================================
// 8. GET USER CONFIRMED BOOKINGS
// ============================================
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

// ============================================
// 9. UPDATE MEET LINK
// ============================================
router.put("/update-meet-link/:id", async (req, res) => {
  try {
    const { meetLink } = req.body;
    const booking = await ServiceBooking.findByIdAndUpdate(
      req.params.id,
      { meetLink, updatedAt: new Date() },
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

// ============================================
// 10. UPDATE PAYMENT STATUS (Admin)
// ============================================
router.put("/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    // ✅ Check if transition is valid
    const booking = await ServiceBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const currentStatus = booking.status;
    
    // ✅ Valid transitions for payment status
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['completed', 'cancelled'],
      'completed': [],      // ❌ Cannot change
      'cancelled': []       // ❌ Cannot change
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change payment status from "${currentStatus}" to "${status}"`,
        allowedTransitions: validTransitions[currentStatus] || []
      });
    }
    
    const updatedBooking = await ServiceBooking.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    res.json({ success: true, booking: updatedBooking, message: `Booking status updated to ${status}` });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 11. UPDATE CLASS STATUS (Admin) - NEW
// ============================================
router.put("/update-class-status/:id", async (req, res) => {
  try {
    const { classStatus } = req.body;
    
    // ✅ Validate class status
    const validClassStatuses = ["upcoming", "ongoing", "completed", "cancelled", "scheduled"];
    if (!validClassStatuses.includes(classStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class status. Allowed: upcoming, ongoing, completed, cancelled, scheduled"
      });
    }
    
    const booking = await ServiceBooking.findByIdAndUpdate(
      req.params.id,
      { classStatus, updatedAt: new Date() },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    
    res.json({ success: true, booking, message: `Class status updated to ${classStatus}` });
  } catch (error) {
    console.error("Error updating class status:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 12. UPDATE SCHEDULE (Admin) - NEW
// ============================================
router.put("/admin/update-schedule/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { meetLink, preferredDate, preferredTime, classStatus } = req.body;

    console.log(`🔄 Updating service booking schedule for ${id}:`, { meetLink, preferredDate, preferredTime, classStatus });

    const updateData = {};
    if (meetLink !== undefined) updateData.meetLink = meetLink;
    if (preferredDate) updateData.preferredDate = preferredDate;
    if (preferredTime) updateData.preferredTime = preferredTime;
    if (classStatus) updateData.classStatus = classStatus;
    updateData.updatedAt = new Date();

    const booking = await ServiceBooking.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    console.log(`✅ Service booking schedule updated successfully:`, booking);

    res.status(200).json({
      success: true,
      message: "Booking schedule updated successfully",
      booking
    });
  } catch (error) {
    console.error("❌ UPDATE SERVICE BOOKING SCHEDULE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update booking schedule"
    });
  }
});

// ============================================
// 13. UPDATE NOTES
// ============================================
router.put("/update-notes/:id", async (req, res) => {
  try {
    const { notes } = req.body;
    const booking = await ServiceBooking.findByIdAndUpdate(
      req.params.id,
      { notes, updatedAt: new Date() },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    res.json({ success: true, booking, message: "Notes updated successfully" });
  } catch (error) {
    console.error("Error updating notes:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 14. GET BOOKING STATISTICS (Admin)
// ============================================
router.get("/admin/stats", async (req, res) => {
  try {
    const total = await ServiceBooking.countDocuments();
    const confirmed = await ServiceBooking.countDocuments({ status: "confirmed" });
    const pending = await ServiceBooking.countDocuments({ status: "pending" });
    const cancelled = await ServiceBooking.countDocuments({ status: "cancelled" });
    const completed = await ServiceBooking.countDocuments({ status: "completed" });
    
    // Stats by service type
    const palmistryBookings = await ServiceBooking.countDocuments({ serviceTitleKey: "palmistry" });
    const vastuBookings = await ServiceBooking.countDocuments({ serviceTitleKey: "vastu" });
    const numerologyBookings = await ServiceBooking.countDocuments({ serviceTitleKey: "numerology" });
    const yogaBookings = await ServiceBooking.countDocuments({ serviceTitleKey: "yoga" });
    
    // Stats by class status
    const upcoming = await ServiceBooking.countDocuments({ classStatus: "upcoming" });
    const ongoing = await ServiceBooking.countDocuments({ classStatus: "ongoing" });
    const classCompleted = await ServiceBooking.countDocuments({ classStatus: "completed" });
    const scheduled = await ServiceBooking.countDocuments({ classStatus: "scheduled" });
    
    // Total revenue
    const allBookings = await ServiceBooking.find({ status: { $in: ["confirmed", "completed"] } });
    const totalRevenue = allBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
    
    res.json({
      success: true,
      stats: {
        total,
        confirmed,
        pending,
        cancelled,
        completed,
        byServiceType: {
          palmistry: palmistryBookings,
          vastu: vastuBookings,
          numerology: numerologyBookings,
          yoga: yogaBookings
        },
        byClassStatus: {
          upcoming,
          ongoing,
          completed: classCompleted,
          scheduled
        },
        totalRevenue,
        averageOrderValue: total > 0 ? totalRevenue / total : 0
      }
    });
  } catch (error) {
    console.error("Error fetching booking stats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;