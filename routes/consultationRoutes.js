const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

router.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      preferredDate,
      preferredTime,
      message,
      consultationType,
    } = req.body;

    // Validation
    if (
      !name ||
      !email ||
      !phone ||
      !preferredDate ||
      !preferredTime
    ) {
      return res.status(400).json({
        success: false,
        msg: "All required fields are mandatory",
      });
    }

    // Transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email Template
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "contact.astroplanets@gmail.com",
      subject: "🔮 New Consultation Booking Request",
      html: `
        <div style="font-family: Arial, sans-serif; padding:20px;">
          <h2 style="color:#7c3aed;">New Consultation Booking</h2>

          <table style="width:100%; border-collapse: collapse;">
            <tr>
              <td style="padding:10px; border:1px solid #ddd;"><strong>Name</strong></td>
              <td style="padding:10px; border:1px solid #ddd;">${name}</td>
            </tr>

            <tr>
              <td style="padding:10px; border:1px solid #ddd;"><strong>Email</strong></td>
              <td style="padding:10px; border:1px solid #ddd;">${email}</td>
            </tr>

            <tr>
              <td style="padding:10px; border:1px solid #ddd;"><strong>Phone</strong></td>
              <td style="padding:10px; border:1px solid #ddd;">${phone}</td>
            </tr>

            <tr>
              <td style="padding:10px; border:1px solid #ddd;"><strong>Consultation Type</strong></td>
              <td style="padding:10px; border:1px solid #ddd;">${consultationType}</td>
            </tr>

            <tr>
              <td style="padding:10px; border:1px solid #ddd;"><strong>Preferred Date</strong></td>
              <td style="padding:10px; border:1px solid #ddd;">${preferredDate}</td>
            </tr>

            <tr>
              <td style="padding:10px; border:1px solid #ddd;"><strong>Preferred Time</strong></td>
              <td style="padding:10px; border:1px solid #ddd;">${preferredTime}</td>
            </tr>

            <tr>
              <td style="padding:10px; border:1px solid #ddd;"><strong>Message</strong></td>
              <td style="padding:10px; border:1px solid #ddd;">
                ${message || "No message provided"}
              </td>
            </tr>
          </table>

          <br/>

          <p style="color:#666;">
            This booking request was submitted from AstroPlanets website.
          </p>
        </div>
      `,
    };

    // Send Mail
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      msg: "Consultation request submitted successfully",
    });

  } catch (error) {
    console.log("CONSULTATION ERROR:", error);

    res.status(500).json({
      success: false,
      msg: "Server Error",
      error: error.message,
    });
  }
});

module.exports = router;