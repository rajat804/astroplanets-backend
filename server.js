const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
const connectDB = require("./config/db");
const dns = require('dns');
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const { initializeDefaultAdmin } = require("./controllers/adminController");
dotenv.config();

const app = express();

/* ================================
   CORS CONFIG
================================ */
const allowedOrigins = [
  "https://ashtro-seven.vercel.app",
  "https://astroplanets.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://astroplanets.co.in",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    credentials: true,
  })
);

// Preflight
app.options("*", cors());

/* ================================
   BODY PARSER
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ================================
// PROKERALA TOKEN
// ================================

const getToken = async () => {

  try {

    const response = await axios.post(
      "https://api.prokerala.com/token",

      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
      }),

      {
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;

  } catch (error) {

    console.log(
      error.response?.data || error.message
    );
  }
};

/* ================================
   🔥 DB CONNECTION MIDDLEWARE (FIX)
================================ */
let isAdminInitialized = false;

app.use(async (req, res, next) => {
  try {
    await connectDB(); // ensure DB is connected

    // Run admin init only once
    if (!isAdminInitialized) {
      await initializeDefaultAdmin();
      isAdminInitialized = true;
      console.log("✅ Admin initialized");
    }

    next();
  } catch (error) {
    console.error("❌ DB connection failed:", error.message);
    return res.status(500).json({
      msg: "Database connection failed",
      error: error.message,
    });
  }
});

/* ================================
   HEALTH CHECK
================================ */
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "API is running",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

/* ================================
   TEST CORS
================================ */
app.get("/api/test-cors", (req, res) => {
  res.json({
    message: "CORS is working!",
    origin: req.headers.origin || null,
  });
});

/* ================================
   ROUTES
================================ */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
// Add this after other routes
app.use('/api/products', require('./routes/productRoutes'));
// Add this with other routes
app.use('/api/upload', require('./routes/uploadRoutes'));
// Add these with other routes
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
// Add with other routes
app.use('/api/blogs', require('./routes/blogRoutes'));
// Add with other routes
app.use('/api/coupons', require('./routes/couponRoutes'));
// send mail msg 
app.use("/api/consultation", require('./routes/consultationRoutes'));
// hero slide image 
app.use('/api/hero-slides', require('./routes/heroSlideRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/coursepayment', require('./routes/coursepaymentRoutes'));
app.use('/api/services', require('./routes/serviceRouter'));
app.use("/api/servicebookings", require('./routes/serviceBookingRoutes'));
app.use("/api/experts",require('./routes/expertRoutes'));
app.use("/api/expert-bookings", require('./routes/expertBookingRoutes'));
app.use("/api/admindashboard", require('./routes/adminDashboardRoutes'));
app.use("/api/plans", require('./routes/planRoutes'));
app.use("/api/planpayments", require('./routes/planPaymentRoutes'));
app.use("/api/astrology", require('./routes/astrologyRoutes'));
app.use("/api/kundlipayments", require('./routes/kundliPaymentRoutes'));
app.use("/api/social-content", require('./routes/socialContentRoutes'));
app.use('/api/classes', require('./routes/classesRoutes'));
app.use('/api/rashifal', require('./routes/rashiFalRoutes'));




/* ================================
   ROOT
================================ */
/* ================================
   PROKERALA CALENDAR API
================================ */

app.get("/api/calendar", async (req, res) => {

  try {

    // Query se date lo
    let { date } = req.query;

    // Agar date nahi aayi toh today's date use karo
    if (!date) {

      const today = new Date();

      // YYYY-MM-DD format
      date = today.toISOString().split("T")[0];
    }

    const token = await getToken();

    const response = await axios.get(
      "https://api.prokerala.com/v2/astrology/panchang",

      {
        params: {
          datetime: `${date}T12:00:00+05:30`,
          coordinates: "28.6139,77.2090",
          ayanamsa: 1
        },

        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    res.json(response.data);

  } catch (error) {

    console.log(
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "Calendar API failed",
    });
  }
});
app.get("/", (req, res) => {
  res.json({
    message: "AstroPlanets Auth API is running",
    version: "1.0.0",
    mongodb:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

/* ================================
   404
================================ */
app.use((req, res) => {
  res.status(404).json({ msg: "Route not found" });
});

/* ================================
   ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      msg: "CORS error: Origin not allowed",
    });
  }

  res.status(err.status || 500).json({
    msg: err.message || "Something went wrong!",
  });
});

/* ================================
   EXPORT FOR VERCEL
================================ */
module.exports = app;

/* ================================
   LOCAL SERVER
================================ */
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
  });
}