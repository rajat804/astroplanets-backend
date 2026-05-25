const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const Service = require("../models/Service");
const Expert = require("../models/Expert");
const CoursePayment = require("../models/CoursePayment");
const ServiceBooking = require("../models/ServiceBooking");
const ExpertBooking = require("../models/ExpertBooking");
const User = require("../models/User");
const Product = require("../models/Product");

// GET Dashboard Overview Stats
router.get("/overview-stats", async (req, res) => {
  try {
    console.log("Fetching dashboard stats...");
    
    // Get all course payments (success wale)
    const coursePayments = await CoursePayment.find({ status: "success" });
    console.log("Course Payments found:", coursePayments.length);
    
    // Calculate course revenue
    let courseRevenue = 0;
    coursePayments.forEach(p => {
      courseRevenue += (p.amount || 0);
    });
    console.log("Course Revenue:", courseRevenue);
    
    // Get all service bookings (confirmed/success wale)
    const serviceBookings = await ServiceBooking.find({ 
      status: { $in: ["confirmed", "success"] } 
    });
    console.log("Service Bookings found:", serviceBookings.length);
    
    // Calculate service revenue
    let serviceRevenue = 0;
    serviceBookings.forEach(b => {
      serviceRevenue += (b.amount || 0);
    });
    console.log("Service Revenue:", serviceRevenue);
    
    // Total revenue
    const totalRevenue = courseRevenue + serviceRevenue;
    console.log("Total Revenue:", totalRevenue);
    
    // Get counts
    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalServices = await Service.countDocuments();
    const totalExperts = await Expert.countDocuments();
    const totalCourseEnrollments = coursePayments.length;
    const totalServiceBookings = serviceBookings.length;
    const totalBookings = totalCourseEnrollments + totalServiceBookings;
    
    // Get booking counts by status
    const pendingBookings = await ServiceBooking.countDocuments({ status: "pending" });
    const confirmedBookings = await ServiceBooking.countDocuments({ status: "confirmed" });
    const completedBookings = await ServiceBooking.countDocuments({ status: "completed" });
    const cancelledBookings = await ServiceBooking.countDocuments({ status: "cancelled" });
    
    // Get session requests
    const sessionRequests = await ExpertBooking.countDocuments();
    const pendingSessions = await ExpertBooking.countDocuments({ status: "pending" });
    const completedSessions = await ExpertBooking.countDocuments({ status: "completed" });
    
    // Get product stats
    const products = await Product.find();
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock < 10).length;
    const outOfStockProducts = products.filter(p => p.stock === 0).length;
    const totalProductSales = products.reduce((sum, p) => sum + (p.sold || 0), 0);
    
    // Get popular services
    const popularServices = await ServiceBooking.aggregate([
      { $match: { status: { $in: ["confirmed", "success"] } } },
      { $group: { _id: "$serviceTitle", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Get monthly revenue for chart
    const monthlyRevenue = await getMonthlyRevenue();
    
    const stats = {
      totalUsers,
      totalCourses,
      totalServices,
      totalExperts,
      courseRevenue,
      serviceRevenue,
      totalRevenue,
      totalBookings,
      totalCourseEnrollments,
      totalServiceBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      sessionRequests,
      pendingSessions,
      completedSessions,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalProductSales,
      popularServices,
      monthlyRevenue
    };
    
    console.log("Stats being sent:", stats);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Error fetching overview stats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to get monthly revenue
async function getMonthlyRevenue() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const monthlyData = [];
  
  for (let i = 0; i < 12; i++) {
    const startDate = new Date(currentYear, i, 1);
    const endDate = new Date(currentYear, i + 1, 0);
    
    // Course revenue for this month
    const courseRevenue = await CoursePayment.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          status: "success"
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    // Service revenue for this month
    const serviceRevenue = await ServiceBooking.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate }, 
          status: { $in: ["confirmed", "success"] } 
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    const total = (courseRevenue[0]?.total || 0) + (serviceRevenue[0]?.total || 0);
    monthlyData.push({
      month: months[i],
      revenue: total
    });
  }
  
  return monthlyData;
}

// GET Recent Activities
router.get("/recent-activities", async (req, res) => {
  try {
    // Get recent course enrollments
    const recentEnrollments = await CoursePayment.find({ status: "success" })
      .populate("courseId", "title")
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get recent service bookings
    const recentBookings = await ServiceBooking.find({ 
      status: { $in: ["confirmed", "success"] } 
    })
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get recent user registrations
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    const activities = [
      ...recentEnrollments.map(e => ({
        id: e._id,
        type: "enrollment",
        message: `${e.userName} enrolled in ${e.courseId?.title || "a course"}`,
        time: e.createdAt,
        amount: e.amount
      })),
      ...recentBookings.map(b => ({
        id: b._id,
        type: "booking",
        message: `${b.userName} booked ${b.serviceTitle}`,
        time: b.createdAt,
        amount: b.amount,
        status: b.status
      })),
      ...recentUsers.map(u => ({
        id: u._id,
        type: "user",
        message: `${u.fullName || u.name} registered as new user`,
        time: u.createdAt
      }))
    ];
    
    // Sort by time and get latest 10
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivities = activities.slice(0, 10);
    
    res.json({ success: true, activities: recentActivities });
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;