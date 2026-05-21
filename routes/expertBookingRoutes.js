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

// Create booking
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
      status: "pending"
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
// GET ALL EXPERT BOOKINGS (for admin)
router.get("/all", async (req, res) => {
  try {
    const bookings = await ExpertBooking.find().sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching expert bookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user bookings
router.get("/user/:userId", async (req, res) => {
  try {
    const bookings = await ExpertBooking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE SESSION REQUEST STATUS
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await ExpertBooking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    res.json({ success: true, booking, message: `Status updated to ${status}` });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;