const express = require("express");
const router = express.Router();
const ExpertBooking = require("../models/ExpertBooking");
const Expert = require("../models/Expert");
const nodemailer = require("nodemailer");

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send email function
const sendBookingEmails = async (bookingData, expert) => {
  // Email to Admin
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: "contact.astroplanets@gmail.com",
    subject: `📅 New Expert Session Booking: ${expert.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">New Expert Session Booking!</h2>
        <h3>Expert: ${expert.name}</h3>
        <p><strong>Role:</strong> ${expert.role}</p>
        <hr/>
        <h3>Customer Details:</h3>
        <p><strong>Name:</strong> ${bookingData.userName}</p>
        <p><strong>Email:</strong> ${bookingData.userEmail}</p>
        <p><strong>Phone:</strong> ${bookingData.userPhone}</p>
        <hr/>
        <h3>Booking Details:</h3>
        <p><strong>Preferred Date:</strong> ${bookingData.preferredDate}</p>
        <p><strong>Preferred Time:</strong> ${bookingData.preferredTime}</p>
        <p><strong>Message:</strong> ${bookingData.message || "No message"}</p>
      </div>
    `
  };

  // Email to Customer
  const customerMailOptions = {
    from: process.env.EMAIL_USER,
    to: bookingData.userEmail,
    subject: `✨ Booking Confirmation: Session with ${expert.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Booking Confirmed! ✨</h2>
        <p>Dear ${bookingData.userName},</p>
        <p>Your session with <strong>${expert.name}</strong> has been booked successfully.</p>
        <p><strong>📅 Date:</strong> ${bookingData.preferredDate}</p>
        <p><strong>⏰ Time:</strong> ${bookingData.preferredTime}</p>
        <p>We will contact you shortly with meeting details.</p>
        <br/>
        <p>Warm regards,<br/>Astrology Platform Team</p>
      </div>
    `
  };

  await transporter.sendMail(adminMailOptions);
  await transporter.sendMail(customerMailOptions);
};

// ============================================
// 1. CREATE BOOKING
// ============================================
router.post("/create", async (req, res) => {
  try {
    const {
      expertId,
      expertName,
      userId,
      userName,
      userEmail,
      userPhone,
      preferredDate,
      preferredTime,
      message
    } = req.body;

    const expert = await Expert.findById(expertId);
    if (!expert) {
      return res.status(404).json({ success: false, message: "Expert not found" });
    }

    // ✅ Create with both status and classStatus
    const booking = new ExpertBooking({
      expertId,
      expertName,
      userId,
      userName,
      userEmail,
      userPhone,
      preferredDate,
      preferredTime,
      message,
      status: "pending",           // ✅ Payment status
      classStatus: "scheduled"     // ✅ Class status - NEW
    });

    await booking.save();
    await sendBookingEmails({
      userName,
      userEmail,
      userPhone,
      preferredDate,
      preferredTime,
      message
    }, expert);

    res.json({ success: true, booking, message: "Booking created successfully" });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 2. GET ALL EXPERT BOOKINGS (Admin)
// ============================================
router.get("/all", async (req, res) => {
  try {
    const bookings = await ExpertBooking.find().sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching expert bookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 3. GET USER BOOKINGS
// ============================================
router.get("/user/:userId", async (req, res) => {
  try {
    const bookings = await ExpertBooking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 4. UPDATE PAYMENT STATUS (Admin)
// ============================================
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    
    // ✅ Validate payment status
    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed: pending, confirmed, cancelled, completed"
      });
    }

    // ✅ Check if transition is valid
    const booking = await ExpertBooking.findById(req.params.id);
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

    const updatedBooking = await ExpertBooking.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    res.json({ success: true, booking: updatedBooking, message: `Status updated to ${status}` });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 5. UPDATE CLASS STATUS (Admin) - NEW
// ============================================
router.put("/:id/class-status", async (req, res) => {
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

    const booking = await ExpertBooking.findByIdAndUpdate(
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
// 6. UPDATE SCHEDULE (Admin) - NEW
// ============================================
router.put("/admin/update-schedule/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { meetLink, preferredDate, preferredTime, classStatus } = req.body;

    console.log(`🔄 Updating expert booking schedule for ${id}:`, { meetLink, preferredDate, preferredTime, classStatus });

    const updateData = {};
    if (meetLink !== undefined) updateData.meetLink = meetLink;
    if (preferredDate) updateData.preferredDate = preferredDate;
    if (preferredTime) updateData.preferredTime = preferredTime;
    if (classStatus) updateData.classStatus = classStatus;
    updateData.updatedAt = new Date();

    const booking = await ExpertBooking.findByIdAndUpdate(
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

    console.log(`✅ Expert booking schedule updated successfully:`, booking);

    res.status(200).json({
      success: true,
      message: "Booking schedule updated successfully",
      booking
    });
  } catch (error) {
    console.error("❌ UPDATE EXPERT BOOKING SCHEDULE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update booking schedule"
    });
  }
});

// ============================================
// 7. DELETE BOOKING (Admin)
// ============================================
router.delete("/:id", async (req, res) => {
  try {
    const booking = await ExpertBooking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;