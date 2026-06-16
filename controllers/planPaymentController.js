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

// ============================================
// 1. CREATE ORDER
// ============================================
const createOrder = async (req, res) => {
    try {
        const { planId, userName, userEmail, userPhone } = req.body;

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

        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found",
            });
        }

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

        // ✅ CREATE with both status and classStatus
        const subscription = await PlanSubscription.create({
            userId: req.user._id,
            userName: userName || user.name || user.fullName || "User",
            userEmail: userEmail || user.email,
            userPhone: userPhone || user.phone || "",
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
            status: "pending",              // ✅ Payment status
            classStatus: "scheduled",       // ✅ Class status - NEW
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

// ============================================
// 2. VERIFY PAYMENT
// ============================================
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
            userPhone,
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

        if (userPhone && !subscription.userPhone) {
            subscription.userPhone = userPhone;
        }

        if (preferredDate) {
            subscription.preferredDate = new Date(preferredDate);
        }
        if (preferredTime) {
            subscription.preferredTime = preferredTime;
        }
        if (message) {
            subscription.message = message;
        }

        // ✅ Update payment status only (classStatus remains "scheduled")
        subscription.status = "active";
        subscription.razorpayPaymentId = razorpay_payment_id;
        subscription.razorpaySignature = razorpay_signature;
        await subscription.save();

        const user = await User.findById(subscription.userId);
        const plan = await Plan.findById(subscription.planId);

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
                userPhone: subscription.userPhone,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                status: subscription.status,          // ✅ Payment status
                classStatus: subscription.classStatus, // ✅ Class status
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

// ============================================
// 3. GET USER SUBSCRIPTIONS
// ============================================
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

// ============================================
// 4. GET ALL SUBSCRIPTIONS (Admin)
// ============================================
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

// ============================================
// 5. UPDATE MEET LINK
// ============================================
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

// ============================================
// 6. UPDATE SUBSCRIPTION DETAILS (Admin)
// ============================================
const updateSubscriptionDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { userName, userEmail, userPhone, preferredDate, preferredTime, meetLink, status, classStatus } = req.body;

        const updateData = {};
        if (userName !== undefined) updateData.userName = userName;
        if (userEmail !== undefined) updateData.userEmail = userEmail;
        if (userPhone !== undefined) updateData.userPhone = userPhone;
        if (preferredDate) updateData.preferredDate = new Date(preferredDate);
        if (preferredTime) updateData.preferredTime = preferredTime;
        if (meetLink !== undefined) updateData.meetLink = meetLink;
        if (status) updateData.status = status;           // ✅ Payment status
        if (classStatus) updateData.classStatus = classStatus; // ✅ Class status
        updateData.updatedAt = new Date();

        const subscription = await PlanSubscription.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
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

// ============================================
// 7. UPDATE PLAN SCHEDULE (Admin) - UPDATED
// ============================================
const updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { meetLink, preferredDate, preferredTime, classStatus } = req.body; // ✅ Removed 'status'

        console.log(`🔄 Updating plan schedule for ${id}:`, { meetLink, preferredDate, preferredTime, classStatus });

        const updateData = {};
        if (meetLink !== undefined) updateData.meetLink = meetLink;
        if (preferredDate) updateData.preferredDate = new Date(preferredDate);
        if (preferredTime) updateData.preferredTime = preferredTime;
        if (classStatus) updateData.classStatus = classStatus; // ✅ Only class status
        updateData.updatedAt = new Date();

        const subscription = await PlanSubscription.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found",
            });
        }

        console.log(`✅ Plan schedule updated successfully:`, subscription);

        res.status(200).json({
            success: true,
            message: "Plan schedule updated successfully",
            subscription,
        });
    } catch (error) {
        console.log("❌ UPDATE PLAN SCHEDULE ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update plan schedule",
        });
    }
};

// ============================================
// 8. UPDATE PLAN CLASS STATUS (Admin) - NEW
// ============================================
const updateClassStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { classStatus } = req.body;

        if (!classStatus) {
            return res.status(400).json({
                success: false,
                message: "Class status is required",
            });
        }

        const validClassStatuses = ["upcoming", "ongoing", "completed", "cancelled", "scheduled"];
        if (!validClassStatuses.includes(classStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid class status. Allowed: upcoming, ongoing, completed, cancelled, scheduled",
            });
        }

        const subscription = await PlanSubscription.findByIdAndUpdate(
            id,
            { 
                classStatus,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found",
            });
        }

        res.status(200).json({
            success: true,
            message: `Class status updated to ${classStatus} successfully`,
            subscription,
        });
    } catch (error) {
        console.log("UPDATE CLASS STATUS ERROR =>", error);
        res.status(500).json({
            success: false,
            message: "Failed to update class status",
        });
    }
};

// ============================================
// 9. UPDATE PLAN PAYMENT STATUS (Admin)
// ============================================
const updatePlanStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required",
            });
        }

        const validStatuses = ["pending", "active", "expired", "cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Allowed: pending, active, expired, cancelled",
            });
        }

        // ✅ Check if transition is valid
        const subscription = await PlanSubscription.findById(id);
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found",
            });
        }

        const currentStatus = subscription.status;
        
        // ✅ Valid transitions for payment status
        const validTransitions = {
            'pending': ['active', 'cancelled'],
            'active': ['expired', 'cancelled'],
            'expired': [],      // ❌ Cannot change
            'cancelled': []     // ❌ Cannot change
        };

        if (!validTransitions[currentStatus]?.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change payment status from "${currentStatus}" to "${status}"`,
                allowedTransitions: validTransitions[currentStatus] || []
            });
        }

        const updated = await PlanSubscription.findByIdAndUpdate(
            id,
            { 
                status, 
                updatedAt: new Date(),
                ...(status === 'cancelled' ? { cancelledAt: new Date() } : {})
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: `Plan payment status updated to ${status} successfully`,
            subscription: updated,
        });
    } catch (error) {
        console.log("UPDATE PLAN STATUS ERROR =>", error);
        res.status(500).json({
            success: false,
            message: "Failed to update plan status",
        });
    }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================
module.exports = {
    createOrder,
    verifyPayment,
    getUserSubscriptions,
    getAllSubscriptions,
    updateMeetLink,
    updateSubscriptionDetails,
    updateSchedule,
    updateClassStatus,  // ✅ NEW
    updatePlanStatus,
};