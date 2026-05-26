// controllers/planPaymentController.js
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const PlanSubscription = require("../models/PlanSubscription");
const User = require("../models/User");
const { sendPlanPurchaseEmail } = require("../services/planEmailService");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// CREATE ORDER
// controllers/planPaymentController.js - createOrder function

const createOrder = async (req, res) => {
    try {
        const { planId, userName, userEmail, userPhone } = req.body;  // ✅ Phone number receive karein

        if (!planId) {
            return res.status(400).json({
                success: false,
                message: "Plan ID required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(planId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Plan ID",
            });
        }

        // Get plan details
        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found",
            });
        }

        // Get user details from database
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const amount = Number(plan.sellingPrice || plan.price);

        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: `plan_${planId}_${Date.now()}`.substring(0, 40),
        };

        const order = await razorpay.orders.create(options);

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (plan.durationDays || 30));

        // ✅ Phone number ke saath subscription create karein
        const subscription = await PlanSubscription.create({
            userId: req.user._id,
            userName: userName || user.name || user.fullName || "User",
            userEmail: userEmail || user.email,
            userPhone: userPhone || user.phone || "",  // ✅ Phone number save hoga
            planId: plan._id,
            planName: plan.name,
            amount,
            mrpAmount: plan.mrpPrice,
            duration: plan.duration,
            durationDays: plan.durationDays || 30,
            features: plan.features,
            sessionsIncluded: plan.sessionsIncluded || 0,
            sessionsUsed: 0,
            startDate: new Date(),
            endDate,
            status: "pending",
            razorpayOrderId: order.id,
        });

        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            subscriptionId: subscription._id,
        });
    } catch (error) {
        console.log("CREATE ORDER ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create order",
        });
    }
};

// VERIFY PAYMENT
// controllers/planPaymentController.js - verifyPayment function

const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            subscriptionId,
            preferredDate,
            preferredTime,
            message,
            userPhone,  // ✅ Phone number receive karein
        } = req.body;

        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Invalid Signature",
            });
        }

        const subscription = await PlanSubscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found",
            });
        }

        // ✅ Phone number update karein agar nahi hai toh
        if (userPhone && !subscription.userPhone) {
            subscription.userPhone = userPhone;
        }

        // Update session details
        if (preferredDate) {
            subscription.preferredDate = new Date(preferredDate);
        }
        if (preferredTime) {
            subscription.preferredTime = preferredTime;
        }
        if (message) {
            subscription.message = message;
        }

        subscription.status = "active";
        subscription.razorpayPaymentId = razorpay_payment_id;
        subscription.razorpaySignature = razorpay_signature;
        await subscription.save();

        // Get user with complete details
        const user = await User.findById(subscription.userId);
        const plan = await Plan.findById(subscription.planId);

        // Send email to user and admin
        await sendPlanPurchaseEmail(user, subscription, plan);

        res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            subscription: {
                id: subscription._id,
                planName: subscription.planName,
                amount: subscription.amount,
                userName: subscription.userName,
                userEmail: subscription.userEmail,
                userPhone: subscription.userPhone,  // ✅ Phone number response mein
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                status: subscription.status,
            },
        });
    } catch (error) {
        console.log("VERIFY PAYMENT ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Verification failed",
        });
    }
};

// GET USER SUBSCRIPTIONS
const getUserSubscriptions = async (req, res) => {
    try {
        const subscriptions = await PlanSubscription.find({
            userId: req.user._id,
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            subscriptions,
        });
    } catch (error) {
        console.log("GET SUBSCRIPTIONS ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch subscriptions",
        });
    }
};

// controllers/planPaymentController.js

// GET ALL SUBSCRIPTIONS (PUBLIC - For Admin Panel)
const getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await PlanSubscription.find()
            .sort({ createdAt: -1 });

        console.log(`Found ${subscriptions.length} subscriptions`);

        res.status(200).json({
            success: true,
            count: subscriptions.length,
            subscriptions,
        });
    } catch (error) {
        console.log("GET ALL SUBSCRIPTIONS ERROR =>", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch subscriptions",
        });
    }
};

// UPDATE MEET LINK
const updateMeetLink = async (req, res) => {
    try {
        const { meetLink } = req.body;

        const subscription = await PlanSubscription.findByIdAndUpdate(
            req.params.id,
            { meetLink },
            { new: true }
        );

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Meeting link updated successfully",
            subscription,
        });
    } catch (error) {
        console.log("UPDATE MEET LINK ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update meeting link",
        });
    }
};

// UPDATE SUBSCRIPTION DETAILS (for admin to add name/email if missing)
const updateSubscriptionDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { userName, userEmail, userPhone } = req.body;

        const subscription = await PlanSubscription.findByIdAndUpdate(
            id,
            { userName, userEmail, userPhone },
            { new: true }
        );

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Subscription details updated successfully",
            subscription,
        });
    } catch (error) {
        console.log("UPDATE SUBSCRIPTION DETAILS ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update subscription details",
        });
    }
};

module.exports = {
    createOrder,
    verifyPayment,
    getUserSubscriptions,
    getAllSubscriptions,
    updateMeetLink,
    updateSubscriptionDetails,
};